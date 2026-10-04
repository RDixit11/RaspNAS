import mimetypes

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

from app.cluster import free_space, node_capacity
from app.deps import get_current_user, get_storage, get_store, require_share
from app.events import log_event
from app.models import EntryMove, FolderCreate, User
from app.storage import PoolStorage, format_bytes, join_path, split_path, validate_name
from app.store import Store

router = APIRouter(prefix="/shares/{share_id}", tags=["pliki"])

# Pliki od użytkowników otwierane bezpośrednio w przeglądarce nie mogą uruchamiać skryptów (np. w SVG/HTML)
SAFE_FILE_HEADERS = {
    "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    "X-Content-Type-Options": "nosniff",
}


@router.get("/files")
def list_files(share_id: str, path: str = "/", user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    share = require_share(db, user, share_id)
    parts = split_path(path)
    return {"path": join_path(parts), "entries": storage.list_dir(share, db.nodes, parts)}


@router.post("/files", status_code=201)
def upload_files(
    share_id: str,
    request: Request,
    files: list[UploadFile],
    path: str = "/",
    user: User = Depends(get_current_user),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
):
    db = store.read()
    share = require_share(db, user, share_id, need="write")
    parts = split_path(path)
    if not storage.is_dir(share, db.nodes, parts):
        raise HTTPException(404, "Nie ma takiego folderu.")
    candidates = [n for n in db.nodes if n.online and node_capacity(n)]
    if not candidates:
        raise HTTPException(503, "Żaden węzeł z dyskami nie odpowiada.")

    saved = []
    for upload in files:
        name = storage.unique_name(share, db.nodes, parts, validate_name(upload.filename or "plik"))
        size = upload.size or 0
        node = max(candidates, key=lambda n: free_space(n, storage))
        if free_space(node, storage) < size:
            raise HTTPException(507, f"Plik „{name}” ({format_bytes(size)}) się nie zmieści — "
                                     f"najwięcej wolnego miejsca ma {node.name}: {format_bytes(max(free_space(node, storage), 0))}.")
        storage.save_file(node, share, parts, name, upload.file)
        saved.append({"name": name, "nodeId": node.id})

    with store.transaction() as draft:
        where = f"{share.name}{join_path(parts) if parts else ''}"
        what = f"plik {saved[0]['name']}" if len(saved) == 1 else f"{len(saved)} pliki"
        log_event(draft, "files", f"Wysłano {what} do {where}.", user=user, request=request)
    return saved


@router.post("/folders", status_code=201)
def create_folder(share_id: str, body: FolderCreate, request: Request, user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    share = require_share(db, user, share_id, need="write")
    parts = split_path(body.path)
    if not storage.is_dir(share, db.nodes, parts):
        raise HTTPException(404, "Nie ma takiego folderu.")
    name = validate_name(body.name)
    storage.make_dir(share, db.nodes, parts, name)
    with store.transaction() as draft:
        log_event(draft, "files", f"Utworzono folder {share.name}{join_path([*parts, name])}.", user=user, request=request)
    return {"name": name}


@router.get("/folders")
def list_folders(share_id: str, user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    share = require_share(db, user, share_id)
    return storage.list_folders(share, db.nodes)


@router.post("/files/move")
def move_entry(share_id: str, body: EntryMove, request: Request, user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    share = require_share(db, user, share_id, need="write")
    parts, destination = split_path(body.path), split_path(body.destination)
    moved = storage.move(share, db.nodes, parts, destination, {n.id for n in db.nodes if n.online})
    with store.transaction() as draft:
        target = f"{share.name}{join_path(destination) if destination else ''}"
        log_event(draft, "files", f"Przeniesiono {share.name}{join_path(parts)} do {target}.", user=user, request=request)
    return {"path": join_path(moved)}


@router.get("/files/content")
def file_content(share_id: str, path: str, download: bool = Query(False), user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    share = require_share(db, user, share_id)
    parts = split_path(path)
    found = storage.find_file(share, db.nodes, parts) if parts else None
    if found is None:
        raise HTTPException(404, "Nie ma takiego pliku.")
    node, file_path = found
    if not node.online:
        raise HTTPException(503, f"Plik leży na niedostępnym węźle {node.name}.")

    media_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    if media_type.startswith("text/"):
        media_type += "; charset=utf-8"
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=file_path.name,
        content_disposition_type="attachment" if download else "inline",
        headers=SAFE_FILE_HEADERS,
    )


@router.delete("/files", status_code=204)
def delete_entry(share_id: str, path: str, request: Request, user: User = Depends(get_current_user), store: Store = Depends(get_store), storage: PoolStorage = Depends(get_storage)):
    db = store.read()
    share = require_share(db, user, share_id, need="write")
    parts = split_path(path)
    storage.delete(share, db.nodes, parts, {n.id for n in db.nodes if n.online})
    with store.transaction() as draft:
        log_event(draft, "files", f"Usunięto {share.name}{join_path(parts)}.", user=user, request=request)
