"""Model danych koordynatora: klaster węzłów, udziały, użytkownicy z rolami, dziennik i kopie zapasowe."""

from datetime import datetime, timezone
from secrets import token_hex
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Role = Literal["admin", "user"]
Access = Literal["read", "write"]
DiskState = Literal["ok", "warning", "failed", "new", "formatting", "empty"]
Level = Literal["info", "warning", "error"]
Category = Literal["auth", "files", "nodes", "shares", "users", "backup", "system"]


def new_id() -> str:
    return token_hex(6)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class CamelModel(BaseModel):
    # JSON w API używa camelCase (shareId), a kod Pythona snake_case (share_id)
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# --- Konta ---


class User(CamelModel):
    id: str = Field(default_factory=new_id)
    username: str
    password_hash: str
    role: Role = "user"
    active: bool = True
    created_at: str = Field(default_factory=now_iso)
    last_login_at: str | None = None


class Session(CamelModel):
    user_id: str
    created_at: str = Field(default_factory=now_iso)


# --- Klaster ---


class Disk(CamelModel):
    id: str = Field(default_factory=new_id)
    bay: int  # numer kieszeni (szuflady) na dysk
    device: str = ""  # np. /dev/sda
    model: str = ""
    capacity_bytes: int = 0
    state: DiskState = "ok"
    note: str = ""  # np. wynik SMART
    format_started_at: float | None = None


class Node(CamelModel):
    id: str = Field(default_factory=new_id)
    name: str
    ip: str
    role: Literal["coordinator", "storage"] = "storage"
    model: str = ""
    cpu_cores: int = 4
    ram_bytes: int = 4 * 1024**3
    bays: int = 2
    disks: list[Disk] = []
    # mock: czy agent na węźle odpowiada (admin może zasymulować awarię)
    online: bool = True
    status_since: float = 0.0  # od kiedy węzeł jest w obecnym stanie (uptime albo czas awarii)
    joined_at: str = Field(default_factory=now_iso)
    folder: str = ""  # folder węzła w tempPliki/nodes


class JoinRequest(CamelModel):
    """Agent na nowym urządzeniu zgłosił się do koordynatora i czeka na zatwierdzenie kodem."""

    id: str = Field(default_factory=new_id)
    hostname: str
    ip: str
    model: str
    bays: int = 2  # ile kieszeni na dyski ma urządzenie — zgłasza to agent
    code: str
    requested_at: str = Field(default_factory=now_iso)


class Share(CamelModel):
    id: str = Field(default_factory=new_id)
    name: str
    description: str = ""
    smb: bool = True
    nfs: bool = False
    # id użytkownika → poziom dostępu; administratorzy mają pełny dostęp zawsze
    permissions: dict[str, Access] = {}
    created_at: str = Field(default_factory=now_iso)
    folder: str = ""  # folder udziału na każdym węźle


class LogEvent(CamelModel):
    id: str = Field(default_factory=new_id)
    time: str = Field(default_factory=now_iso)
    level: Level = "info"
    category: Category
    message: str
    username: str | None = None
    ip: str | None = None


class Schedule(CamelModel):
    """Kiedy uruchamiać kopię: wybrane dni tygodnia o jednej godzinie."""

    days: list[int]  # 0 = poniedziałek … 6 = niedziela
    time: str  # "HH:MM"


class BackupJob(CamelModel):
    id: str = Field(default_factory=new_id)
    name: str
    share_ids: list[str]
    destination: str  # id węzła albo "usb"
    schedule: Schedule | None = None  # None — tylko ręcznie
    last_run_at: str | None = None
    last_status: Literal["success", "failed"] | None = None
    last_message: str = ""
    last_size_bytes: int = 0
    running_since: float | None = None


class Database(CamelModel):
    cluster_name: str = "NAS"
    users: list[User] = []
    sessions: dict[str, Session] = {}
    nodes: list[Node] = []
    join_requests: list[JoinRequest] = []
    shares: list[Share] = []
    logs: list[LogEvent] = []
    backups: list[BackupJob] = []


# --- Odpowiedzi ---


class PublicUser(CamelModel):
    id: str
    username: str
    role: Role


# --- Dane wejściowe ---


class Credentials(CamelModel):
    username: str = Field(max_length=32)
    password: str = Field(max_length=128)


class PasswordChange(CamelModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)


class UserCreate(CamelModel):
    username: str = Field(max_length=32)
    password: str = Field(max_length=128)
    role: Role = "user"


class UserUpdate(CamelModel):
    role: Role | None = None
    active: bool | None = None
    password: str | None = Field(default=None, max_length=128)


class NodeCreate(CamelModel):
    ip: str
    name: str = Field(default="", max_length=40)


class NodeUpdate(CamelModel):
    name: str | None = Field(default=None, max_length=40)
    online: bool | None = None  # tylko symulacja


class JoinApproval(CamelModel):
    code: str = Field(max_length=16)


class ShareCreate(CamelModel):
    name: str = Field(max_length=40)
    description: str = Field(default="", max_length=120)
    smb: bool = True
    nfs: bool = False


class ShareUpdate(CamelModel):
    name: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=120)
    smb: bool | None = None
    nfs: bool | None = None
    permissions: dict[str, Access] | None = None


class FolderCreate(CamelModel):
    path: str = "/"
    name: str


class EntryMove(CamelModel):
    path: str  # co przenieść (plik albo folder)
    destination: str  # do którego folderu


class BackupCreate(CamelModel):
    name: str = Field(max_length=60)
    share_ids: list[str]
    destination: str
    schedule: Schedule | None = None
