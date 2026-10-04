"""Generatory przykładowych plików (obrazki SVG, dźwięk WAV, PDF, ZIP, duży log) do danych mocka."""

import io
import math
import random
import struct
import time
import wave
import zipfile

DAY = 86_400
rng = random.Random(2026)  # stałe ziarno — za każdym razem te same „losowe” pliki

# --- Generatory plików ---


def _svg(title: str, sky: tuple[str, str], ground: str, sun: str, hills: bool = False) -> str:
    shape = (
        "M0 300 Q160 220 320 290 T640 270 L640 400 L0 400 Z"
        if hills
        else "M0 330 L120 170 L210 260 L330 110 L450 250 L520 190 L640 300 L640 400 L0 400 Z"
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <title>{title}</title>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{sky[0]}"/><stop offset="1" stop-color="{sky[1]}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#sky)"/>
  <circle cx="470" cy="120" r="48" fill="{sun}"/>
  <path d="{shape}" fill="{ground}"/>
</svg>
"""


PALETTES = [
    (("#7dd3fc", "#e0f2fe"), "#166534", "#fde047"),
    (("#f97316", "#fde68a"), "#7c2d12", "#fef08a"),
    (("#4c1d95", "#c084fc"), "#1e1b4b", "#f0abfc"),
    (("#fecdd3", "#fff1f2"), "#be123c", "#fb7185"),
    (("#0f172a", "#334155"), "#020617", "#e2e8f0"),
    (("#a7f3d0", "#ecfdf5"), "#065f46", "#facc15"),
]


def photo(title: str, index: int) -> str:
    sky, ground, sun = PALETTES[index % len(PALETTES)]
    return _svg(title, sky, ground, sun, hills=index % 2 == 1)


def wav(seconds: float, freq: float, rate: int = 8000) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        fade = int(rate * 0.05)
        frames = bytearray()
        total = int(seconds * rate)
        for i in range(total):
            envelope = min(1.0, i / fade, (total - i) / fade)
            frames += struct.pack("<h", int(12_000 * envelope * math.sin(2 * math.pi * freq * i / rate)))
        out.writeframes(bytes(frames))
    return buffer.getvalue()


def pdf(lines: list[str]) -> bytes:
    """Minimalny, poprawny PDF z tekstem (tylko ASCII — standardowa czcionka Helvetica)."""
    text = "BT /F1 16 Tf 72 740 Td " + " ".join(f"({line}) Tj 0 -26 Td" for line in lines) + " ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
        b" /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(text)} >>\nstream\n{text}\nendstream".encode("ascii"),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


def zip_bytes(files: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
    return buffer.getvalue()


def random_zip(name: str, size: int) -> bytes:
    return zip_bytes({name: rng.randbytes(size)})


def log_text(lines: int) -> str:
    nodes = ["nas-koordynator", "nas-wezel-1", "nas-wezel-2"]
    levels = ["INFO"] * 8 + ["WARN", "ERROR"]
    rows = []
    for i in range(lines):
        stamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(1_790_000_000 + i * 37))
        rows.append(f"{stamp} [{levels[i % len(levels)]}] nas: synchronizacja węzła {nodes[i % 3]} (#{i})")
    return "\n".join(rows) + "\n"


LONG_NAME = (
    "Bardzo długa nazwa pliku, żeby sprawdzić, czy interfejs poprawnie ją skraca "
    "i nie rozjeżdża tabeli – wersja ostateczna (2).txt"
)

