import re
from collections import defaultdict


DANGEROUS_PATTERNS = [
    (r"/system\s+reset-configuration", "CRITICAL"),
    (r"/system\s+routerboard\s+upgrade", "CRITICAL"),
    (r"/user\s+remove", "CRITICAL"),
    (r"/user\s+set.*disabled=no", "HIGH"),
    (r"/ip\s+service\s+set.*disabled=no", "HIGH"),
    (r"/ip\s+firewall\s+filter\s+remove", "HIGH"),
    (r"/ip\s+firewall\s+nat\s+remove", "HIGH"),
    (r"/interface\s+bridge\s+port\s+remove", "HIGH"),
    (r"/ip\s+address\s+remove", "HIGH"),
    (r"/ip\s+route\s+remove", "HIGH"),
]


def validate_ros_script(script):
    errors = []
    warnings = []

    if not script or not script.strip():
        errors.append("El script está vacío.")
        return errors, warnings

    lines = script.splitlines()

    vlan_ids = defaultdict(list)
    interfaces = set()
    pools = set()
    dhcp_servers = set()
    networks = []

    highest_risk = "low"

    risk_order = {
        "low": 0,
        "medium": 1,
        "high": 2,
        "critical": 3,
    }

    def raise_risk(level):
        nonlocal highest_risk

        if risk_order[level.lower()] > risk_order[highest_risk]:
            highest_risk = level.lower()

    for number, raw_line in enumerate(lines, start=1):
        command = raw_line.strip()

        if not command or command.startswith("#"):
            continue

        if not command.startswith("/"):
            warnings.append(
                f"Línea {number}: no parece un comando RouterOS absoluto."
            )
            raise_risk("medium")

        # -----------------------------------------
        # COMANDOS PELIGROSOS
        # -----------------------------------------

        for pattern, level in DANGEROUS_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                message = (
                    f"Línea {number}: comando potencialmente peligroso "
                    f"(riesgo {level})."
                )

                if level == "CRITICAL":
                    errors.append(message)
                    raise_risk("critical")
                else:
                    warnings.append(message)
                    raise_risk(level)

        # -----------------------------------------
        # VLAN
        # -----------------------------------------

        vlan_match = re.search(
            r"\bvlan-id\s*=\s*(\d+)",
            command,
            re.IGNORECASE,
        )

        if vlan_match:
            vlan_id = int(vlan_match.group(1))

            if not 1 <= vlan_id <= 4094:
                errors.append(
                    f"Línea {number}: VLAN ID fuera de rango: {vlan_id}"
                )
                raise_risk("high")
            else:
                vlan_ids[vlan_id].append(number)

        # -----------------------------------------
        # INTERFACES
        # -----------------------------------------

        name_match = re.search(
            r"\bname=([^\s]+)",
            command,
            re.IGNORECASE,
        )

        if name_match:
            interfaces.add(name_match.group(1).strip('"'))

        # -----------------------------------------
        # DHCP POOLS
        # -----------------------------------------

        pool_match = re.search(
            r"/ip\s+pool\s+add.*\bname=([^\s]+)",
            command,
            re.IGNORECASE,
        )

        if pool_match:
            pools.add(pool_match.group(1).strip('"'))

        # -----------------------------------------
        # DHCP SERVER
        # -----------------------------------------

        dhcp_match = re.search(
            r"/ip\s+dhcp-server\s+add.*\bname=([^\s]+)",
            command,
            re.IGNORECASE,
        )

        if dhcp_match:
            dhcp_servers.add(
                dhcp_match.group(1).strip('"')
            )

        # -----------------------------------------
        # IP / NETWORK
        # -----------------------------------------

        for match in re.finditer(
            r"\baddress=(\d{1,3}(?:\.\d{1,3}){3}/\d{1,2})",
            command,
            re.IGNORECASE,
        ):
            networks.append(
                (number, match.group(1))
            )

        # -----------------------------------------
        # NAT
        # -----------------------------------------

        if re.search(
            r"/ip\s+firewall\s+nat\s+add",
            command,
            re.IGNORECASE,
        ):
            if not re.search(
                r"\bout-interface=",
                command,
                re.IGNORECASE,
            ) and not re.search(
                r"\bto-addresses=",
                command,
                re.IGNORECASE,
            ):
                warnings.append(
                    f"Línea {number}: regla NAT sin "
                    f"out-interface o to-addresses."
                )
                raise_risk("medium")

        # -----------------------------------------
        # OSPF
        # -----------------------------------------

        if re.search(
            r"/routing\s+ospf",
            command,
            re.IGNORECASE,
        ):
            if "router-id=" in command.lower():
                router_id = re.search(
                    r"\brouter-id=([^\s]+)",
                    command,
                    re.IGNORECASE,
                )

                if router_id:
                    value = router_id.group(1)

                    if not re.fullmatch(
                        r"\d{1,3}(?:\.\d{1,3}){3}",
                        value,
                    ):
                        errors.append(
                            f"Línea {number}: Router ID inválido: {value}"
                        )
                        raise_risk("high")

        # -----------------------------------------
        # BGP
        # -----------------------------------------

        if re.search(
            r"/routing\s+bgp",
            command,
            re.IGNORECASE,
        ):
            if re.search(
                r"\bas=\D",
                command,
                re.IGNORECASE,
            ):
                errors.append(
                    f"Línea {number}: ASN BGP inválido."
                )
                raise_risk("high")

        # -----------------------------------------
        # WIREGUARD
        # -----------------------------------------

        if re.search(
            r"/interface\s+wireguard\s+add",
            command,
            re.IGNORECASE,
        ):
            port_match = re.search(
                r"\blisten-port=(\d+)",
                command,
                re.IGNORECASE,
            )

            if port_match:
                port = int(port_match.group(1))

                if not 1 <= port <= 65535:
                    errors.append(
                        f"Línea {number}: puerto WireGuard fuera de rango: {port}"
                    )
                    raise_risk("high")

    # -----------------------------------------
    # VLAN DUPLICADAS
    # -----------------------------------------

    for vlan_id, line_numbers in vlan_ids.items():
        if len(line_numbers) > 1:
            warnings.append(
                f"VLAN ID {vlan_id} utilizado en múltiples "
                f"interfaces (líneas {', '.join(map(str, line_numbers))})."
            )
            raise_risk("medium")

    # -----------------------------------------
    # RESUMEN DE RIESGO
    # -----------------------------------------

    if errors and highest_risk == "low":
        highest_risk = "high"

    return errors, warnings, highest_risk
