import ipaddress


def parse_cidr(value: str) -> ipaddress.IPv4Network | None:
    """Podsieć z maską /8–/30, znormalizowana do adresu sieci (192.168.1.7/24 → 192.168.1.0/24)."""
    try:
        network = ipaddress.IPv4Network(value.strip(), strict=False)
    except ValueError:
        return None
    if "/" not in value or not 8 <= network.prefixlen <= 30:
        return None
    return network


def parse_ip(value: str) -> ipaddress.IPv4Address | None:
    try:
        return ipaddress.IPv4Address(value.strip())
    except ValueError:
        return None


def is_host_in(ip: ipaddress.IPv4Address, network: ipaddress.IPv4Network) -> bool:
    return ip in network and ip not in (network.network_address, network.broadcast_address)
