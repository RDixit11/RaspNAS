from fastapi import Depends, HTTPException, Request

from app.auth import user_from_request
from app.cluster import refresh
from app.config import Settings
from app.models import Access, Database, Share, User
from app.storage import PoolStorage
from app.store import Store


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_store(request: Request) -> Store:
    return request.app.state.store


def get_storage(request: Request) -> PoolStorage:
    return request.app.state.storage


def get_current_user(request: Request, store: Store = Depends(get_store)) -> User:
    return user_from_request(request, store.read())


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Ta sekcja jest dostępna tylko dla administratora.")
    return user


def fresh_db(
    store: Store = Depends(get_store),
    settings: Settings = Depends(get_settings),
    storage: PoolStorage = Depends(get_storage),
) -> Database:
    """Baza z dokończonymi operacjami w tle (formatowanie dysków, kopie zapasowe)."""
    db = store.read()
    pending = any(d.state == "formatting" for n in db.nodes for d in n.disks) or any(j.running_since for j in db.backups)
    if pending:
        with store.transaction() as draft:
            refresh(draft, settings, storage)
        db = store.read()
    return db


def share_access(user: User, share: Share) -> Access | None:
    if user.role == "admin":
        return "write"
    return share.permissions.get(user.id)


def require_share(db: Database, user: User, share_id: str, need: Access = "read") -> Share:
    share = next((s for s in db.shares if s.id == share_id), None)
    access = share_access(user, share) if share else None
    if share is None or access is None:
        # bez uprawnień udział jest dla użytkownika niewidoczny
        raise HTTPException(404, "Nie znaleziono udziału.")
    if need == "write" and access != "write":
        raise HTTPException(403, "Masz tylko prawo odczytu tego udziału.")
    return share
