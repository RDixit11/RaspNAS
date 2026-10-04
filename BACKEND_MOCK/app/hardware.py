"""Mock sprzętu: obudowy (ile kieszeni na dyski ma urządzenie) i dyski, które agent zgłasza koordynatorowi.

Liczba kieszeni zależy od urządzenia — malinka z nakładką SATA ma ich 5, obudowa USB 2, stacja dokująca 1.
"""

import random
import string

from app.models import Disk

TB = 1024**4

# (model urządzenia z obudową, liczba kieszeni na dyski)
PROFILES = [
    ("Raspberry Pi 5 (8 GB) · Penta SATA HAT", 5),
    ("Raspberry Pi 5 (4 GB) · obudowa NAS", 4),
    ("Raspberry Pi 4 (4 GB) · obudowa USB", 2),
    ("Raspberry Pi 4 (2 GB) · stacja dokująca USB", 1),
]

DISKS = [
    ("Samsung 870 EVO", TB // 2),
    ("Crucial MX500", TB),
    ("WD Red Plus", 2 * TB),
    ("Seagate IronWolf", 4 * TB),
    ("WD Red Plus", 6 * TB),
]


def device_name(bay: int) -> str:
    return f"/dev/sd{string.ascii_lowercase[bay - 1]}"


def new_disk(rng: random.Random, bay: int, state: str = "ok") -> Disk:
    model, size = rng.choice(DISKS)
    return Disk(bay=bay, device=device_name(bay), model=model, capacity_bytes=size, state=state)


def pick_profile(rng: random.Random) -> tuple[str, int]:
    return rng.choice(PROFILES)


def initial_disks(rng: random.Random, bays: int) -> list[Disk]:
    """Nowe urządzenie ma zajętą część kieszeni (co najmniej jedną)."""
    return [new_disk(rng, bay) for bay in range(1, rng.randint(1, bays) + 1)]
