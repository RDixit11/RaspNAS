import re
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from app.cluster import backup_view
from app.config import Settings
from app.deps import fresh_db, get_settings, get_store, require_admin
from app.events import log_event
from app.models import BackupCreate, BackupJob, Database, Schedule, User
from app.store import Store

router = APIRouter(prefix="/backups", tags=["kopie zapasowe"])

TIME = re.compile(r"([01]\d|2[0-3]):[0-5]\d")


def _check_schedule(schedule: Schedule | None) -> Schedule | None:
    """None — tylko ręcznie; inaczej co najmniej jeden dzień tygodnia (0–6) i godzina HH:MM."""
    if schedule is None:
        return None
    days = sorted(set(schedule.days))
    if not days or not all(0 <= day <= 6 for day in days):
        raise HTTPException(400, "Wybierz co najmniej jeden dzień tygodnia.")
    if not TIME.fullmatch(schedule.time):
        raise HTTPException(400, "Podaj godzinę w formacie GG:MM.")
    return Schedule(days=days, time=schedule.time)


def _job(db: Database, job_id: str) -> BackupJob:
    job = next((j for j in db.backups if j.id == job_id), None)
    if job is None:
        raise HTTPException(404, "Nie znaleziono kopii zapasowej.")
    return job


@router.get("")
def list_backups(_: User = Depends(require_admin), db: Database = Depends(fresh_db), settings: Settings = Depends(get_settings)):
    return [backup_view(j, settings) for j in db.backups]


@router.post("", status_code=201)
def create_backup(
    body: BackupCreate, request: Request, user: User = Depends(require_admin), store: Store = Depends(get_store), settings: Settings = Depends(get_settings)
):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Podaj nazwę kopii.")
    schedule = _check_schedule(body.schedule)
    with store.transaction() as db:
        if not body.share_ids or any(sid not in {s.id for s in db.shares} for sid in body.share_ids):
            raise HTTPException(400, "Wybierz co najmniej jeden udział.")
        if body.destination != "usb" and body.destination not in {n.id for n in db.nodes}:
            raise HTTPException(400, "Nieznane miejsce docelowe.")
        if any(j.name.lower() == name.lower() for j in db.backups):
            raise HTTPException(409, f"Kopia „{name}” już istnieje.")
        job = BackupJob(name=name, share_ids=list(dict.fromkeys(body.share_ids)), destination=body.destination, schedule=schedule)
        db.backups.append(job)
        log_event(db, "backup", f"Utworzono kopię zapasową „{name}”.", user=user, request=request)
    return backup_view(job, settings)


@router.post("/{job_id}/run")
def run_backup(job_id: str, request: Request, user: User = Depends(require_admin), store: Store = Depends(get_store), settings: Settings = Depends(get_settings)):
    """Uruchamia kopię teraz — postęp widać na liście, kopia kończy się po kilkunastu sekundach (mock)."""
    with store.transaction() as db:
        job = _job(db, job_id)
        if job.running_since:
            raise HTTPException(409, "Ta kopia już trwa.")
        if not job.share_ids:
            raise HTTPException(400, "Kopia nie obejmuje żadnego udziału.")
        job.running_since = time.time()
        log_event(db, "backup", f"Uruchomiono kopię „{job.name}”.", user=user, request=request)
    return backup_view(job, settings)


@router.delete("/{job_id}", status_code=204)
def delete_backup(job_id: str, request: Request, user: User = Depends(require_admin), store: Store = Depends(get_store)):
    with store.transaction() as db:
        job = _job(db, job_id)
        db.backups.remove(job)
        log_event(db, "backup", f"Usunięto kopię zapasową „{job.name}”.", user=user, request=request)
