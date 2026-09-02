# MikroTik Manager - Script Builder v3

Generador visual de scripts RouterOS con fichas:
WAN, LAN, VLAN, Firewall, NAT, OSPF, BGP, RIP, VPN, PPPoE, QoS, Wi-Fi, Servicios y Sistema.

Incluye:
- Formularios por categoría.
- Generación de scripts `.rsc`.
- Vista previa.
- Copiar/descargar script.
- Aplicación remota a un MikroTik mediante el backend RouterOS API.
- Backup previo opcional.
- Confirmación antes de cambios.
- Auditoría.

Nota: EIGRP no se incluye porque RouterOS no implementa EIGRP. OSPF/BGP/RIP sí pueden configurarse, pero los comandos concretos dependen de la versión de RouterOS. Las plantillas deben probarse en laboratorio antes de producción.

Seguridad: usar HTTPS, API-SSL/VPN, autenticación/RBAC, cifrado de credenciales y políticas de aprobación antes de exponerlo a Internet.
