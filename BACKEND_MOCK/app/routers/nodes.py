import asyncio
import random
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from app.cluster import alerts, coordinator, free_space, init_node, node_capacity, node_view, online_nodes, ordered_nodes
from app.config import Settings
from app.hardware import initial_disks, new_disk, pick_profile
from app.deps import fresh_db, get_current_user, get_settings, get_storage, get_store, require_admin, share_access
from app.events import log_event
from app.models import Database, JoinApproval, JoinRequest, Node, NodeCreate, NodeUpdate, User
from app.netutils import is_host_in, parse_cidr, parse_ip
from app.storage import PoolStorage
from app.store import Store

router = APIRouter(tags=["klaster"])

HOSTNAMES = ["raspberrypi", "pi-magazyn", "pi-recepcja", "nas-nowy", "pi-serwerownia"]


def _node(db: Database, node_id: str) -> Node:
    node = next((n for n in db.nodes if n.id == node_id), None)
    if node is None:
        raise HTTPException(404, "Nie znaleziono węzła.")
    return node


def _subnet(settings: Settings):
    return parse_cidr(f"{settings.coordinator_ip}/24")


def _new_node(name: str, ip: str, model: str, bays: int) -> Node:
    """Mock: agent na nowym urządzeniu zgłasza swoją obudowę i dyski."""
    disks = initial_disks(random.Random(ip), bays)
    return Node(name=name, ip=ip, model=model, bays=bays, disks=disks, status_since=time.time())


async def _agent_answers(settings: Settings) -> bool:
    """Mock: łączenie z agentem trwa chwilę i udaje się z szansą NODE_CONNECT_CHANCE (domyślnie 50%)."""
    await asyncio.sleep(settings.simulated_latency_s)
    return random.random() < settings.node_connect_chance


# --- Przegląd klastra (dla wszystkich zalogowanych) ---


@router.get("/cluster")
def cluster_summary(
    user: User = Depends(get_current_user),
    db: Database = Depends(fresh_db),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    admin = user.role == "admin"
    nodes = ordered_nodes(db)
    main = coordinator(db)
    return {
        "name": db.cluster_name,
        "simulation": settings.simulation,
        "coordinator": {"name": main.name, "ip": main.ip},
        "nodes": {
            "total": len(nodes),
            "online": sum(n.online for n in nodes),
            # stan każdego węzła w skrócie — pełne dane tylko dla admina (/nodes)
            "items": [{"id": n.id, "name": n.name, "online": n.online, "role": n.role} for n in nodes],
        },
        "pool": {
            "usedBytes": sum(storage.node_used(n) for n in nodes),
            "capacityBytes": sum(node_capacity(n) for n in nodes),
            "onlineCapacityBytes": sum(node_capacity(n) for n in nodes if n.online),
        },
        "shares": {"total": len(db.shares), "accessible": sum(1 for s in db.shares if share_access(user, s))},
        "alerts": alerts(db, storage, admin=admin),
        "recentEvents": [e.model_dump(by_alias=True) for e in reversed(db.logs[-6:])] if admin else [],
    }


# --- Zgłoszenia nowych węzłów (przed /nodes/{id}, żeby ścieżki się nie myliły) ---


@router.get("/nodes/join-requests")
def list_join_requests(
    _: User = Depends(require_admin), store: Store = Depends(get_store), settings: Settings = Depends(get_settings)
):
    result = []
    for join in store.read().join_requests:
        item = join.model_dump(by_alias=True, exclude={"code"})
        # kod parowania normalnie widać tylko na ekranie nowego urządzenia — w symulacji podpowiadamy go w UI
        if settings.simulation:
            item["simulatedCode"] = join.code
        result.append(item)
    return result


@router.post("/nodes/join-requests/simulate", status_code=201)
def simulate_join_request(
    request: Request, user: User = Depends(require_admin), store: Store = Depends(get_store), settings: Settings = Depends(get_settings)
):
    """Tylko symulacja: udaje, że agent na nowym urządzeniu zgłosił się do koordynatora."""
    if not settings.simulation:
        raise HTTPException(403, "Dostępne tylko w trybie symulacji.")
    subnet = _subnet(settings)
    with store.transaction() as db:
        used = {n.ip for n in db.nodes} | {r.ip for r in db.join_requests}
        ip = next(str(subnet.network_address + i) for i in range(30, 250) if str(subnet.network_address + i) not in used)
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        code = "".join(secrets.choice(alphabet) for _ in range(3)) + "-" + "".join(secrets.choice(alphabet) for _ in range(3))
        model, bays = pick_profile(random.Random())
        join = JoinRequest(hostname=random.choice(HOSTNAMES), ip=ip, model=model, bays=bays, code=code)
        db.join_requests.append(join)
        log_event(db, "nodes", f"Nowy węzeł {join.hostname} ({ip}) zgłosił się do klastra.", user=user, request=request)
    # kod normalnie widać tylko na ekranie nowego urządzenia — symulacja go zwraca, żeby dało się przetestować
    return join.model_dump(by_alias=True)


@router.post("/nodes/join-requests/{request_id}/approve", status_code=201)
async def approve_join_request(
    request_id: str,
    body: JoinApproval,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    join = next((r for r in store.read().join_requests if r.id == request_id), None)
    if join is None:
        raise HTTPException(404, "Nie znaleziono zgłoszenia.")
    normalize = lambda code: code.upper().replace("-", "").replace(" ", "")  # noqa: E731
    if normalize(body.code) != normalize(join.code):
        with store.transaction() as db:
            log_event(db, "nodes", f"Zły kod parowania dla węzła {join.hostname} ({join.ip}).", level="warning", user=user, request=request)
        raise HTTPException(400, "Kod nie zgadza się z kodem wyświetlanym na urządzeniu.")
    if not await _agent_answers(settings):
        raise HTTPException(504, f"Węzeł {join.hostname} ({join.ip}) nie odpowiada. Sprawdź, czy agent działa, i spróbuj ponownie.")

    with store.transaction() as db:
        db.join_requests = [r for r in db.join_requests if r.id != request_id]
        node = _new_node(join.hostname, join.ip, join.model, join.bays)
        init_node(node, storage, db)
        db.nodes.append(node)
        log_event(db, "nodes", f"Węzeł {node.name} ({node.ip}) dołączył do klastra.", user=user, request=request)
    return node_view(node, storage, settings)


@router.delete("/nodes/join-requests/{request_id}", status_code=204)
def reject_join_request(request_id: str, request: Request, user: User = Depends(require_admin), store: Store = Depends(get_store)):
    with store.transaction() as db:
        join = next((r for r in db.join_requests if r.id == request_id), None)
        if join is None:
            raise HTTPException(404, "Nie znaleziono zgłoszenia.")
        db.join_requests.remove(join)
        log_event(db, "nodes", f"Odrzucono zgłoszenie węzła {join.hostname} ({join.ip}).", user=user, request=request)


# --- Węzły (administrator) ---


@router.get("/nodes")
def list_nodes(
    _: User = Depends(require_admin),
    db: Database = Depends(fresh_db),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    return [node_view(n, storage, settings) for n in ordered_nodes(db)]


@router.post("/nodes", status_code=201)
async def add_node(
    body: NodeCreate,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    """Ręczne dodanie węzła po adresie IP — koordynator łączy się z agentem na tym adresie."""
    address = parse_ip(body.ip)
    if address is None:
        raise HTTPException(400, "Niepoprawny adres IP — przykład: 192.168.1.20.")
    subnet = _subnet(settings)
    if not is_host_in(address, subnet):
        raise HTTPException(400, f"Adres {address} jest poza siecią koordynatora ({subnet}).")
    if any(n.ip == str(address) for n in store.read().nodes):
        raise HTTPException(409, f"Węzeł {address} jest już w klastrze.")
    if not await _agent_answers(settings):
        raise HTTPException(504, f"Nie udało się połączyć z agentem na {address}. Sprawdź, czy jest uruchomiony.")

    with store.transaction() as db:
        if any(n.ip == str(address) for n in db.nodes):
            raise HTTPException(409, f"Węzeł {address} jest już w klastrze.")
        model, bays = pick_profile(random.Random(str(address)))
        name = body.name.strip() or f"wezel-{str(address).rsplit('.', 1)[1]}"
        node = _new_node(name, str(address), model, bays)
        init_node(node, storage, db)
        db.nodes.append(node)
        log_event(db, "nodes", f"Dodano węzeł {node.name} ({node.ip}).", user=user, request=request)
    return node_view(node, storage, settings)


@router.get("/nodes/{node_id}")
def get_node(
    node_id: str,
    _: User = Depends(require_admin),
    db: Database = Depends(fresh_db),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    return node_view(_node(db, node_id), storage, settings)


@router.patch("/nodes/{node_id}")
def update_node(
    node_id: str,
    body: NodeUpdate,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    with store.transaction() as db:
        node = _node(db, node_id)
        if body.name is not None:
            name = body.name.strip()
            if not name:
                raise HTTPException(400, "Podaj nazwę węzła.")
            if any(n.name.lower() == name.lower() and n.id != node_id for n in db.nodes):
                raise HTTPException(409, f"Węzeł „{name}” już istnieje.")
            if name != node.name:
                log_event(db, "nodes", f"Zmieniono nazwę węzła {node.name} na {name}.", user=user, request=request)
            node.name = name
        if body.online is not None and body.online != node.online:
            if not settings.simulation:
                raise HTTPException(403, "Awarię można zasymulować tylko w trybie symulacji.")
            if node.role == "coordinator":
                raise HTTPException(400, "Koordynatora nie można wyłączyć — to przez niego jesteś połączony.")
            node.online, node.status_since = body.online, time.time()
            message = f"Węzeł {node.name} {'znowu odpowiada' if body.online else 'przestał odpowiadać'} (symulacja)."
            log_event(db, "nodes", message, level="info" if body.online else "error", user=user, request=request)
    return node_view(node, storage, settings)


@router.delete("/nodes/{node_id}", status_code=204)
def remove_node(
    node_id: str,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
):
    """Odłącza węzeł od klastra — jego pliki są najpierw przenoszone na pozostałe węzły."""
    with store.transaction() as db:
        node = _node(db, node_id)
        if node.role == "coordinator":
            raise HTTPException(400, "Koordynatora nie można odłączyć.")
        job = next((j for j in db.backups if j.destination == node.id), None)
        if job:
            raise HTTPException(409, f"Węzeł jest celem kopii zapasowej „{job.name}” — najpierw zmień lub usuń tę kopię.")
        if storage.node_used(node):
            if not node.online:
                raise HTTPException(409, "Węzeł nie odpowiada — nie da się przenieść jego plików. Włącz go albo wymień dysk.")
            targets = [n for n in online_nodes(db) if n.id != node.id and node_capacity(n)]
            if not targets:
                raise HTTPException(409, "Nie ma innego działającego węzła, na który można przenieść pliki.")
            storage.move_node_data(node, targets, {n.id: free_space(n, storage) for n in targets})
        db.nodes.remove(node)
        log_event(db, "nodes", f"Odłączono węzeł {node.name} ({node.ip}) — jego pliki przeniesiono na pozostałe węzły.", user=user, request=request)


@router.post("/nodes/{node_id}/disks/{disk_id}/format")
def format_disk(
    node_id: str,
    disk_id: str,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    """Formatuje nowy dysk (włożony do kieszeni) i dodaje go do puli — postęp widać w szczegółach węzła."""
    with store.transaction() as db:
        node = _node(db, node_id)
        disk = next((d for d in node.disks if d.id == disk_id), None)
        if disk is None:
            raise HTTPException(404, "Nie znaleziono dysku.")
        if disk.state != "new":
            raise HTTPException(409, "Formatować można tylko nowy, nieużywany dysk.")
        if not node.online:
            raise HTTPException(409, "Węzeł nie odpowiada.")
        disk.state, disk.format_started_at = "formatting", time.time()
        log_event(db, "nodes", f"Rozpoczęto formatowanie dysku w kieszeni {disk.bay} węzła {node.name}.", user=user, request=request)
    return node_view(node, storage, settings)


# --- Symulacja wymiany dysków (szuflady wymienia się bez otwierania obudowy) ---


def _simulation_only(settings: Settings) -> None:
    if not settings.simulation:
        raise HTTPException(403, "Dostępne tylko w trybie symulacji — prawdziwy dysk wkłada się do szuflady.")


@router.post("/nodes/{node_id}/bays/{bay}/insert")
def insert_disk(
    node_id: str,
    bay: int,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    """Symulacja: nowy dysk włożony do pustej kieszeni — pojawia się jako „Nowy dysk” do sformatowania."""
    _simulation_only(settings)
    with store.transaction() as db:
        node = _node(db, node_id)
        if not 1 <= bay <= node.bays:
            raise HTTPException(404, f"Węzeł {node.name} ma {node.bays} kieszeni.")
        if any(d.bay == bay for d in node.disks):
            raise HTTPException(409, f"Kieszeń {bay} nie jest pusta.")
        if not node.online:
            raise HTTPException(409, "Węzeł nie odpowiada — agent nie zgłosi nowego dysku.")
        disk = new_disk(random.Random(), bay, state="new")
        node.disks.append(disk)
        log_event(db, "nodes", f"Włożono nowy dysk ({disk.model}) do kieszeni {bay} węzła {node.name} (symulacja).", user=user, request=request)
    return node_view(node, storage, settings)


@router.post("/nodes/{node_id}/disks/{disk_id}/eject")
def eject_disk(
    node_id: str,
    disk_id: str,
    request: Request,
    user: User = Depends(require_admin),
    store: Store = Depends(get_store),
    storage: PoolStorage = Depends(get_storage),
    settings: Settings = Depends(get_settings),
):
    """Symulacja: wyjęcie dysku z szuflady — tylko uszkodzonego albo nowego, żeby nie stracić danych z puli."""
    _simulation_only(settings)
    with store.transaction() as db:
        node = _node(db, node_id)
        disk = next((d for d in node.disks if d.id == disk_id), None)
        if disk is None:
            raise HTTPException(404, "Nie znaleziono dysku.")
        if disk.state not in {"failed", "new"}:
            raise HTTPException(409, "Wyjąć można tylko uszkodzony albo nowy dysk — sprawny jest częścią puli.")
        node.disks.remove(disk)
        log_event(db, "nodes", f"Wyjęto dysk z kieszeni {disk.bay} węzła {node.name} (symulacja).", user=user, request=request)
    return node_view(node, storage, settings)
