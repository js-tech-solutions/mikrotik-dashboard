import json
import sys

from .rules import (
    validate_ip,
    validate_network,
    validate_port,
    validate_vlan_id,
    validate_asn,
    validate_router_id,
    validate_distance,
    validate_name,
)

from .ros import validate_ros_script


def calculate_risk(errors, warnings):
    text = " ".join(errors + warnings).lower()

    if any(
        word in text
        for word in [
            "reset-configuration",
            "borrar",
            "eliminación",
            "reset",
        ]
    ):
        return "critical"

    if errors:
        return "high"

    if warnings:
        return "medium"

    return "low"


def max_risk(first, second):
    order = {
        "low": 0,
        "medium": 1,
        "high": 2,
        "critical": 3,
    }

    first = first.lower()
    second = second.lower()

    return first if order[first] >= order[second] else second


def validate(payload):
    errors = []
    warnings = []

    category = payload.get("category", "")
    values = payload.get("values", {})
    script = payload.get("script", "")

    validators = {
        "ip": validate_ip,
        "network": validate_network,
        "port": validate_port,
        "vlan": validate_vlan_id,
        "asn": validate_asn,
        "router_id": validate_router_id,
        "distance": validate_distance,
        "name": validate_name,
    }

    for field, validator_name in payload.get("fields", {}).items():

        value = values.get(field, "")

        if not value:
            errors.append(
                f"Campo requerido: {field}"
            )
            continue

        validator = validators.get(validator_name)

        if validator:

            if validator_name == "name":
                error = validator(
                    value,
                    field
                )
            else:
                error = validator(value)

            if error:
                errors.append(error)

    ros_errors, ros_warnings, ros_risk = validate_ros_script(
        script
    )

    for error in ros_errors:
        normalized = error

        if normalized.startswith("Línea "):
            normalized = normalized.split(": ", 1)[-1]

        elif normalized.startswith("Linea "):
            normalized = normalized.split(": ", 1)[-1]

        if normalized not in errors:
            errors.append(error)

    for warning in ros_warnings:
        if warning not in warnings:
            warnings.append(warning)

    return {
        "valid": len(errors) == 0,
        "category": category,
        "risk": max_risk(
            calculate_risk(errors, warnings),
            ros_risk
        ),
        "errors": errors,
        "warnings": warnings,
    }


def main():
    try:

        payload = json.load(sys.stdin)

        result = validate(payload)

        print(
            json.dumps(
                result,
                ensure_ascii=False
            )
        )

    except Exception as error:

        print(
            json.dumps(
                {
                    "valid": False,
                    "risk": "critical",
                    "errors": [
                        str(error)
                    ],
                    "warnings": [],
                },
                ensure_ascii=False,
            )
        )

        sys.exit(1)


if __name__ == "__main__":
    main()
