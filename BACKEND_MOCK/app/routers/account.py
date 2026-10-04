from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import hash_password, verify_password
from app.deps import get_current_user, get_store
from app.events import log_event
from app.models import PasswordChange, User
from app.store import Store

router = APIRouter(prefix="/account", tags=["konto"])

MIN_PASSWORD = 6


def check_new_password(password: str) -> None:
    if len(password) < MIN_PASSWORD:
        raise HTTPException(400, f"Hasło musi mieć co najmniej {MIN_PASSWORD} znaków.")


def _me(db, user: User) -> User:
    return next(u for u in db.users if u.id == user.id)


@router.post("/password", status_code=204)
def change_password(body: PasswordChange, request: Request, user: User = Depends(get_current_user), store: Store = Depends(get_store)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Obecne hasło jest nieprawidłowe.")
    check_new_password(body.new_password)
    with store.transaction() as db:
        _me(db, user).password_hash = hash_password(body.new_password)
        log_event(db, "auth", "Zmieniono hasło.", user=user, request=request)

