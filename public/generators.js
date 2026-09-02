/*
=====================================================
 MIKROTIK MANAGER
 MOTOR DE GENERACIÓN ROUTEROS
=====================================================
*/

function ros(v) {
  return String(v ?? "")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function val(id) {
  const el = document.getElementById("f-" + id);
  return el ? el.value.trim() : "";
}

function yes(id) {
  return val(id) === "yes";
}

function lines(...items) {
  return items.filter(Boolean).join("\n");
}

/* ===================================================
   WAN
=================================================== */

function genWAN() {
  const mode = val("mode");
  const iface = ros(val("iface"));

  if (!iface) return "";

  if (mode === "dhcp") {
    return lines(
      `/ip dhcp-client add interface=${iface} disabled=no comment="MG WAN DHCP"`
    );
  }

  if (mode === "static") {
    const address = ros(val("address"));
    const gateway = ros(val("gateway"));

    if (!address || !gateway) return "";

    return lines(
      `/ip address add address=${address} interface=${iface} comment="MG WAN"`,
      `/ip route add dst-address=0.0.0.0/0 gateway=${gateway} comment="MG WAN default"`
    );
  }

  if (mode === "pppoe") {
    const user = ros(val("pppoeUser"));
    const password = ros(val("pppoePass"));

    if (!user || !password) return "";

    return lines(
      `/interface pppoe-client add name=pppoe-out1 interface=${iface} user="${user}" password="${password}" disabled=no comment="MG PPPoE"`
    );
  }

  return "";
}

/* ===================================================
   LAN
=================================================== */

function genLAN() {
  const bridge = ros(val("bridge"));
  const address = ros(val("address"));

  if (!bridge || !address) return "";

  let s = lines(
    `/ip address add address=${address} interface=${bridge} comment="MG LAN"`
  );

  if (yes("dhcp")) {
    const pool = ros(val("pool"));
    const dns = ros(val("dns"));

    if (!pool) return s;

    const network = address.replace(/\/\d+$/, "");
    const parts = network.split(".");

    if (parts.length !== 4) return s;

    parts[3] = "0";

    const cidr = address.match(/\/\d+$/)?.[0] || "/24";
    const networkAddress = parts.join(".") + cidr;
    const gateway = address.split("/")[0];

    s += "\n" + lines(
      `/ip pool add name=pool-lan ranges=${pool} comment="MG LAN DHCP"`,
      `/ip dhcp-server add name=dhcp1 interface=${bridge} address-pool=pool-lan disabled=no`,
      `/ip dhcp-server network add address=${networkAddress} gateway=${gateway} dns-server=${dns}`
    );
  }

  return s;
}

/* ===================================================
   BRIDGE
=================================================== */

function genBridge() {
  const name = ros(val("name"));
  const protocol = val("protocol");
  const vlanFiltering = val("vlanFiltering");

  if (!name) return "";

  let s = `/interface bridge add name=${name} protocol-mode=${protocol}`;

  if (vlanFiltering === "yes") {
    s += " vlan-filtering=yes";
  }

  const comment = ros(val("comment"));

  if (comment) {
    s += ` comment="${comment}"`;
  }

  return s;
}

/* ===================================================
   VLAN
=================================================== */

function genVLAN() {
  const bridge = ros(val("bridge"));
  const name = ros(val("name"));
  const id = val("id");
  const address = ros(val("address"));

  if (!bridge || !name || !id) return "";

  let s = lines(
    `/interface vlan add name=${name} vlan-id=${id} interface=${bridge} comment="MG VLAN ${id}"`
  );

  if (address) {
    s += `\n/ip address add address=${address} interface=${name} comment="MG VLAN ${id}"`;
  }

  if (val("filter") === "yes") {
    s += `\n/interface bridge set [find name=${bridge}] vlan-filtering=yes`;
  }

  return s;
}

/* ===================================================
   DHCP SERVER
=================================================== */

function genDHCPServer() {
  const name = ros(val("name"));
  const iface = ros(val("interface"));
  const poolName = ros(val("poolName"));
  const range = ros(val("poolRange"));
  const network = ros(val("network"));
  const gateway = ros(val("gateway"));
  const dns = ros(val("dns"));
  const lease = ros(val("lease"));

  if (!name || !iface || !poolName || !range || !network || !gateway) {
    return "";
  }

  return lines(
    `/ip pool add name=${poolName} ranges=${range} comment="MG DHCP"`,
    `/ip dhcp-server add name=${name} interface=${iface} address-pool=${poolName} lease-time=${lease} disabled=no`,
    `/ip dhcp-server network add address=${network} gateway=${gateway} dns-server=${dns}`
  );
}

/* ===================================================
   DHCP CLIENT
=================================================== */

function genDHCPClient() {
  const iface = ros(val("interface"));

  if (!iface) return "";

  return `/ip dhcp-client add interface=${iface} add-default-route=${val("defaultRoute")} use-peer-dns=${val("usePeerDNS")} use-peer-ntp=${val("usePeerNTP")} disabled=no comment="${ros(val("comment"))}"`;
}

/* ===================================================
   DNS
=================================================== */

function genDNS() {
  const servers = ros(val("servers"));
  const remote = val("remote");
  const cache = ros(val("cacheSize"));

  let s = `/ip dns set servers=${servers} allow-remote-requests=${remote === "yes" ? "yes" : "no"}`;

  if (cache) {
    s += ` cache-size=${cache}`;
  }

  return s;
}

/* ===================================================
   FIREWALL
=================================================== */

function genFirewall() {
  const wan = ros(val("wan"));

  let s = "";

  if (yes("established")) {
    s += `/ip firewall filter add chain=input connection-state=established,related action=accept comment="MG INPUT established"\n`;
    s += `/ip firewall filter add chain=forward connection-state=established,related action=accept comment="MG FORWARD established"\n`;
  }

  if (yes("dropInvalid")) {
    s += `/ip firewall filter add chain=input connection-state=invalid action=drop comment="MG INPUT invalid"\n`;
    s += `/ip firewall filter add chain=forward connection-state=invalid action=drop comment="MG FORWARD invalid"\n`;
  }

  if (yes("allowPing")) {
    s += `/ip firewall filter add chain=input protocol=icmp action=accept comment="MG ICMP"\n`;
  }

  if (wan) {
    s += `/ip firewall filter add chain=input in-interface=${wan} action=drop comment="MG DROP WAN INPUT"\n`;
  }

  return s.trim();
}

/* ===================================================
   ADDRESS LIST
=================================================== */

function genAddressList() {
  const list = ros(val("list"));
  const address = ros(val("address"));
  const comment = ros(val("comment"));

  if (!list || !address) return "";

  return `/ip firewall address-list add list=${list} address=${address} comment="${comment}"`;
}

/* ===================================================
   NAT
=================================================== */

function genNAT() {
  const type = val("type");
  const out = ros(val("out"));
  const src = ros(val("src"));
  const to = ros(val("to"));
  const port = val("port");

  if (type === "masq") {
    return `/ip firewall nat add chain=srcnat src-address=${src} out-interface=${out} action=masquerade comment="MG MASQUERADE"`;
  }

  if (type === "src") {
    return `/ip firewall nat add chain=srcnat src-address=${src} out-interface=${out} action=src-nat to-addresses=${to} comment="MG SRC-NAT"`;
  }

  if (type === "dst") {
    if (!to || !port) return "";

    return `/ip firewall nat add chain=dstnat protocol=tcp dst-port=${port} action=dst-nat to-addresses=${to} comment="MG DST-NAT"`;
  }

  return "";
}

/* ===================================================
   SERVICES
=================================================== */

function genServices() {
  const cmds = [];

  cmds.push(
    `/ip service set ssh disabled=${yes("ssh") ? "no" : "yes"} port=${val("sshPort")}`
  );

  cmds.push(
    `/ip service set winbox disabled=${yes("winbox") ? "no" : "yes"} port=${val("winboxPort")}`
  );

  cmds.push(
    `/ip service set api disabled=${yes("api") ? "no" : "yes"} port=${val("apiPort")}`
  );

  cmds.push(
    `/ip service set www disabled=${yes("www") ? "no" : "yes"} port=${val("wwwPort")}`
  );

  cmds.push(
    `/ip service set www-ssl disabled=${yes("wwwSsl") ? "no" : "yes"} port=${val("wwwSslPort")}`
  );

  return cmds.join("\n");
}

/* ===================================================
   USERS
=================================================== */

function genUsers() {
  const name = ros(val("name"));
  const password = ros(val("password"));
  const group = val("group");
  const comment = ros(val("comment"));

  if (!name || !password) return "";

  return `/user add name="${name}" password="${password}" group=${group} comment="${comment}"`;
}

/* ===================================================
   LOGGING
=================================================== */

function genLogging() {
  const topic = val("topic");
  const action = val("action");
  const prefix = ros(val("prefix"));

  return `/system logging add topics=${topic} action=${action} prefix="${prefix}"`;
}

/* ===================================================
   ROUTES
=================================================== */

function genRoutes() {
  const dst = ros(val("dst"));
  const gateway = ros(val("gateway"));
  const distance = val("distance");
  const table = ros(val("routingTable"));
  const comment = ros(val("comment"));

  if (!dst || !gateway) return "";

  return `/ip route add dst-address=${dst} gateway=${gateway} distance=${distance} routing-table=${table} comment="${comment}"`;
}

/* ===================================================
   FAILOVER
=================================================== */

function genFailover() {
  const count = parseInt(val("count"), 10) || 2;
  const check = val("check");

  const checkGateway = check === "ping"
    ? " check-gateway=ping"
    : "";

  const isps = [];

  for (let i = 1; i <= count && i <= 6; i++) {
    const iface = ros(val(`isp${i}`));
    const gateway = ros(val(`gw${i}`));
    const distance = val(`distance${i}`);

    if (iface && gateway && distance) {
      isps.push({
        iface,
        gateway,
        distance
      });
    }
  }

  if (isps.length < 2) {
    return "# Debes completar al menos 2 ISP.";
  }

  return isps.map((isp, index) =>
    `/ip route add dst-address=0.0.0.0/0 gateway=${isp.gateway}${checkGateway} distance=${isp.distance} comment="MG ISP${index + 1}"`
  ).join("\n");
}

/* ===================================================
   POLICY ROUTING
=================================================== */

function genPolicyRouting() {
  const table = ros(val("table"));
  const gateway = ros(val("gateway"));
  const src = ros(val("src"));
  const comment = ros(val("comment"));

  if (!table || !gateway || !src) return "";

  return lines(
    `/routing table add name=${table} fib`,
    `/ip route add dst-address=0.0.0.0/0 gateway=${gateway} routing-table=${table} comment="${comment}"`,
    `/routing rule add src-address=${src} action=lookup-only-in-table table=${table} comment="${comment}"`
  );
}

/* ===================================================
   OSPF
=================================================== */

function genOSPF() {
  const routerId = ros(val("routerId"));
  const area = ros(val("area"));
  const network = ros(val("network"));
  const cost = val("cost");
  const redistribute = val("redistribute");

  let s = lines(
    `/routing ospf instance add name=ospf-main router-id=${routerId}`,
    `/routing ospf area add name=backbone area-id=${area} instance=ospf-main`,
    `/routing ospf interface-template add area=backbone networks=${network} cost=${cost}`
  );

  if (redistribute !== "none") {
    s += `\n/routing ospf instance set [find name=ospf-main] redistribute=${redistribute}`;
  }

  return s;
}

/* ===================================================
   BGP
=================================================== */

function genBGP() {
  const localAs = val("localAs");
  const remoteAs = val("remoteAs");
  const remote = ros(val("remote"));
  const routerId = ros(val("routerId"));
  const network = ros(val("network"));

  if (!localAs || !remoteAs || !remote) return "";

  return lines(
    `/routing bgp template add name=bgp-template as=${localAs} router-id=${routerId}`,
    `/routing bgp connection add name=peer1 local.role=ebgp local.as=${localAs} remote.address=${remote} remote.as=${remoteAs}`,
    `/ip route add dst-address=${network} type=blackhole comment="MG BGP announcement"`
  );
}

/* ===================================================
   RIP
=================================================== */

function genRIP() {
  return lines(
    `/routing rip instance add name=rip1`,
    `/routing rip interface-template add instance=rip1 interfaces=all`
  );
}

/* ===================================================
   VRF
=================================================== */

function genVRF() {
  const name = ros(val("name"));
  const interfaces = ros(val("interfaces"));
  const comment = ros(val("comment"));

  if (!name) return "";

  return `/ip vrf add name=${name} interfaces=${interfaces} comment="${comment}"`;
}

/* ===================================================
   WIREGUARD
=================================================== */

function genVPN() {
  const type = val("type");
  const name = ros(val("name"));
  const address = ros(val("address"));
  const listen = val("listen");

  if (type === "wireguard") {
    return lines(
      `/interface wireguard add name=${name} listen-port=${listen} comment="MG WireGuard"`,
      `/ip address add address=${address} interface=${name} comment="MG WireGuard"`
    );
  }

  return lines(
    `/ip ipsec profile add name=${name}`,
    `/ip ipsec peer add name=peer1 address=0.0.0.0/0 profile=${name} exchange-mode=ike2`
  );
}

/* ===================================================
   WIREGUARD PEER
=================================================== */

function genWireguardPeer() {
  const iface = ros(val("interface"));
  const name = ros(val("name"));
  const publicKey = ros(val("publicKey"));
  const allowed = ros(val("allowed"));
  const endpoint = ros(val("endpoint"));
  const keepalive = val("keepalive");

  if (!iface || !name || !publicKey || !allowed) return "";

  let s =
    `/interface wireguard peers add interface=${iface} name=${name} public-key="${publicKey}" allowed-address=${allowed}`;

  if (endpoint) {
    s += ` endpoint-address=${endpoint.split(":")[0]}`;
  }

  if (endpoint.includes(":")) {
    s += ` endpoint-port=${endpoint.split(":").pop()}`;
  }

  if (keepalive) {
    s += ` persistent-keepalive=${keepalive}`;
  }

  return s;
}

/* ===================================================
   IPSEC
=================================================== */

function genIPsec() {
  const profile = ros(val("profile"));
  const peer = ros(val("peer"));
  const remote = ros(val("remote"));
  const secret = ros(val("secret"));
  const exchange = val("exchange");

  return lines(
    `/ip ipsec profile add name=${profile}`,
    `/ip ipsec peer add name=${peer} address=${remote} profile=${profile} exchange-mode=${exchange}`,
    `/ip ipsec identity add peer=${peer} auth-method=pre-shared-key secret="${secret}"`
  );
}

/* ===================================================
   PPPoE SERVER
=================================================== */

function genPPPoE() {
  const iface = ros(val("iface"));
  const service = ros(val("service"));
  const local = ros(val("local"));
  const pool = ros(val("pool"));
  const user = ros(val("user"));

  return lines(
    `/ip pool add name=${pool} ranges=${pool} comment="MG PPPoE"`,
    `/ppp profile add name=${service} local-address=${local} remote-address=${pool}`,
    `/interface pppoe-server server add interface=${iface} service-name=${service} disabled=no`,
    user
      ? `/ppp secret add name=${user} password=CHANGE-ME service=pppoe profile=${service}`
      : ""
  );
}

/* ===================================================
   PPP PROFILE
=================================================== */

function genPPPoEProfile() {
  const name = ros(val("name"));
  const local = ros(val("local"));
  const remote = ros(val("remote"));
  const rate = ros(val("rate"));
  const dns = ros(val("dns"));

  return `/ppp profile add name=${name} local-address=${local} remote-address=${remote} rate-limit=${rate} dns-server=${dns}`;
}

/* ===================================================
   PPP USER
=================================================== */

function genPPPoEUser() {
  const name = ros(val("name"));
  const password = ros(val("password"));
  const profile = ros(val("profile"));
  const service = val("service");
  const comment = ros(val("comment"));

  if (!name || !password) return "";

  return `/ppp secret add name="${name}" password="${password}" profile=${profile} service=${service} comment="${comment}"`;
}

/* ===================================================
   IP POOL
=================================================== */

function genIPPool() {
  const name = ros(val("name"));
  const ranges = ros(val("ranges"));
  const comment = ros(val("comment"));

  return `/ip pool add name=${name} ranges=${ranges} comment="${comment}"`;
}

/* ===================================================
   SIMPLE QUEUE
=================================================== */

function genQoS() {
  const target = ros(val("target"));
  const name = ros(val("name"));
  const max = ros(val("max"));
  const priority = val("priority");

  return `/queue simple add name="${name}" target=${target} max-limit=${max} priority=${priority}/${priority} comment="MG QoS"`;
}

/* ===================================================
   PCQ
=================================================== */

function genPCQ() {
  const name = ros(val("name"));
  const kind = val("kind");
  const rate = ros(val("rate"));
  const classifier = val("classifier");

  return `/queue type add name=${name} kind=${kind} pcq-rate=${rate} pcq-classifier=${classifier}`;
}

/* ===================================================
   QUEUE TREE
=================================================== */

function genQueueTree() {
  const name = ros(val("name"));
  const parent = ros(val("parent"));
  const packetMark = ros(val("packetMark"));
  const max = ros(val("max"));
  const priority = val("priority");

  return `/queue tree add name=${name} parent=${parent} packet-mark=${packetMark} max-limit=${max} priority=${priority}`;
}

/* ===================================================
   WIFI
=================================================== */

function genWiFi() {
  const iface = ros(val("iface"));
  const ssid = ros(val("ssid"));
  const country = ros(val("country"));
  const password = ros(val("password"));
  const mode = val("mode");

  return `/interface wifi set [find default-name=${iface}] configuration.mode=${mode} configuration.ssid="${ssid}" configuration.country=${country} security.authentication-types=wpa2-psk security.passphrase="${password}"`;
}

/* ===================================================
   WIFI STATION
=================================================== */

function genWiFiStation() {
  const iface = ros(val("iface"));
  const ssid = ros(val("ssid"));
  const password = ros(val("password"));
  const country = ros(val("country"));

  return `/interface wifi set [find default-name=${iface}] configuration.mode=station configuration.ssid="${ssid}" configuration.country=${country} security.authentication-types=wpa2-psk security.passphrase="${password}"`;
}

/* ===================================================
   CAPSMAN
=================================================== */

function genCAPsMAN() {
  const name = ros(val("name"));
  const ssid = ros(val("ssid"));
  const country = ros(val("country"));
  const security = ros(val("security"));

  return lines(
    `/interface wifi configuration add name=${name} ssid="${ssid}" country=${country} security=${security}`,
    `/interface wifi provisioning add action=create-dynamic-enabled master-configuration=${name}`
  );
}

/* ===================================================
   NTP
=================================================== */

function genNTP() {
  const server = ros(val("server"));
  const timezone = ros(val("timezone"));

  return lines(
    `/system clock set time-zone-name=${timezone}`,
    `/system ntp client set enabled=yes`,
    `/system ntp client servers add address=${server}`
  );
}

/* ===================================================
   SNMP
=================================================== */

function genSNMP() {
  const enabled = val("enabled");
  const community = ros(val("community"));
  const contact = ros(val("contact"));
  const location = ros(val("location"));

  return `/snmp set enabled=${enabled === "yes" ? "yes" : "no"} contact="${contact}" location="${location}" trap-community=${community}`;
}

/* ===================================================
   SCHEDULER
=================================================== */

function genScheduler() {
  const name = ros(val("name"));
  const interval = ros(val("interval"));
  const start = ros(val("start"));
  const event = ros(val("onEvent"));

  return `/system scheduler add name=${name} interval=${interval} start-time=${start} on-event="${event}" comment="MG Scheduler"`;
}

/* ===================================================
   BACKUP
=================================================== */

function genBackup() {
  const name = ros(val("name"));
  const password = ros(val("password"));
  const type = val("type");

  if (type === "export") {
    return `/export file=${name}`;
  }

  if (password) {
    return `/system backup save name=${name} password="${password}"`;
  }

  return `/system backup save name=${name}`;
}

/* ===================================================
   SYSTEM
=================================================== */

function genSystem() {
  const identity = ros(val("identity"));
  const timezone = ros(val("timezone"));
  const backup = ros(val("backupName"));

  return lines(
    `/system identity set name="${identity}"`,
    `/system clock set time-zone-name=${timezone}`,
    `/system backup save name=${backup}`
  );
}

/* ===================================================
   REGISTRO DE GENERADORES
=================================================== */

const GENERATORS = {
  wan: genWAN,
  lan: genLAN,
  bridge: genBridge,
  vlan: genVLAN,
  "dhcp-server": genDHCPServer,
  "dhcp-client": genDHCPClient,
  dns: genDNS,
  firewall: genFirewall,
  "address-list": genAddressList,
  nat: genNAT,
  services: genServices,
  users: genUsers,
  logging: genLogging,
  routes: genRoutes,
  failover: genFailover,
  "policy-routing": genPolicyRouting,
  ospf: genOSPF,
  bgp: genBGP,
  rip: genRIP,
  vrf: genVRF,
  vpn: genVPN,
  "wireguard-peer": genWireguardPeer,
  ipsec: genIPsec,
  pppoe: genPPPoE,
  "pppoe-profile": genPPPoEProfile,
  "pppoe-user": genPPPoEUser,
  "ip-pool": genIPPool,
  qos: genQoS,
  pcq: genPCQ,
  "queue-tree": genQueueTree,
  wifi: genWiFi,
  "wifi-station": genWiFiStation,
  capsman: genCAPsMAN,
  ntp: genNTP,
  snmp: genSNMP,
  scheduler: genScheduler,
  backup: genBackup,
  system: genSystem
};

function generateByCategory(category) {
  const generator = GENERATORS[category];

  if (typeof generator !== "function") {
    return "# Generador no implementado para: " + category;
  }

  try {
    return generator() || "# Completa los parámetros requeridos.";
  } catch (error) {
    console.error("Generator error:", error);
    return "# Error generando configuración: " + error.message;
  }
}
