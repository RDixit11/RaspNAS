import re

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import find_user, hash_password
from app.deps import get_store, require_admin
from app.events import log_event
from app.models import Database, User, UserCreate, UserUpdate
from app.routers.account import check_new_password
from app.store import Store

router = APIRouter(prefix="/users", tags=["użytkownicy"])

USERNAME_RE = re.compile(r"^[\w.-]{3,32}$")
ROLE_LABEL = {"admin": "administrator", "user": "użytkownik"}


def user_view(db: Database, user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "active": user.active,
        "createdAt": user.created_at,
        "lastLoginAt": user.last_login_at,
        # do ilu udziałów ma dostęp (administrator — do wszystkich)
        "shares": len(db.shares) if user.role == "admin" else sum(1 for s in db.shares if user.id in s.permissions),
    }


def _user(db: Database, user_id: str) -> User:
    user = next((u for u in db.users if u.id == user_id), None)
    if user is None:
        raise HTTPException(404, "Nie znaleziono użytkownika.")
    return user


def _active_admins(db: Database) -> list[User]:
    return [u for u in db.users if u.role == "admin" and u.active]


@router.get("")
def list_users(_: User = Depends(require_admin), store: Store = Depends(get_store)):
    db = store.read()
    return [user_view(db, u) for u in sorted(db.users, key=lambda u: (u.role != "admin", u.username.lower()))]


@router.post("", status_code=201)
def create_user(body: UserCreate, request: Request, admin: User = Depends(require_admin), store: Store = Depends(get_store)):
    username = body.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(400, "Nazwa użytkownika: 3–32 znaki — litery, cyfry, kropka, myślnik lub podkreślnik.")
    check_new_password(body.password)
    with store.transaction() as db:
        if find_user(db, username):
            raise HTTPException(409, f"Nazwa „{username}” jest już zajęta.")
        user = User(username=username, password_hash=hash_password(body.password), role=body.role)
        db.users.append(user)
        log_event(db, "users", f"Utworzono konto {username} ({ROLE_LABEL[body.role]}).", user=admin, request=request)
    return user_view(db, user)


@router.patch("/{user_id}")
def update_user(user_id: str, body: UserUpdate, request: Request, admin: User = Depends(require_admin), store: Store = Depends(get_store)):
    with store.transaction() as db:
        user = _user(db, user_id)
        demoting = body.role == "user" and user.role == "admin"
        blocking = body.active is False and user.active
        if (demoting or blocking) and user.id == admin.id:
            raise HTTPException(400, "Nie możesz odebrać uprawnień ani zablokować samego siebie.")
        if (demoting or blocking) and user.role == "admin" and len(_active_admins(db)) <= 1:
            raise HTTPException(400, "W systemie musi zostać co najmniej jeden aktywny administrator.")

        if body.role is not None and body.role != user.role:
            user.role = body.role
            if body.role == "admin":
                for share in db.shares:  # administrator ma dostęp do wszystkiego — osobne uprawnienia są zbędne
                    share.permissions.pop(user.id, None)
            log_event(db, "users", f"Rola {user.username}: {ROLE_LABEL[body.role]}.", user=admin, request=request)
        if body.active is not None and body.active != user.active:
            user.active = body.active
            if not body.active:  # zablokowanie kończy wszystkie sesje tego konta
                db.sessions = {t: s for t, s in db.sessions.items() if s.user_id != user.id}
            state = "Odblokowano" if body.active else "Zablokowano"
            log_event(db, "users", f"{state} konto {user.username}.", level="info" if body.active else "warning", user=admin, request=request)
        if body.password:
            check_new_password(body.password)
            user.password_hash = hash_password(body.password)
            log_event(db, "users", f"Ustawiono nowe hasło dla {user.username}.", user=admin, request=request)
    return user_view(db, user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, request: Request, admin: User = Depends(require_admin), store: Store = Depends(get_store)):
    with store.transaction() as db:
        user = _user(db, user_id)
        if user.id == admin.id:
            raise HTTPException(400, "Nie możesz usunąć własnego konta.")
        if user.role == "admin" and user.active and len(_active_admins(db)) <= 1:
            raise HTTPException(400, "W systemie musi zostać co najmniej jeden aktywny administrator.")
        db.users.remove(user)
        db.sessions = {t: s for t, s in db.sessions.items() if s.user_id != user.id}
        for share in db.shares:
            share.permissions.pop(user.id, None)
        log_event(db, "users", f"Usunięto konto {user.username}.", level="warning", user=admin, request=request)
