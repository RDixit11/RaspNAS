import json
import os
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from app.models import Database


class Store:
    """Baza w jednym pliku JSON — wystarczy na przykładowy backend."""

    def __init__(self, path: Path):
        # nie wczytujemy starego db.json — mock przy każdym starcie zaczyna od danych przykładowych
        self.path = path
        self._lock = threading.RLock()
        self._db = Database()

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        data = self._db.model_dump(mode="json", by_alias=True)
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, self.path)

    def read(self) -> Database:
        with self._lock:
            return self._db.model_copy(deep=True)

    @contextmanager
    def transaction(self) -> Iterator[Database]:
        """Zmiany są zapisywane tylko, gdy blok zakończy się bez wyjątku."""
        with self._lock:
            draft = self._db.model_copy(deep=True)
            yield draft
            self._db = draft
            self._save()

    def replace(self, db: Database) -> None:
        with self._lock:
            self._db = db
            self._save()
