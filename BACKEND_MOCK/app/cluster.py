"""Stan klastra liczony na bieżąco: pojemność z dysków, metryki węzłów, alerty, postęp formatowania i kopii."""

import random
import time

from app.config import Settings
from app.models import Database, Node
from app.storage import PoolStorage, format_bytes, folder_name

USABLE_DISK_STATES = {"ok", "warning"}


def coordinator(db: Database) -> Node:
    return next(n for n in db.nodes if n.role == "coordinator")


def ordered_nodes(db: Database) -> list[Node]:
    # koordynator na początku, potem węzły w kolejności dołączenia
    return sorted(db.nodes, key=lambda n: (n.role != "coordinator", n.joined_at))


def node_capacity(node: Node) -> int:
    return sum(d.capacity_bytes for d in node.disks if d.state in USABLE_DISK_STATES)


def online_nodes(db: Database) -> list[Node]:
    return [n for n in db.nodes if n.online]


def free_space(node: Node, storage: PoolStorage) -> int:
    return node_capacity(node) - storage.node_used(node)


def init_node(node: Node, storage: PoolStorage, db: Database) -> None:
    node.folder = folder_name(node.name, node.id)
    for share in db.shares:
        storage.share_dir(node, share).mkdir(parents=True, exist_ok=True)


def _metrics(node: Node, now: float) -> dict | None:
    if not node.online:
        return None
    # mock: wartości zmieniają się co kilka sekund, ale są stałe w obrębie jednego odświeżenia
    rng = random.Random(f"{node.id}:{int(now // 5)}")
    base = random.Random(node.id)
    cpu = min(97, max(1, base.uniform(4, 25) + rng.uniform(-3, 12)))
    return {
        "cpuPercent": round(cpu, 1),
        "ramUsedBytes": int(node.ram_bytes * min(0.95, base.uniform(0.25, 0.6) + rng.uniform(-0.03, 0.08))),
        "temperatureC": round(base.uniform(41, 50) + cpu * 0.25 + rng.uniform(-1, 1), 1),
    }


def node_view(node: Node, storage: PoolStorage, settings: Settings, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    disks = []
    for disk in sorted(node.disks, key=lambda d: d.bay):
        item = disk.model_dump(mode="json", by_alias=True, exclude={"format_started_at"})
        if disk.state == "formatting" and disk.format_started_at:
            item["progress"] = round(min(0.99, (now - disk.format_started_at) / settings.format_duration_s), 3)
        disks.append(item)
    empty_bays = [bay for bay in range(1, node.bays + 1) if all(d.bay != bay for d in node.disks)]
    disks += [{"bay": bay, "state": "empty"} for bay in empty_bays]
    disks.sort(key=lambda d: d["bay"])

    degraded = any(d.state in {"failed", "warning"} for d in node.disks)
    return {
        "id": node.id,
        "name": node.name,
        "ip": node.ip,
        "role": node.role,
        "model": node.model,
        "cpuCores": node.cpu_cores,
        "ramBytes": node.ram_bytes,
        "joinedAt": node.joined_at,
        "status": "offline" if not node.online else ("degraded" if degraded else "online"),
        "online": node.online,
        # online: jak długo działa (uptime); offline: jak długo nie odpowiada — w sekundach
        "statusSeconds": max(0, int(now - node.status_since)),
        "metrics": _metrics(node, now),
        "usedBytes": storage.node_used(node),
        "capacityBytes": node_capacity(node),
        "bays": node.bays,
        "disks": disks,
    }


def refresh(db: Database, settings: Settings, storage: PoolStorage, now: float | None = None) -> bool:
    """Kończy operacje, których czas minął (formatowanie dysku, kopia zapasowa). Zwraca, czy coś się zmieniło."""
    from app.events import log_event  # unikamy cyklicznego importu

    now = time.time() if now is None else now
    changed = False
    for node in db.nodes:
        for disk in node.disks:
            if disk.state == "formatting" and disk.format_started_at and now - disk.format_started_at >= settings.format_duration_s:
                disk.state, disk.format_started_at, disk.note = "ok", None, ""
                log_event(db, "nodes", f"Dysk w kieszeni {disk.bay} węzła {node.name} sformatowany i dodany do puli.")
                changed = True

    for job in db.backups:
        if job.running_since and now - job.running_since >= settings.backup_duration_s:
            shares = [s for s in db.shares if s.id in job.share_ids]
            size = sum(storage.share_used(s, db.nodes) for s in shares)
            target = next((n for n in db.nodes if n.id == job.destination), None)
            job.running_since = None
            job.last_run_at = _iso(now)
            if job.destination != "usb" and (target is None or not target.online):
                job.last_status, job.last_size_bytes = "failed", 0
                job.last_message = "Węzeł docelowy jest niedostępny."
                log_event(db, "backup", f"Kopia „{job.name}” nie powiodła się: węzeł docelowy jest niedostępny.", level="error")
            else:
                job.last_status, job.last_size_bytes, job.last_message = "success", size, ""
                log_event(db, "backup", f"Kopia „{job.name}” zakończona ({format_bytes(size)}).")
            changed = True
    return changed


def backup_view(job, settings: Settings, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    item = job.model_dump(mode="json", by_alias=True, exclude={"running_since"})
    item["running"] = job.running_since is not None
    item["progress"] = round(min(0.99, (now - job.running_since) / settings.backup_duration_s), 3) if job.running_since else None
    return item


def alerts(db: Database, storage: PoolStorage, *, admin: bool) -> list[dict]:
    """Problemy, które warto pokazać na przeglądzie — od najpoważniejszych."""
    result = []
    for node in ordered_nodes(db):
        if not node.online:
            result.append({"level": "error", "kind": "node", "message": f"Węzeł {node.name} nie odpowiada — jego pliki są niedostępne.", "nodeId": node.id})
        for disk in node.disks:
            if disk.state == "failed":
                result.append({"level": "error", "kind": "disk", "message": f"Dysk w kieszeni {disk.bay} węzła {node.name} uległ awarii — wymień go.", "nodeId": node.id})
            elif disk.state == "warning":
                result.append({"level": "warning", "kind": "disk", "message": f"Dysk w kieszeni {disk.bay} węzła {node.name}: {disk.note or 'ostrzeżenie SMART'}.", "nodeId": node.id})
            elif disk.state == "new" and admin:
                result.append({"level": "info", "kind": "disk", "message": f"W kieszeni {disk.bay} węzła {node.name} jest nowy dysk — sformatuj go, aby dodać do puli.", "nodeId": node.id})

    capacity = sum(node_capacity(n) for n in db.nodes)
    used = sum(storage.node_used(n) for n in db.nodes)
    if capacity and used / capacity >= 0.85:
        result.append({"level": "warning", "kind": "pool", "message": f"Pula jest zajęta w {used / capacity:.0%} — dodaj dysk albo węzeł."})
    if admin:
        if db.join_requests:
            result.append({"level": "info", "kind": "join", "message": f"Nowe węzły czekają na zatwierdzenie: {len(db.join_requests)}."})
        for job in db.backups:
            if job.last_status == "failed" and not job.running_since:
                result.append({"level": "warning", "kind": "backup", "message": f"Ostatnia kopia „{job.name}” nie powiodła się: {job.last_message}", "backupId": job.id})
    order = {"error": 0, "warning": 1, "info": 2}
    return sorted(result, key=lambda a: order[a["level"]])


def _iso(timestamp: float) -> str:
    from datetime import datetime, timezone

    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat(timespec="seconds")
