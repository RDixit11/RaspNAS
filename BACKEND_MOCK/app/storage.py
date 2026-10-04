"""Rozproszony system plików mocka.

Każdy węzeł ma swój folder (tempPliki/nodes/<węzeł>), a w nim foldery udziałów. Użytkownik widzi jeden
system plików — listing udziału to suma jego folderów na wszystkich węzłach, a nowy plik trafia na
działający węzeł z największą ilością wolnego miejsca.
"""

import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO

from fastapi import HTTPException

from app.models import Node, Share


def split_path(path: str) -> list[str]:
    parts = [part for part in path.replace("\\", "/").split("/") if part]
    for part in parts:
        validate_name(part)
    return parts


def validate_name(name: str) -> str:
    name = name.strip()
    if not name or name in {".", ".."} or any(ch in name for ch in '/\\\0') or len(name) > 255:
        raise HTTPException(400, "Niepoprawna nazwa pliku lub folderu.")
    return name


def join_path(parts: list[str]) -> str:
    return "/" + "/".join(parts)


def folder_name(label: str, item_id: str) -> str:
    slug = re.sub(r"[^\w]+", "-", label.lower()).strip("-")[:40]
    return f"{slug}_{item_id}" if slug else item_id


def format_bytes(size: float) -> str:
    """Rozmiar po polsku do komunikatów, np. 135,7 KB."""
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            text = f"{size:.1f}".rstrip("0").rstrip(".").replace(".", ",")
            return f"{text} {unit}"
        size /= 1024
    return f"{size} TB"


def _mtime(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(timespec="seconds")


def _dir_size(path: Path) -> int:
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) if path.exists() else 0


class PoolStorage:
    def __init__(self, root: Path):
        self.root = root

    # --- foldery ---

    def node_dir(self, node: Node) -> Path:
        return self.root / (node.folder or node.id)

    def share_dir(self, node: Node, share: Share) -> Path:
        return self.node_dir(node) / (share.folder or share.id)

    def _resolve(self, node: Node, share: Share, parts: list[str]) -> Path:
        base = self.share_dir(node, share).resolve()
        target = base.joinpath(*parts).resolve()
        if target != base and base not in target.parents:  # druga linia obrony przed ../
            raise HTTPException(400, "Niepoprawna ścieżka.")
        return target

    def init_share(self, share: Share, nodes: list[Node]) -> None:
        for node in nodes:
            self.share_dir(node, share).mkdir(parents=True, exist_ok=True)

    def remove_share(self, share: Share, nodes: list[Node]) -> None:
        for node in nodes:
            shutil.rmtree(self.share_dir(node, share), ignore_errors=True)

    # --- zajętość ---

    def node_used(self, node: Node) -> int:
        return _dir_size(self.node_dir(node))

    def share_used(self, share: Share, nodes: list[Node]) -> int:
        return sum(_dir_size(self.share_dir(node, share)) for node in nodes)

    # --- odczyt ---

    def find_file(self, share: Share, nodes: list[Node], parts: list[str]) -> tuple[Node, Path] | None:
        for node in nodes:
            path = self._resolve(node, share, parts)
            if path.is_file():
                return node, path
        return None

    def is_dir(self, share: Share, nodes: list[Node], parts: list[str]) -> bool:
        return not parts or any(self._resolve(node, share, parts).is_dir() for node in nodes)

    def exists(self, share: Share, nodes: list[Node], parts: list[str]) -> bool:
        return any(self._resolve(node, share, parts).exists() for node in nodes)

    def list_dir(self, share: Share, nodes: list[Node], parts: list[str]) -> list[dict]:
        if not self.is_dir(share, nodes, parts):
            raise HTTPException(404, "Nie ma takiego folderu.")

        entries: dict[str, dict] = {}
        for node in nodes:
            folder = self._resolve(node, share, parts)
            if not folder.is_dir():
                continue
            for child in folder.iterdir():
                if child.is_dir():
                    entry = entries.setdefault(
                        child.name, {"name": child.name, "type": "dir", "size": None, "nodeId": None, "modifiedAt": _mtime(child)}
                    )
                    entry["modifiedAt"] = max(entry["modifiedAt"], _mtime(child))
                elif child.is_file():
                    entries[child.name] = {
                        "name": child.name,
                        "type": "file",
                        "size": child.stat().st_size,
                        "nodeId": node.id,
                        "modifiedAt": _mtime(child),
                    }
        # foldery na początku, potem alfabetycznie
        return sorted(entries.values(), key=lambda e: (e["type"] != "dir", e["name"].lower()))

    def list_folders(self, share: Share, nodes: list[Node]) -> list[str]:
        """Wszystkie foldery udziału (suma z węzłów) — do wyboru, dokąd przenieść plik."""
        found: set[str] = set()
        for node in nodes:
            base = self.share_dir(node, share)
            if base.is_dir():
                found.update(join_path(list(p.relative_to(base).parts)) for p in base.rglob("*") if p.is_dir())
        return ["/", *sorted(found, key=lambda p: [part.lower() for part in p.split("/")])]

    # --- zapis ---

    def unique_name(self, share: Share, nodes: list[Node], parts: list[str], name: str) -> str:
        if not self.exists(share, nodes, [*parts, name]):
            return name
        stem, dot, ext = name.rpartition(".") if "." in name.lstrip(".") else (name, "", "")
        for i in range(1, 1000):
            candidate = f"{stem} ({i}){dot}{ext}"
            if not self.exists(share, nodes, [*parts, candidate]):
                return candidate
        raise HTTPException(409, "Za dużo plików o tej nazwie.")

    def save_file(self, node: Node, share: Share, parts: list[str], name: str, data: BinaryIO) -> Path:
        target = self._resolve(node, share, [*parts, name])
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as out:
            shutil.copyfileobj(data, out)
        return target

    def make_dir(self, share: Share, nodes: list[Node], parts: list[str], name: str) -> None:
        if self.exists(share, nodes, [*parts, name]):
            raise HTTPException(409, f"„{name}” już istnieje.")
        # folder powstaje na wszystkich węzłach, żeby był widoczny niezależnie od ich stanu
        for node in nodes:
            self._resolve(node, share, [*parts, name]).mkdir(parents=True, exist_ok=True)

    def delete(self, share: Share, nodes: list[Node], parts: list[str], online_ids: set[str]) -> None:
        if not parts:
            raise HTTPException(400, "Nie można usunąć głównego folderu udziału.")
        if self.is_dir(share, nodes, parts):
            for node in nodes:
                shutil.rmtree(self._resolve(node, share, parts), ignore_errors=True)
            return
        found = self.find_file(share, nodes, parts)
        if found is None:
            raise HTTPException(404, "Nie ma takiego pliku.")
        node, path = found
        if node.id not in online_ids:
            raise HTTPException(503, f"Plik leży na niedostępnym węźle {node.name}.")
        path.unlink()

    def move(self, share: Share, nodes: list[Node], parts: list[str], destination: list[str], online_ids: set[str]) -> list[str]:
        """Przenosi plik albo folder do innego folderu tego samego udziału — na tych samych węzłach,
        na których leży. Zwraca nową ścieżkę."""
        if not parts:
            raise HTTPException(400, "Nie można przenieść głównego folderu udziału.")
        name = parts[-1]
        if not self.exists(share, nodes, parts):
            raise HTTPException(404, f"Nie ma już „{name}” — odśwież listę.")
        if not self.is_dir(share, nodes, destination):
            raise HTTPException(404, "Nie ma folderu docelowego.")
        if destination == parts[:-1]:
            raise HTTPException(400, f"„{name}” już jest w tym folderze.")
        is_dir = self.is_dir(share, nodes, parts)
        if is_dir and destination[: len(parts)] == parts:
            raise HTTPException(400, "Nie można przenieść folderu do niego samego.")
        if self.exists(share, nodes, [*destination, name]):
            where = destination[-1] if destination else share.name
            raise HTTPException(409, f"W folderze „{where}” jest już „{name}”.")

        if is_dir:
            # folder ma kopię na każdym węźle — przenosimy wszystkie; nie da się, gdy pliki leżą na niedziałającym
            sources = [(node, self._resolve(node, share, parts)) for node in nodes]
            sources = [(node, path) for node, path in sources if path.is_dir()]
            for node, path in sources:
                if node.id not in online_ids and any(f.is_file() for f in path.rglob("*")):
                    raise HTTPException(503, f"Część plików z „{name}” leży na niedostępnym węźle {node.name}.")
        else:
            node, path = self.find_file(share, nodes, parts)
            if node.id not in online_ids:
                raise HTTPException(503, f"Plik leży na niedostępnym węźle {node.name}.")
            sources = [(node, path)]

        for node, path in sources:
            target = self._resolve(node, share, [*destination, name])
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(path, target)
        return [*destination, name]

    def move_node_data(self, source: Node, targets: list[Node], free: dict[str, int]) -> None:
        """Przenosi pliki z usuwanego węzła na pozostałe (każdy plik na węzeł z największym wolnym miejscem)."""
        base = self.node_dir(source)
        for file in sorted(base.rglob("*")):
            if not file.is_file():
                continue
            size = file.stat().st_size
            target = max(targets, key=lambda n: free[n.id])
            if free[target.id] < size:
                raise HTTPException(507, "Na pozostałych węzłach nie ma miejsca na dane z tego węzła.")
            destination = self.node_dir(target) / file.relative_to(base)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(file, destination)
            free[target.id] -= size
        shutil.rmtree(base, ignore_errors=True)
