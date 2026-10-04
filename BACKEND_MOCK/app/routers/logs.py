from fastapi import APIRouter, Depends, Query

from app.deps import get_store, require_admin
from app.models import User
from app.store import Store

router = APIRouter(prefix="/logs", tags=["dziennik"])


@router.get("")
def list_logs(
    level: str | None = None,
    category: str | None = None,
    q: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100, alias="pageSize"),
    _: User = Depends(require_admin),
    store: Store = Depends(get_store),
):
    """Najnowsze na górze. Szukanie obejmuje treść, użytkownika i adres IP."""
    needle = q.strip().lower()
    events = [
        e
        for e in reversed(store.read().logs)
        if (not level or e.level == level)
        and (not category or e.category == category)
        and (not needle or needle in f"{e.message} {e.username or ''} {e.ip or ''}".lower())
    ]
    start = (page - 1) * page_size
    return {
        "items": [e.model_dump(by_alias=True) for e in events[start : start + page_size]],
        "total": len(events),
        "page": page,
        "pageSize": page_size,
    }
