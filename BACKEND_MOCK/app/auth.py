"""Hasła (PBKDF2) i sesja w ciasteczku HttpOnly."""

import hashlib
import hmac
import secrets

from fastapi import HTTPException, Request, Response

from app.models import Database, User

SESSION_COOKIE = "nas_session"
SESSION_MAX_AGE = 30 * 24 * 3600
_ITERATIONS = 100_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    salt, _, digest = stored.partition("$")
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS).hex()
    return hmac.compare_digest(candidate, digest)


def find_user(db: Database, username: str) -> User | None:
    return next((u for u in db.users if u.username.lower() == username.strip().lower()), None)


def user_from_request(request: Request, db: Database) -> User:
    session = db.sessions.get(request.cookies.get(SESSION_COOKIE) or "")
    user = next((u for u in db.users if session and u.id == session.user_id), None)
    if user is None or not user.active:
        raise HTTPException(401, "Zaloguj się ponownie.")
    return user


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(SESSION_COOKIE, token, max_age=SESSION_MAX_AGE, httponly=True, samesite="lax", path="/api")


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/api")

