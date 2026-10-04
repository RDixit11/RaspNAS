# RaspNas

Domowy NAS na Raspberry Pi: kilka urządzeń w jednej sieci lokalnej widocznych jako jeden system plików.

```
FRONTEND/       React + Vite + Tailwind CSS + shadcn/ui
BACKEND_MOCK/   tymczasowy backend (FastAPI) do testowania strony 
```

## Uruchomienie (Docker)

```bash
docker compose up -d --build     # http://localhost:8080
docker compose down
```

Tryb deweloperski (Vite i backend przeładowują się po zmianie kodu):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build   # http://localhost:5173
```

W trybie deweloperskim każda zmiana w kodzie backendu go restartuje — dane wracają wtedy do przykładowych
i trzeba zalogować się ponownie.

Dokumentacja API: `/api/docs` (np. http://localhost:8080/api/docs) — dostępna po zalogowaniu.

Konta w BACKEND_MOCK (hasło wszędzie: `123`): `admin` — administrator, `jan` i `ola` — zwykli użytkownicy, `kasia` — konto zablokowane.


## Lokalnie bez Dockera

```bash
cd BACKEND_MOCK
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:create_app --factory --reload   # http:/localhost:8000
```

```bash
cd FRONTEND
npm install
npm run dev        # http://localhost:5173 
npm run build      # build produkcyjny do FRONTEND/dist
```

## Struktura

Frontend to panel malinki: łączysz się z jego adresem (localhost albo IP w sieci), logujesz
i widzisz stan klastra — węzłów, dysków, udziałów i kopii zapasowych.

`FRONTEND/src`:

```
pages/        Login, Overview (przegląd), Files i ShareFiles (pliki), Account (konto i hasło),
              admin/ — Nodes, NodeDetail, Shares, Users, Backups, Logs
layouts/      AppLayout (panel boczny + nagłówek), AuthLayout (logowanie)
components/   app/ (panel boczny), cluster/ (węzły, dyski, zgłoszenia), shares/, files/, ui/ — komponenty shadcn
context/      ThemeProvider, AuthProvider (logowanie), ClusterProvider (stan klastra, odświeżany co 10 s)
hooks/        useAuth, useCluster, useResource (pobieranie danych z odświeżaniem), useTheme
services/     wywołania API — po jednym pliku na zasób
lib/          narzędzia (formatowanie, etykiety stanów, adresy IP, typy plików)
```

`BACKEND_MOCK/app` — tymczasowy koordynator:

```
routers/      auth, account, nodes (klaster, węzły, dyski, zgłoszenia), shares, files, users, logs, backups
storage.py    rozproszony system plików: osobny folder na każdy węzeł w tempPliki/nodes
cluster.py    stan klastra: pojemność, metryki, alerty, postęp formatowania i kopii
hardware.py   mock sprzętu: obudowy (ile kieszeni na dyski ma urządzenie) i dyski
seed.py       dane przykładowe (opis kont i przypadków na początku pliku)
```
