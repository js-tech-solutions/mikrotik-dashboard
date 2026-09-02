import ipaddress
import re


def validate_ip(value):
    try:
        interface = ipaddress.ip_interface(str(value).strip())

        # Una IP de interfaz no puede ser una dirección de red
        # ni broadcast cuando la red tiene hosts utilizables.
        network = interface.network

        if interface.version == 4 and network.prefixlen < 31:
            if interface.ip == network.network_address:
                return f"IP de red no válida como dirección de interfaz: {value}"

            if interface.ip == network.broadcast_address:
                return f"IP de broadcast no válida como dirección de interfaz: {value}"

        return None

    except ValueError:
        return f"IP/CIDR inválido: {value}"


def validate_network(value):
    try:
        ipaddress.ip_network(str(value).strip(), strict=False)
        return None
    except ValueError:
        return f"Red inválida: {value}"


def validate_port(value):
    try:
        port = int(value)

        if not 1 <= port <= 65535:
            return f"Puerto fuera de rango: {value}"

    except (TypeError, ValueError):
        return f"Puerto inválido: {value}"

    return None


def validate_vlan_id(value):
    try:
        vlan = int(value)

        if not 1 <= vlan <= 4094:
            return f"VLAN ID fuera de rango: {value}"

    except (TypeError, ValueError):
        return f"VLAN ID inválido: {value}"

    return None


def validate_asn(value):
    try:
        asn = int(value)

        if not 1 <= asn <= 4294967295:
            return f"ASN fuera de rango: {value}"

    except (TypeError, ValueError):
        return f"ASN inválido: {value}"

    return None


def validate_router_id(value):
    try:
        address = ipaddress.ip_address(str(value).strip())

        if address.version != 4:
            return f"Router ID debe ser IPv4: {value}"

        return None

    except ValueError:
        return f"Router ID inválido: {value}"


def validate_distance(value):
    try:
        distance = int(value)

        if not 1 <= distance <= 255:
            return f"Distance fuera de rango: {value}"

    except (TypeError, ValueError):
        return f"Distance inválida: {value}"

    return None


def validate_name(value, field="nombre"):
    if not value:
        return f"{field} requerido"

    value = str(value).strip()

    if len(value) > 64:
        return f"{field} demasiado largo"

    if not re.fullmatch(r"[A-Za-z0-9_.:-]+", value):
        return f"{field} contiene caracteres no permitidos: {value}"

    return None


def validate_gateway(gateway, network=None):
    gateway = str(gateway).strip()

    try:
        gateway_ip = ipaddress.ip_address(gateway)
    except ValueError:
        return f"Gateway inválido: {gateway}"

    if network:
        try:
            net = ipaddress.ip_network(network, strict=False)

            if gateway_ip.version != net.version:
                return (
                    f"Gateway {gateway} incompatible con la red {network}"
                )

            if gateway_ip not in net:
                return (
                    f"Gateway {gateway} fuera de la red {network}"
                )

        except ValueError:
            return f"Red inválida: {network}"

    return None
