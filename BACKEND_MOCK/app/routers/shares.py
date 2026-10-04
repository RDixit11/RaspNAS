from fastapi import APIRouter, Depends, HTTPException, Request

from app.cluster import coordinator
from app.deps import get_current_user, get_storage, get_store, require_admin, share_access
from app.events import log_event
from app.models import Database, Share, ShareCreate, ShareUpdate, User
from app.storage import PoolStorage, folder_name, validate_name
from app.store import Store

router = APIRouter(prefix="/shares", tags=["udziały"])

ACCESS_LABEL = {"read": "odczyt", "write": "zapis", None: "brak dostępu"}


def share_view(db: Database, share: Share, user: User, storage: PoolStorage) -> dict:
    ip = coordinator(db).ip
    item = {
        "id": share.id,
        "name": share.name,
        "description": share.description,
        "smb": share.smb,
        "nfs": share.nfs,
        "access": share_access(user, share),
        "usedBytes": storage.share_used(share, db.nodes),
        # ścieżki do podłączenia udziału w systemie (Eksplorator / Finder / mount)
        "smbPath": f"\\\\{ip}\\{share.name}" if share.smb else None,
        "nfsPath": f"{ip}:/srv/nas/{share.name}" if share.nfs else None,
        "createdAt": share.created_at,
    }
    if user.role == "admin":
        item["permissions"] = share.permissions
    return item


def _share(db: Database, share_id: str) -> Share:
    share = next((s for s in db.shares if s.id == share_id), None)
    if share is None:
        raise HTTPException(404, "Nie znaleziono udziału.")
    return share


def _check_name(db: Database, name: str, share_id: str | None = None) -> str:
    name = validate_name(name)
    if any(s.name.lower() == name.lower() and s.id != share_id for s in db.shares):
        raise HTTPException(409, f"Udział „{name}” już istnieje.")
    return name


@router.get("")
def list_shares(user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    return [share_view(db, s, user, storage) for s in db.shares if share_access(user, s)]


@router.post("", status_code=201)
def create_share(
    body: ShareCreate,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
):
    with store.transaction() as db:
        share = Share(name=_check_name(db, body.name), description=body.description.strip(), smb=body.smb, nfs=body.nfs)
        share.folder = folder_name(share.name, share.id)
        storage.init_share(share, db.nodes)
        db.shares.append(share)
        log_event(db, "shares", f"Utworzono udział {share.name}.", user=user, request=request)
    return share_view(db, share, user, storage)


@router.patch("/{share_id}")
def update_share(
    share_id: str,
    body: ShareUpdate,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
):
    with store.transaction() as db:
        share = _share(db, share_id)
        if body.name is not None and body.name.strip() != share.name:
            name = _check_name(db, body.name, share_id)
            log_event(db, "shares", f"Zmieniono nazwę udziału {share.name} na {name}.", user=user, request=request)
            share.name = name  # folder na dyskach zostaje — zawiera id, więc nadal pasuje
        if body.description is not None:
            share.description = body.description.strip()
        for protocol in ("smb", "nfs"):
            value = getattr(body, protocol)
            if value is not None and value != getattr(share, protocol):
                setattr(share, protocol, value)
                state = "Włączono" if value else "Wyłączono"
                log_event(db, "shares", f"{state} {protocol.upper()} dla udziału {share.name}.", user=user, request=request)
        if body.permissions is not None:
            users = {u.id: u for u in db.users}
            if any(uid not in users for uid in body.permissions):
                raise HTTPException(400, "Nie ma takiego użytkownika.")
            # administratorzy mają pełny dostęp i tak — zapisujemy uprawnienia tylko zwykłych kont
            permissions = {uid: access for uid, access in body.permissions.items() if users[uid].role == "user"}
            for uid in set(permissions) | set(share.permissions):
                before, after = share.permissions.get(uid), permissions.get(uid)
                if before != after:
                    log_event(db, "shares", f"Uprawnienia {users[uid].username} do udziału {share.name}: "
                              f"{ACCESS_LABEL[before]} → {ACCESS_LABEL[after]}.", user=user, request=request)
            share.permissions = permissions
    return share_view(db, share, user, storage)


@router.delete("/{share_id}", status_code=204)
def delete_share(
    share_id: str,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
):
    with store.transaction() as db:
        share = _share(db, share_id)
        db.shares.remove(share)
        for job in db.backups:
            job.share_ids = [sid for sid in job.share_ids if sid != share_id]
        storage.remove_share(share, db.nodes)
        log_event(db, "shares", f"Usunięto udział {share.name} razem z plikami.", level="warning", user=user, request=request)
