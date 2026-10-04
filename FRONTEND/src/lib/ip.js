// Adresy IPv4 i podsieci w notacji CIDR (np. 192.168.1.0/24).
// Liczymy na zwykłej arytmetyce zamiast operatorów bitowych, bo te w JS działają na liczbach ze znakiem.

export function parseIp(value) {
  const parts = String(value).trim().split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    result = result * 256 + octet
  }
  return result
}

export function formatIp(value) {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.')
}

// Maska od /8 do /30 — węższe i szersze podsieci nie mają sensu w domowym LAN-ie.
export function parseCidr(value) {
  const match = String(value).trim().match(/^([\d.]+)\/(\d{1,2})$/)
  if (!match) return null

  const ip = parseIp(match[1])
  const bits = Number(match[2])
  if (ip === null || bits < 8 || bits > 30) return null

  const size = 2 ** (32 - bits)
  const network = Math.floor(ip / size) * size
  return { network, broadcast: network + size - 1, bits, cidr: `${formatIp(network)}/${bits}` }
}

// Czy adres jest adresem hosta w podsieci (bez adresu sieci i rozgłoszeniowego).
export function isHostInCidr(ip, cidr) {
  const address = parseIp(ip)
  const subnet = parseCidr(cidr)
  if (address === null || !subnet) return false
  return address > subnet.network && address < subnet.broadcast
}

export function exampleHost(cidr) {
  const subnet = parseCidr(cidr)
  if (!subnet) return '192.168.1.20'
  return formatIp(Math.min(subnet.network + 20, subnet.broadcast - 1))
}

// Początek adresu wspólny dla całej sieci — pełne oktety części sieciowej, np. /24 → „192.168.1.”, /16 → „192.168.”
export function networkPrefix(cidr) {
  const subnet = parseCidr(cidr)
  if (!subnet) return ''
  const octets = formatIp(subnet.network).split('.')
  const full = Math.min(3, Math.max(1, Math.floor(subnet.bits / 8)))
  return `${octets.slice(0, full).join('.')}.`
}
