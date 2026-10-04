"""Dane przykładowe koordynatora — klaster z każdym stanem, jaki warto przetestować w UI.

Mock nie trzyma niczego na stałe: dane powstają od nowa przy każdym starcie backendu,
a tempPliki jest czyszczone przy jego zatrzymaniu.

Konta (hasło wszędzie: 123):
  admin — administrator
  jan   — użytkownik (zapis: Dokumenty, Projekty; odczyt: Zdjęcia, Publiczny)
  ola   — użytkownik (zapis: Zdjęcia; odczyt: Dokumenty, Publiczny)
  kasia — konto zablokowane
"""

import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

from app.auth import hash_password
from app.cluster import init_node
from app.config import Settings
from app.models import BackupJob, Database, Disk, JoinRequest, LogEvent, Node, Schedule, Share, User
from app.samples import LONG_NAME, log_text, pdf, photo, random_zip, rng, wav, zip_bytes
from app.storage import PoolStorage, folder_name

DAY = 86_400
HOUR = 3_600
GB = 1024**3
TB = 1024**4


def _iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat(timespec="seconds")


def _users() -> dict[str, User]:
    password = hash_password("123")
    return {
        "admin": User(id="admin", username="admin", password_hash=password, role="admin"),
        "jan": User(username="jan", password_hash=password),
        "ola": User(username="ola", password_hash=password),
        "kasia": User(username="kasia", password_hash=password, active=False),
    }


def _nodes(settings: Settings, now: float) -> dict[str, Node]:
    prefix = settings.coordinator_ip.rsplit(".", 1)[0]
    return {
        "koordynator": Node(
            name="nas-koordynator", ip=settings.coordinator_ip, role="coordinator",
            model="Raspberry Pi 5 (8 GB) · obudowa NAS", bays=4,
            ram_bytes=8 * GB, status_since=now - 12 * DAY, joined_at=_iso(now - 90 * DAY),
            disks=[
                Disk(bay=1, device="/dev/sda", model="Samsung 870 EVO", capacity_bytes=1 * TB),
                Disk(bay=2, device="/dev/sdb", model="WD Red Plus", capacity_bytes=2 * TB),
            ],
        ),
        "wezel1": Node(
            name="nas-wezel-1", ip=f"{prefix}.11", model="Raspberry Pi 5 (4 GB) · Penta SATA HAT", bays=5,
            status_since=now - 12 * DAY, joined_at=_iso(now - 80 * DAY),
            disks=[
                Disk(bay=1, device="/dev/sda", model="WD Red Plus", capacity_bytes=2 * TB),
                Disk(bay=2, device="/dev/sdb", model="Seagate IronWolf", capacity_bytes=2 * TB, state="warning",
                     note="SMART: 12 realokowanych sektorów — zaplanuj wymianę"),
            ],
        ),
        "wezel2": Node(
            name="nas-wezel-2", ip=f"{prefix}.12", model="Raspberry Pi 4 (4 GB) · obudowa USB", bays=2,
            status_since=now - 3 * DAY, joined_at=_iso(now - 60 * DAY),
            disks=[
                Disk(bay=1, device="/dev/sda", model="Crucial MX500", capacity_bytes=1 * TB),
                Disk(bay=2, device="/dev/sdb", model="WD Blue", capacity_bytes=1 * TB, state="failed",
                     note="Dysk nie odpowiada — wymień go"),
            ],
        ),
        "wezel3": Node(
            name="nas-wezel-3", ip=f"{prefix}.13", model="Raspberry Pi 4 (4 GB) · obudowa USB", bays=2,
            online=False, status_since=now - 2 * HOUR, joined_at=_iso(now - 30 * DAY),
            disks=[Disk(bay=1, device="/dev/sda", model="WD Red Plus", capacity_bytes=2 * TB)],
        ),
        "zapas": Node(
            name="nas-zapas", ip=f"{prefix}.14", model="Raspberry Pi 4 (2 GB) · stacja dokująca USB", bays=1, ram_bytes=2 * GB,
            status_since=now - 1 * DAY, joined_at=_iso(now - 1 * DAY),
            disks=[Disk(bay=1, device="/dev/sda", model="Seagate IronWolf", capacity_bytes=4 * TB, state="new")],
        ),
    }


def _shares(users: dict[str, User]) -> dict[str, Share]:
    jan, ola, kasia = users["jan"].id, users["ola"].id, users["kasia"].id
    return {
        "dokumenty": Share(name="Dokumenty", description="Umowy, faktury i dokumenty firmowe",
                           permissions={jan: "write", ola: "read"}),
        "projekty": Share(name="Projekty", description="Pliki bieżących projektów", nfs=True, permissions={jan: "write"}),
        "ksiegowosc": Share(name="Księgowość", description="Tylko dla administratorów"),
        "zdjecia": Share(name="Zdjęcia", description="Zdjęcia z wydarzeń firmowych", permissions={ola: "write", jan: "read"}),
        "publiczny": Share(name="Publiczny", description="Dostępny dla wszystkich", nfs=True,
                           permissions={jan: "read", ola: "read", kasia: "read"}),
    }


def _files() -> list[tuple[str, str, str, str | bytes, int]]:
    """(udział, węzeł, ścieżka, zawartość, ile dni temu)"""
    spread = ["koordynator", "wezel1", "wezel2"]
    photos = [
        ("zdjecia", spread[i % 3], f"Wyjazd integracyjny/IMG_{i:04d}.svg", photo(f"IMG_{i:04d}", i), 40 - i)
        for i in range(1, 25)
    ]
    return [
        ("dokumenty", "koordynator", "README.txt",
         "Udział „Dokumenty”.\n\nTo dane przykładowe z BACKEND_MOCK. Pliki leżą w tempPliki — w osobnym folderze\n"
         "dla każdego węzła — a tu widzisz je jako jeden system plików.\n", 30),
        ("dokumenty", "wezel1", "Umowy/Umowa najmu biura.txt",
         "UMOWA NAJMU LOKALU UŻYTKOWEGO (przykład)\n\n§1. Przedmiotem najmu jest lokal biurowy o pow. 85 m²...\n", 32),
        ("dokumenty", "koordynator", "Umowy/Instrukcja serwera NAS.pdf",
         pdf(["Instrukcja serwera NAS", "", "1. Wymiana dysku: wysun szuflade, wloz nowy dysk.",
              "2. W panelu: Wezly -> wybierz wezel -> Formatuj.", "3. Dysk zostanie dodany do puli."]), 60),
        ("dokumenty", "wezel2", "Kadry/2026/Szkolenia/BHP/notatki.md",
         "# Szkolenie BHP\n\n- drogi ewakuacyjne\n- gaśnice: korytarz, kuchnia\n", 5),
        ("dokumenty", "koordynator", f"Kadry/{LONG_NAME}", "Ten plik ma bardzo długą nazwę.\n", 12),
        ("dokumenty", "wezel3", "Umowy/Umowa serwisowa.txt", "Ten plik leży na wyłączonym węźle nas-wezel-3.\n", 20),
        ("dokumenty", "wezel1", ".ukryty-plik", "Plik zaczynający się od kropki.\n", 50),
        ("projekty", "wezel1", "Strona WWW/opis.md", "# Nowa strona firmy\n\n- makieta gotowa\n- termin: listopad\n", 4),
        ("projekty", "wezel2", "Strona WWW/makieta.svg", photo("Makieta strony", 2), 6),
        ("projekty", "koordynator", "budzet-projektu.csv",
         "pozycja;kwota\nprojekt graficzny;4500\nprogramowanie;12000\nhosting;600\n", 3),
        ("projekty", "wezel1", "ustawienia.json", '{\n  "srodowisko": "test",\n  "wersja": "0.9.1"\n}\n', 7),
        ("projekty", "koordynator", "Logi/serwer.log", log_text(9000), 0),  # > 512 KB — bez podglądu tekstu
        ("projekty", "wezel2", "Archiwa/stare-projekty.zip",
         zip_bytes({"projekt-2019.txt": b"Stary projekt.\n", "projekt-2020.txt": b"Kolejny.\n"}), 400),
        ("projekty", "wezel3", "Strona WWW/teksty.md", "Teksty na stronę — na wyłączonym węźle.\n", 8),
        ("ksiegowosc", "koordynator", "2026/faktura-08.txt", "Faktura VAT 08/2026\nPrąd: 1 214,50 zł\n", 40),
        ("ksiegowosc", "wezel1", "2026/faktura-09.txt", "Faktura VAT 09/2026\nPrąd: 1 198,20 zł\n", 9),
        ("ksiegowosc", "wezel3", "2026/faktura-10.txt", "Faktura VAT 10/2026 — na wyłączonym węźle.\n", 1),
        ("ksiegowosc", "wezel2", "Bilans 2025.csv",
         "kwartal;przychody;koszty\nQ1;182000;151000\nQ2;199000;160500\nQ3;205000;158900\nQ4;231000;170200\n", 120),
        ("ksiegowosc", "koordynator", "Kopie/archiwum-2024.zip", random_zip("archiwum.bin", 300_000), 250),
        *photos,
        ("zdjecia", "wezel2", "Biuro/Nowe biuro.svg", photo("Nowe biuro", 5), 15),
        ("zdjecia", "koordynator", "Nagrania/Powitanie.wav", wav(1.2, 660), 15),
        ("publiczny", "koordynator", "Regulamin.txt",
         "Regulamin korzystania z serwera NAS\n\n1. Nie przechowuj prywatnych plików.\n", 70),
        ("publiczny", "wezel1", "Menu stołówki.md", "# Menu\n\n- pon: pierogi ruskie\n- wt: schabowy\n", 2),
        ("publiczny", "wezel2", "Logo firmy.svg", photo("Logo", 3), 100),
    ]


EMPTY_FOLDERS = [("projekty", "Do posortowania")]


def _logs(now: float) -> list[LogEvent]:
    """Historia z ostatniego tygodnia — od najstarszych."""
    admin_pc, jan_pc, ola_pc, attacker = "192.168.1.50", "192.168.1.61", "192.168.1.64", "192.168.1.77"
    entries = [
        (6.9 * DAY, "info", "system", "Koordynator uruchomiony.", None, None),
        (6.8 * DAY, "info", "auth", "Zalogowano.", "admin", admin_pc),
        (6.7 * DAY, "info", "users", "Utworzono konto kasia (użytkownik).", "admin", admin_pc),
        (6.5 * DAY, "info", "shares", "Nadano kasia odczyt udziału Publiczny.", "admin", admin_pc),
        (5.9 * DAY, "info", "backup", "Kopia „Dokumenty i Księgowość co noc” zakończona (2,1 MB).", None, None),
        (5.2 * DAY, "warning", "auth", "Nieudane logowanie na konto admin (złe hasło).", "admin", attacker),
        (5.2 * DAY - 60, "warning", "auth", "Nieudane logowanie na konto admin (złe hasło).", "admin", attacker),
        (5.2 * DAY - 120, "warning", "auth", "Nieudane logowanie: nie ma konta root.", "root", attacker),
        (4.9 * DAY, "info", "backup", "Kopia „Dokumenty i Księgowość co noc” zakończona (2,1 MB).", None, None),
        (4.5 * DAY, "info", "auth", "Zalogowano.", "jan", jan_pc),
        (4.5 * DAY - 300, "info", "files", "Wysłano plik Projekty/Strona WWW/opis.md.", "jan", jan_pc),
        (3.9 * DAY, "info", "backup", "Kopia „Dokumenty i Księgowość co noc” zakończona (2,1 MB).", None, None),
        (3.1 * DAY, "error", "nodes", "Dysk w kieszeni 2 węzła nas-wezel-2 nie odpowiada.", None, None),
        (3.0 * DAY, "info", "nodes", "Węzeł nas-wezel-2 uruchomiony ponownie.", None, None),
        (2.9 * DAY, "info", "backup", "Kopia „Dokumenty i Księgowość co noc” zakończona (2,1 MB).", None, None),
        (2.4 * DAY, "warning", "nodes", "Dysk w kieszeni 2 węzła nas-wezel-1: SMART — 12 realokowanych sektorów.", None, None),
        (2.0 * DAY, "error", "backup", "Kopia „Zdjęcia co tydzień” nie powiodła się: dysk USB jest odłączony.", None, None),
        (1.9 * DAY, "info", "backup", "Kopia „Dokumenty i Księgowość co noc” zakończona (2,1 MB).", None, None),
        (1.5 * DAY, "info", "auth", "Zalogowano.", "ola", ola_pc),
        (1.5 * DAY - 600, "info", "files", "Wysłano 24 pliki do Zdjęcia/Wyjazd integracyjny.", "ola", ola_pc),
        (1.2 * DAY, "warning", "auth", "Próba logowania na zablokowane konto kasia.", "kasia", "192.168.1.70"),
        (1.0 * DAY, "info", "nodes", "Węzeł nas-zapas dołączył do klastra.", "admin", admin_pc),
        (0.9 * DAY, "info", "backup", "Kopia „Dokumenty i Księgowość co noc” zakończona (2,1 MB).", None, None),
        (0.5 * DAY, "info", "nodes", "Nowy węzeł pi-biuro-2 zgłosił się do klastra.", None, None),
        (2 * HOUR, "error", "nodes", "Węzeł nas-wezel-3 przestał odpowiadać.", None, None),
        (1 * HOUR, "info", "nodes", "Nowy węzeł raspberrypi zgłosił się do klastra.", None, None),
    ]
    return [
        LogEvent(time=_iso(now - ago), level=level, category=category, message=message, username=user, ip=ip)
        for ago, level, category, message, user, ip in entries
    ]


def seed(settings: Settings) -> Database:
    """Świeża baza z danymi przykładowymi i plikami w tempPliki/nodes."""
    shutil.rmtree(settings.nodes_dir, ignore_errors=True)
    rng.seed(2026)
    now = time.time()
    storage = PoolStorage(settings.nodes_dir)

    users = _users()
    nodes = _nodes(settings, now)
    shares = _shares(users)
    db = Database(
        cluster_name="NAS firmy", users=list(users.values()), nodes=list(nodes.values()), shares=list(shares.values())
    )

    for share in db.shares:
        share.folder = folder_name(share.name, share.id)
    for node in db.nodes:
        init_node(node, storage, db)

    for share_key, node_key, path, content, days_ago in _files():
        target = storage.share_dir(nodes[node_key], shares[share_key]) / Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content.encode("utf-8") if isinstance(content, str) else content)
        stamp = now - days_ago * DAY
        os.utime(target, (stamp, stamp))
    for share_key, folder in EMPTY_FOLDERS:
        for node in db.nodes:
            (storage.share_dir(node, shares[share_key]) / folder).mkdir(parents=True, exist_ok=True)

    prefix = settings.coordinator_ip.rsplit(".", 1)[0]
    db.join_requests = [
        JoinRequest(hostname="pi-biuro-2", ip=f"{prefix}.31", model="Raspberry Pi 5 (8 GB) · Penta SATA HAT", bays=5, code="K7P-4QX",
                    requested_at=_iso(now - 0.5 * DAY)),
        JoinRequest(hostname="raspberrypi", ip=f"{prefix}.42", model="Raspberry Pi 4 (4 GB) · obudowa USB", bays=2, code="M2D-8TR",
                    requested_at=_iso(now - 1 * HOUR)),
    ]

    db.backups = [
        BackupJob(name="Dokumenty i Księgowość co noc", share_ids=[shares["dokumenty"].id, shares["ksiegowosc"].id],
                  destination=nodes["wezel1"].id, schedule=Schedule(days=list(range(7)), time="02:00"), last_run_at=_iso(now - 0.9 * DAY),
                  last_status="success", last_size_bytes=2_200_000),
        BackupJob(name="Zdjęcia co tydzień", share_ids=[shares["zdjecia"].id], destination="usb",
                  schedule=Schedule(days=[6], time="03:00"), last_run_at=_iso(now - 2 * DAY), last_status="failed",
                  last_message="Dysk USB jest odłączony."),
        BackupJob(name="Projekty — ręcznie", share_ids=[shares["projekty"].id], destination=nodes["wezel3"].id,
                  schedule=None),
    ]
    db.logs = _logs(now)
    return db


def clear_files(settings: Settings) -> None:
    """Czyści tempPliki (zostawia tylko .gitkeep)."""
    if not settings.files_dir.exists():
        return
    for child in settings.files_dir.iterdir():
        if child.name == ".gitkeep":
            continue
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            child.unlink(missing_ok=True)
