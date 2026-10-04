import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    return default if value is None else float(value)


@dataclass(frozen=True)
class Settings:
    # Cały stan mocka: db.json + pliki. Czyszczony przy każdym starcie i zatrzymaniu backendu.
    files_dir: Path = BASE_DIR / "tempPliki"
    # Symulacja: admin widzi narzędzia testowe (awaria węzła, zgłoszenie nowego węzła)
    simulation: bool = True
    seed_sample_data: bool = True
    # Adres koordynatora w sieci firmy — pokazywany w ścieżkach SMB/NFS i jako sieć dla nowych węzłów
    coordinator_ip: str = "192.168.1.10"
    # Tylko mock: szansa (0–1), że nowy węzeł odpowie przy dołączaniu, i udawany czas łączenia
    node_connect_chance: float = 0.5
    simulated_latency_s: float = 0.8
    # Tylko mock: ile trwa formatowanie dysku i kopia zapasowa (sekundy)
    format_duration_s: float = 12.0
    backup_duration_s: float = 15.0

    @property
    def db_path(self) -> Path:
        return self.files_dir / "db.json"

    @property
    def nodes_dir(self) -> Path:
        return self.files_dir / "nodes"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            files_dir=Path(os.getenv("FILES_DIR", BASE_DIR / "tempPliki")),
            simulation=_env_flag("SIMULATION", True),
            seed_sample_data=_env_flag("SEED_SAMPLE_DATA", True),
            coordinator_ip=os.getenv("COORDINATOR_IP", "192.168.1.10"),
            node_connect_chance=_env_float("NODE_CONNECT_CHANCE", 0.5),
            simulated_latency_s=_env_float("SIMULATED_LATENCY", 0.8),
            format_duration_s=_env_float("FORMAT_DURATION", 12.0),
            backup_duration_s=_env_float("BACKUP_DURATION", 15.0),
        )
