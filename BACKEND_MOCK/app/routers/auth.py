import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.auth import SESSION_COOKIE, clear_session_cookie, find_user, set_session_cookie, verify_password
from app.deps import get_current_user, get_store
from app.events import log_event
from app.models import Credentials, PublicUser, Session, User, now_iso
from app.store import Store

router = APIRouter(prefix="/auth", tags=["logowanie"])


def public_user(user: User) -> PublicUser:
    return PublicUser(id=user.id, username=user.username, role=user.role)


@router.post("/login", response_model=PublicUser)
def login(body: Credentials, request: Request, response: Response, store: Store = Depends(get_store)):
    user = find_user(store.read(), body.username)
    if user is None or not verify_password(body.password, user.password_hash):
        with store.transaction() as db:
            reason = "złe hasło" if user else "nie ma takiego konta"
            log_event(db, "auth", f"Nieudane logowanie ({reason}).", level="warning", user=body.username.strip()[:32], request=request)
        raise HTTPException(401, "Nieprawidłowa nazwa użytkownika lub hasło.")
    if not user.active:
        with store.transaction() as db:
            log_event(db, "auth", "Próba logowania na zablokowane konto.", level="warning", user=user, request=request)
        raise HTTPException(403, "Konto jest zablokowane. Skontaktuj się z administratorem.")

    token = secrets.token_urlsafe(32)
    with store.transaction() as db:
        user = next(u for u in db.users if u.id == user.id)
        db.sessions[token] = Session(user_id=user.id)
        user.last_login_at = now_iso()
        log_event(db, "auth", "Zalogowano.", user=user, request=request)
    set_session_cookie(response, token)
    return public_user(user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, store: Store = Depends(get_store)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with store.transaction() as db:
            session = db.sessions.pop(token, None)
            user = next((u for u in db.users if session and u.id == session.user_id), None)
            if user:
                log_event(db, "auth", "Wylogowano.", user=user, request=request)
    clear_session_cookie(response)


@router.get("/me", response_model=PublicUser)
def me(user: User = Depends(get_current_user)):
    return public_user(user)
