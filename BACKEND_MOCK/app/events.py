"""Dziennik zdarzeń — każda ważna akcja (logowanie, pliki, węzły, uprawnienia) zostawia wpis."""

from fastapi import Request

from app.models import Category, Database, Level, LogEvent, User

MAX_EVENTS = 5000  # starsze wpisy są usuwane, żeby dziennik nie rósł bez końca


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    address = (
        request.headers.get("x-real-ip")
        or (forwarded.split(",")[0].strip() if forwarded else None)
        or (request.client.host if request.client else None)
    )
    # ::ffff:192.168.1.5 (IPv4 zapisany jako IPv6, tak podaje m.in. proxy Vite) → 192.168.1.5
    return address.removeprefix("::ffff:") if address else None


def log_event(
    db: Database,
    category: Category,
    message: str,
    *,
    level: Level = "info",
    user: User | str | None = None,
    request: Request | None = None,
) -> None:
    username = user.username if isinstance(user, User) else user
    db.logs.append(LogEvent(category=category, level=level, message=message, username=username, ip=client_ip(request)))
    if len(db.logs) > MAX_EVENTS:
        del db.logs[: len(db.logs) - MAX_EVENTS]
