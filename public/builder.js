const CATEGORIES=[
{id:"wan",name:"WAN",icon:"🌐",desc:"Conectividad de salida y enlaces WAN",
fields:[
["mode","Modo","select","dhcp|DHCP Client,static|IP estática,pppoe|PPPoE Client","dhcp"],
["iface","Interfaz WAN","text","ether1","ether1"],
["address","Dirección IP","text","203.0.113.2/30",""],
["gateway","Gateway","text","203.0.113.1",""],
["pppoeUser","PPPoE usuario","text","usuario",""],
["pppoePass","PPPoE contraseña","password","••••",""]
]},

{id:"lan",name:"LAN",icon:"🏠",desc:"Bridge, direccionamiento y DHCP",
fields:[
["bridge","Bridge","text","bridge-LAN","bridge-LAN"],
["address","IP LAN","text","192.168.88.1/24","192.168.88.1/24"],
["dhcp","DHCP","select","yes|Activar,no|No crear","yes"],
["pool","Pool DHCP","text","192.168.88.10-192.168.88.254","192.168.88.10-192.168.88.254"],
["dns","DNS","text","1.1.1.1,8.8.8.8","1.1.1.1,8.8.8.8"]
]},

{id:"bridge",name:"Bridge",icon:"🔗",desc:"Creación y configuración de bridges",
fields:[
["name","Nombre Bridge","text","bridge","bridge"],
["protocol","Protocol Mode","select","rstp|RSTP,stp|STP,none|None","rstp"],
["vlanFiltering","VLAN Filtering","select","yes|Activar,no|Desactivar","no"],
["comment","Comentario","text","LAN Bridge","LAN Bridge"]
]},

{id:"vlan",name:"VLAN",icon:"🔀",desc:"VLAN access, trunk y routing inter-VLAN",
fields:[
["bridge","Bridge","text","bridge-LAN","bridge-LAN"],
["name","Nombre VLAN","text","vlan10","vlan10"],
["id","VLAN ID","number","10","10"],
["address","IP gateway","text","10.10.10.1/24","10.10.10.1/24"],
["filter","Bridge VLAN filtering","select","yes|Activar,no|No tocar","yes"]
]},

{id:"dhcp-server",name:"DHCP Server",icon:"📡",desc:"Servidor DHCP para redes LAN y VLAN",
fields:[
["name","Nombre DHCP","text","dhcp1","dhcp1"],
["interface","Interfaz","text","bridge","bridge"],
["poolName","Nombre Pool","text","pool-lan","pool-lan"],
["poolRange","Rango DHCP","text","192.168.88.10-192.168.88.254","192.168.88.10-192.168.88.254"],
["network","Red","text","192.168.88.0/24","192.168.88.0/24"],
["gateway","Gateway","text","192.168.88.1","192.168.88.1"],
["dns","DNS","text","1.1.1.1,8.8.8.8","1.1.1.1,8.8.8.8"],
["lease","Lease Time","text","1d","1d"]
]},

{id:"dhcp-client",name:"DHCP Client",icon:"📥",desc:"Obtener dirección IP automáticamente",
fields:[
["interface","Interfaz WAN","text","ether1","ether1"],
["defaultRoute","Default Route","select","yes|Sí,no|No","yes"],
["usePeerDNS","Use Peer DNS","select","yes|Sí,no|No","no"],
["usePeerNTP","Use Peer NTP","select","yes|Sí,no|No","no"],
["comment","Comentario","text","WAN DHCP","WAN DHCP"]
]},

{id:"dns",name:"DNS",icon:"🌎",desc:"Configuración del servicio DNS RouterOS",
fields:[
["servers","Servidores DNS","text","1.1.1.1,8.8.8.8","1.1.1.1,8.8.8.8"],
["remote","Permitir consultas remotas","select","yes|Sí,no|No","yes"],
["cacheSize","Cache Size","text","2048KiB","2048KiB"]
]},

{id:"ipv6",name:"IPv6",icon:"🌐",desc:"Direccionamiento y configuración IPv6",
fields:[
["address","Dirección IPv6","text","2001:db8:1::1/64","2001:db8:1::1/64"],
["interface","Interfaz","text","bridge","bridge"],
["route","Gateway IPv6","text","2001:db8:1::ffff",""],
["comment","Comentario","text","IPv6 LAN","IPv6 LAN"]
]},

{id:"firewall",name:"Firewall",icon:"🛡️",desc:"Protección input/forward/output",
fields:[
["policy","Perfil","select","secure|Seguro,lan-wan|LAN → WAN,custom|Personalizado","secure"],
["wan","WAN interface","text","ether1","ether1"],
["allowPing","Permitir ICMP","select","yes|Sí,no|No","yes"],
["established","Permitir established/related","select","yes|Sí,no|No","yes"],
["dropInvalid","Bloquear invalid","select","yes|Sí,no|No","yes"]
]},

{id:"address-list",name:"Address Lists",icon:"📋",desc:"Listas de direcciones para firewall y políticas",
fields:[
["list","Nombre lista","text","allowed-management","allowed-management"],
["address","Dirección","text","192.168.88.0/24","192.168.88.0/24"],
["comment","Comentario","text","Red de administración","Red de administración"]
]},

{id:"nat",name:"NAT",icon:"↔️",desc:"Masquerade, src-nat y dst-nat",
fields:[
["type","Tipo","select","masq|Masquerade,src|src-nat,dst|dst-nat","masq"],
["out","WAN interface","text","ether1","ether1"],
["src","Red origen","text","192.168.88.0/24","192.168.88.0/24"],
["to","IP destino / to-addresses","text","203.0.113.10",""],
["port","Puerto","number","443","443"]
]},

{id:"services",name:"Servicios RouterOS",icon:"⚙️",desc:"Administración de servicios y puertos",
fields:[
["ssh","SSH","select","yes|Activar,no|Desactivar","yes"],
["sshPort","Puerto SSH","number","22","22"],
["winbox","Winbox","select","yes|Activar,no|Desactivar","yes"],
["winboxPort","Puerto Winbox","number","8291","8291"],
["api","API","select","yes|Activar,no|Desactivar","yes"],
["apiPort","Puerto API","number","8728","8728"],
["www","HTTP","select","yes|Activar,no|Desactivar","no"],
["wwwPort","Puerto HTTP","number","80","80"],
["wwwSsl","HTTPS","select","yes|Activar,no|Desactivar","yes"],
["wwwSslPort","Puerto HTTPS","number","443","443"]
]},

{id:"users",name:"Usuarios",icon:"👤",desc:"Usuarios locales y permisos RouterOS",
fields:[
["name","Usuario","text","nocadmin","nocadmin"],
["password","Contraseña","password","••••••••",""],
["group","Grupo","select","full|Full,read|Read,write|Write","full"],
["comment","Comentario","text","Administrador NOC","Administrador NOC"]
]},

{id:"logging",name:"Logging",icon:"📝",desc:"Configuración de registros RouterOS",
fields:[
["topic","Topic","select","system|System,info|Info,warning|Warning,error|Error,firewall|Firewall","system"],
["action","Action","select","memory|Memory,disk|Disk,remote|Remote","memory"],
["prefix","Prefix","text","MANAGER","MANAGER"]
]},

{id:"routes",name:"Static Routes",icon:"🛣️",desc:"Rutas estáticas IPv4",
fields:[
["dst","Red destino","text","10.10.20.0/24","10.10.20.0/24"],
["gateway","Gateway","text","192.168.88.254","192.168.88.254"],
["distance","Distance","number","1","1"],
["routingTable","Routing Table","text","main","main"],
["comment","Comentario","text","Ruta estática","Ruta estática"]
]},

{id:"failover",name:"Failover Multi-ISP",icon:"🔀",desc:"Failover automático entre múltiples proveedores",
fields:[
["count","Cantidad de ISP","select","2|2 ISP,3|3 ISP,4|4 ISP,5|5 ISP,6|6 ISP","2"],

["isp1","ISP 1 Interface","text","ether1","ether1"],
["gw1","Gateway ISP 1","text","192.168.1.1","192.168.1.1"],
["distance1","Distance ISP 1","number","1","1"],

["isp2","ISP 2 Interface","text","ether2","ether2"],
["gw2","Gateway ISP 2","text","192.168.2.1","192.168.2.1"],
["distance2","Distance ISP 2","number","2","2"],

["isp3","ISP 3 Interface","text","ether3","ether3"],
["gw3","Gateway ISP 3","text","192.168.3.1","192.168.3.1"],
["distance3","Distance ISP 3","number","3","3"],

["isp4","ISP 4 Interface","text","ether4","ether4"],
["gw4","Gateway ISP 4","text","192.168.4.1","192.168.4.1"],
["distance4","Distance ISP 4","number","4","4"],

["isp5","ISP 5 Interface","text","ether5","ether5"],
["gw5","Gateway ISP 5","text","192.168.5.1","192.168.5.1"],
["distance5","Distance ISP 5","number","5","5"],

["isp6","ISP 6 Interface","text","ether6","ether6"],
["gw6","Gateway ISP 6","text","192.168.6.1","192.168.6.1"],
["distance6","Distance ISP 6","number","6","6"],

["check","Check Gateway","select","ping|Ping,none|No check","ping"]
]},

{id:"policy-routing",name:"Policy Routing",icon:"🧭",desc:"Routing basado en reglas y tablas",
fields:[
["table","Routing Table","text","to-isp2","to-isp2"],
["gateway","Gateway","text","192.168.2.1","192.168.2.1"],
["src","Red origen","text","192.168.20.0/24","192.168.20.0/24"],
["comment","Comentario","text","Policy ISP2","Policy ISP2"]
]},

{id:"ospf",name:"OSPF",icon:"🛰️",desc:"Routing dinámico OSPF",
fields:[
["routerId","Router ID","text","10.255.255.1","10.255.255.1"],
["area","Área","text","0.0.0.0","0.0.0.0"],
["network","Red OSPF","text","10.0.0.0/24","10.0.0.0/24"],
["cost","Costo","number","10","10"],
["redistribute","Redistribuir","select","none|Ninguno,connected|Connected,static|Static","none"]
]},

{id:"bgp",name:"BGP",icon:"🌍",desc:"Routing inter-AS",
fields:[
["localAs","Local AS","number","65001","65001"],
["remoteAs","Remote AS","number","65002","65002"],
["remote","Peer IP","text","10.0.0.2","10.0.0.2"],
["routerId","Router ID","text","10.255.255.1","10.255.255.1"],
["network","Red a anunciar","text","192.168.10.0/24","192.168.10.0/24"]
]},

{id:"rip",name:"RIP",icon:"🔁",desc:"Routing RIP cuando sea requerido",
fields:[
["network","Red","text","10.0.0.0/24","10.0.0.0/24"],
["version","Versión","select","2|RIPv2,1|RIPv1","2"]
]},

{id:"vrf",name:"VRF",icon:"🧩",desc:"Virtual Routing and Forwarding",
fields:[
["name","Nombre VRF","text","vrf-corp","vrf-corp"],
["interfaces","Interfaces","text","vlan100","vlan100"],
["comment","Comentario","text","VRF corporativa","VRF corporativa"]
]},

{id:"vpn",name:"VPN",icon:"🔐",desc:"WireGuard e IPsec base",
fields:[
["type","Tipo","select","wireguard|WireGuard,ipsec|IPsec","wireguard"],
["name","Nombre","text","wg-office","wg-office"],
["address","IP túnel","text","10.200.0.1/24","10.200.0.1/24"],
["listen","Puerto","number","51820","51820"]
]},

{id:"wireguard-peer",name:"WireGuard Peer",icon:"🔑",desc:"Configuración de peers WireGuard",
fields:[
["interface","Interface WireGuard","text","wg-office","wg-office"],
["name","Nombre Peer","text","laptop01","laptop01"],
["publicKey","Public Key","text","CLAVE_PUBLICA",""],
["allowed","Allowed IPs","text","10.200.0.2/32","10.200.0.2/32"],
["endpoint","Endpoint","text","vpn.example.com:51820",""],
["keepalive","Persistent Keepalive","number","25","25"]
]},

{id:"ipsec",name:"IPsec",icon:"🔐",desc:"IPsec base para VPN site-to-site",
fields:[
["profile","Perfil","text","ipsec-profile","ipsec-profile"],
["peer","Peer","text","peer1","peer1"],
["remote","Remote Address","text","203.0.113.10","203.0.113.10"],
["secret","Pre Shared Key","password","••••••••",""],
["exchange","Exchange Mode","select","ike2|IKEv2,main|Main","ike2"]
]},

{id:"pppoe",name:"PPPoE Server",icon:"👥",desc:"Servidor, perfiles y usuarios PPPoE",
fields:[
["iface","Interfaz","text","bridge","bridge"],
["service","Servicio","text","pppoe-server","pppoe-server"],
["local","IP local","text","10.50.0.1","10.50.0.1"],
["pool","Pool","text","10.50.0.10-10.50.0.254","10.50.0.10-10.50.0.254"],
["user","Usuario ejemplo","text","cliente01","cliente01"]
]},

{id:"pppoe-profile",name:"PPPoE Profile",icon:"👥",desc:"Perfil de velocidad y direccionamiento PPP",
fields:[
["name","Nombre perfil","text","PLAN-10M","PLAN-10M"],
["local","Local Address","text","10.50.0.1","10.50.0.1"],
["remote","Remote Address / Pool","text","pool-pppoe","pool-pppoe"],
["rate","Rate Limit","text","10M/10M","10M/10M"],
["dns","DNS","text","1.1.1.1,8.8.8.8","1.1.1.1,8.8.8.8"]
]},

{id:"pppoe-user",name:"PPPoE User",icon:"👤",desc:"Creación de usuarios PPPoE",
fields:[
["name","Usuario","text","cliente01","cliente01"],
["password","Contraseña","password","••••••••",""],
["profile","Perfil","text","PLAN-10M","PLAN-10M"],
["service","Servicio","text","pppoe","pppoe"],
["comment","Comentario","text","Cliente PPPoE","Cliente PPPoE"]
]},

{id:"ip-pool",name:"IP Pool",icon:"📦",desc:"Pools de direcciones IP",
fields:[
["name","Nombre Pool","text","pool-pppoe","pool-pppoe"],
["ranges","Rango","text","10.50.0.10-10.50.0.254","10.50.0.10-10.50.0.254"],
["comment","Comentario","text","Pool de clientes","Pool de clientes"]
]},

{id:"qos",name:"Simple Queue",icon:"🚦",desc:"Limitación de ancho de banda",
fields:[
["target","IP/Red objetivo","text","192.168.88.50/32","192.168.88.50/32"],
["name","Nombre","text","cliente-01","cliente-01"],
["max","Máximo","text","10M/10M","10M/10M"],
["priority","Prioridad","number","8","8"]
]},

{id:"pcq",name:"PCQ",icon:"🚦",desc:"Per Connection Queue para distribución de ancho de banda",
fields:[
["name","Nombre Queue","text","pcq-download","pcq-download"],
["kind","Tipo","select","pcq-download|Download,pcq-upload|Upload","pcq-download"],
["rate","Rate por cliente","text","10M","10M"],
["classifier","Classifier","select","dst-address|dst-address,src-address|src-address","dst-address"]
]},

{id:"queue-tree",name:"Queue Tree",icon:"🌳",desc:"Control avanzado de tráfico",
fields:[
["name","Nombre","text","internet-download","internet-download"],
["parent","Parent","text","global","global"],
["packetMark","Packet Mark","text","download","download"],
["max","Max Limit","text","100M","100M"],
["priority","Priority","number","8","8"]
]},

{id:"wifi",name:"Wi-Fi AP",icon:"📶",desc:"SSID y seguridad inalámbrica",
fields:[
["iface","Interfaz","text","wifi1","wifi1"],
["ssid","SSID","text","MI-WIFI","MI-WIFI"],
["country","País","text","Peru","Peru"],
["password","Clave WPA2/WPA3","password","••••••••",""],
["mode","Modo","select","ap|AP,station|Station","ap"]
]},

{id:"wifi-station",name:"Wi-Fi Station",icon:"📡",desc:"Configuración de cliente inalámbrico",
fields:[
["iface","Interfaz","text","wifi1","wifi1"],
["ssid","SSID remoto","text","ISP-WIFI","ISP-WIFI"],
["password","Clave","password","••••••••",""],
["country","País","text","Peru","Peru"]
]},

{id:"capsman",name:"CAPsMAN",icon:"📡",desc:"Gestión centralizada de AP MikroTik",
fields:[
["name","Configuration","text","cfg-main","cfg-main"],
["ssid","SSID","text","MI-WIFI","MI-WIFI"],
["country","País","text","Peru","Peru"],
["security","Security","text","sec-main","sec-main"]
]},

{id:"ntp",name:"NTP",icon:"🕐",desc:"Sincronización horaria",
fields:[
["server","Servidor NTP","text","pool.ntp.org","pool.ntp.org"],
["timezone","Zona horaria","text","America/Lima","America/Lima"],
["enabled","NTP Client","select","yes|Activar,no|Desactivar","yes"]
]},

{id:"snmp",name:"SNMP",icon:"📊",desc:"Monitoreo mediante SNMP",
fields:[
["enabled","SNMP","select","yes|Activar,no|Desactivar","yes"],
["community","Community","text","public","public"],
["contact","Contact","text","NOC","NOC"],
["location","Location","text","DataCenter","DataCenter"]
]},

{id:"scheduler",name:"Scheduler",icon:"⏱️",desc:"Tareas programadas RouterOS",
fields:[
["name","Nombre","text","auto-backup","auto-backup"],
["interval","Intervalo","text","1d","1d"],
["start","Start Time","text","03:00:00","03:00:00"],
["onEvent","Script / On Event","text","/system backup save name=auto-backup","/system backup save name=auto-backup"]
]},

{id:"backup",name:"Backup",icon:"💾",desc:"Copias de seguridad RouterOS",
fields:[
["name","Nombre backup","text","manager-auto","manager-auto"],
["password","Contraseña backup","password","••••••••",""],
["type","Tipo","select","backup|Backup,export|Export","backup"]
]},

{id:"system",name:"Sistema",icon:"🖥️",desc:"Identity, usuarios, scheduler y backup",
fields:[
["identity","Identity","text","RTR-01","RTR-01"],
["timezone","Zona horaria","text","America/Lima","America/Lima"],
["backupName","Nombre backup","text","manager-auto","manager-auto"]
]}
];
let active="wan";
function esc(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderTabs(){
 $("tabs").innerHTML=CATEGORIES.map(c=>`<button class="${c.id===active?"active":""}" onclick="selectCat('${c.id}')"><span>${c.icon}</span>${c.name}</button>`).join("");
}
function selectCat(id){active=id;renderTabs();renderForm();$("script").textContent="// Completa los parámetros y pulsa «Generar script»."}
function renderForm(){
 const c=CATEGORIES.find(x=>x.id===active);

 $("formTitle").textContent=c.name;
 $("formDesc").textContent=c.desc;

 let fields=c.fields;

 // Failover Multi-ISP: mostrar solamente la cantidad seleccionada
 if(active==="failover"){
   const countField=c.fields.find(f=>f[0]==="count");
   const count=parseInt(countField?.[4] || "2",10);

   fields=c.fields.filter(([id])=>{
     if(id==="count" || id==="check") return true;

     const match=id.match(/^(isp|gw|distance)([1-6])$/);

     if(match){
       return parseInt(match[2],10) <= count;
     }

     return true;
   });
 }

 $("form").innerHTML=fields.map(([id,label,type,opts,val])=>{
   if(type==="select"){
     return `<label>${label}<select id="f-${id}">${opts.split(",").map(x=>{
       let[a,b]=x.split("|");
       return `<option value="${a}" ${a===val?"selected":""}>${b}</option>`;
     }).join("")}</select></label>`;
   }

   return `<label>${label}<input id="f-${id}" type="${type}" value="${esc(val)}" placeholder="${esc(opts)}"></label>`;
 }).join("");

 // Cuando cambia la cantidad de ISP, reconstruir el formulario
 if(active==="failover"){
   const countSelect=$("f-count");

   if(countSelect){
     countSelect.addEventListener("change",()=>{
       const selected=countSelect.value;

       // Actualizar el valor usado por CATEGORIES
       const category=CATEGORIES.find(x=>x.id==="failover");
       const countField=category.fields.find(f=>f[0]==="count");

       if(countField){
         countField[4]=selected;
       }

       renderForm();
       $("script").textContent="// Completa los parámetros y pulsa «Generar script».";
     });
   }
 }
}
function v(id){return $("f-"+id)?.value||""}
function generate(){
  try {
    const s = generateByCategory(active);

    $("script").textContent =
      s || "# Sin configuración";

    return s || "";
  } catch (error) {
    console.error("Generate error:", error);

    const message =
      "# Error generando configuración: " +
      (error?.message || error);

    $("script").textContent = message;

    return message;
  }
}

async function validateScript(category, script){
  try {
    const values = {};
    const fields = {};

    const categoryData =
      CATEGORIES.find(c => c.id === category);

    if (categoryData) {
      for (const field of categoryData.fields) {
        const [id] = field;
        values[id] = v(id);

        /*
         * Validadores básicos según el tipo de campo.
         */
        if (id === "address" ||
            id === "local" ||
            id === "remote") {
          if (values[id]?.includes("/")) {
            fields[id] = "ip";
          }
        }

        if (id === "network" ||
            id === "dst" ||
            id === "src") {
          if (values[id]?.includes("/")) {
            fields[id] = "network";
          }
        }

        if (id === "id" && category === "vlan") {
          fields[id] = "vlan";
        }

        if (id.toLowerCase().includes("port")) {
          fields[id] = "port";
        }

        if (id === "localAs" ||
            id === "remoteAs") {
          fields[id] = "asn";
        }

        if (id === "routerId") {
          fields[id] = "router_id";
        }
      }
    }

    const response = await fetch("/api/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        category,
        values,
        fields,
        script
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
        "Error en el servicio de validación"
      );
    }

    return result;

  } catch (error) {
    console.error("Validation error:", error);

    return {
      valid: false,
      errors: [
        error?.message ||
        "No se pudo ejecutar la validación"
      ],
      warnings: []
    };
  }
}

async function applyScript(){
  const s = generate();

  if (!s || s.startsWith("#")) {
    return;
  }

  /*
   * Validación Python antes de cualquier operación
   * sobre el MikroTik.
   */
  const validation =
    await validateScript(active, s);

  if (!validation.valid) {
    const errors =
      validation.errors?.join("\n") ||
      "El script no pasó la validación.";

    alert(
      "❌ CONFIGURACIÓN NO VÁLIDA\n\n" +
      errors
    );

    return;
  }

  if (validation.warnings?.length) {
    const warnings =
      validation.warnings.join("\n");

    const proceed = confirm(
      "⚠️ ADVERTENCIAS DEL VALIDADOR\n\n" +
      warnings +
      "\n\n¿Quieres continuar?"
    );

    if (!proceed) {
      return;
    }
  }

  const id = $("device").value;

  if (!id) {
    return alert(
      "Selecciona el equipo destino."
    );
  }

  if (
    $("preview").checked &&
    !confirm(
      "Vista previa validada correctamente.\n\n" +
      "¿Quieres continuar y aplicar el script?"
    )
  ) {
    return;
  }

  /*
   * Backup antes de aplicar.
   */
  if ($("backup").checked) {
    try {
      const backupResponse =
        await fetch(
          `/api/devices/${id}/backup`,
          {
            method: "POST"
          }
        );

      if (!backupResponse.ok) {
        const backupResult =
          await backupResponse.json().catch(() => ({}));

        alert(
          "❌ No se pudo crear el backup.\n\n" +
          (
            backupResult.error ||
            "Operación cancelada por seguridad."
          )
        );

        return;
      }

    } catch (error) {
      alert(
        "❌ Error creando el backup.\n\n" +
        (
          error?.message ||
          "Operación cancelada por seguridad."
        )
      );

      return;
    }
  }

  if (
    $("confirm").checked &&
    !confirm(
      "⚠️ ¿Ejecutar esta configuración remotamente?"
    )
  ) {
    return;
  }

  try {
    const r = await fetch(
      `/api/devices/${id}/command`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command: s
        })
      }
    );

    const x =
      await r.json().catch(() => ({}));

    if (r.ok) {
      alert(
        "✅ Configuración aplicada correctamente."
      );
    } else {
      alert(
        "❌ Error al aplicar.\n\n" +
        (
          x.error ||
          x.message ||
          "Error desconocido."
        )
      );
    }

  } catch (error) {
    alert(
      "❌ Error de conexión con el servidor.\n\n" +
      (
        error?.message ||
        "No se pudo aplicar la configuración."
      )
    );
  }
}

function copyScript(){navigator.clipboard?.writeText($("script").textContent);alert("Script copiado")}
function downloadRsc(){const b=new Blob([$("script").textContent],{type:"text/plain"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`mikrotik-${active}.rsc`;a.click();URL.revokeObjectURL(a.href)}
renderTabs();renderForm();loadDevices();

// =====================================================
// NAVEGACIÓN
// =====================================================



document.querySelectorAll("nav button[data-page]").forEach(button => {

  button.addEventListener("click", () => {

    const page = button.dataset.page;

    document.querySelectorAll(".page").forEach(p => {
      p.classList.add("hidden");
    });

    const target = document.getElementById(page);

    if (target) {
      target.classList.remove("hidden");
    }

    document.querySelectorAll("nav button").forEach(b => {
      b.classList.remove("active");
    });

    button.classList.add("active");

    const info = pageInfo[page];

    if (info) {
      $("pageTitle").textContent = info.title;
      $("pageDesc").textContent = info.desc;
    }

    if (page === "dashboard") {
      loadDashboard();
    }

    if (page === "devices") {
      renderDevices();
    }

    if (page === "monitor") {
      loadDeviceSelectors();
    }

    if (page === "terminal") {
      loadDeviceSelectors();
    }

    if (page === "audit") {
      loadAudit();
    }

  });

});


// =====================================================
// FORMULARIO DE EQUIPOS
// =====================================================

function showDeviceForm() {

  $("deviceForm").classList.remove("hidden");

  $("dev-name").focus();

}


function hideDeviceForm() {

  $("deviceForm").classList.add("hidden");

}


async function createDevice() {

  const name = $("dev-name").value.trim();
  const host = $("dev-host").value.trim();
  const port = Number($("dev-port").value);
  const username = $("dev-user").value.trim();
  const password = $("dev-pass").value;
  const tls = $("dev-tls").value === "true";

  const tags = $("dev-tags").value
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  if (!name || !host || !username || !password) {

    alert("Completa nombre, host, usuario y contraseña.");

    return;
  }

  try {

    const response = await fetch("/api/devices", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        name,
        host,
        port,
        username,
        password,
        tls,
        tags
      })

    });

    const data = await response.json();

    if (!response.ok) {

      alert(data.error || "No se pudo crear el equipo.");

      return;
    }

    alert("Equipo agregado correctamente.");

    $("dev-name").value = "";
    $("dev-host").value = "";
    $("dev-user").value = "";
    $("dev-pass").value = "";
    $("dev-tags").value = "";

    hideDeviceForm();

    await loadDevices();

    renderDevices();

  } catch (error) {

    alert("Error conectando con el servidor: " + error.message);

  }

}


// =====================================================
// LISTADO DE EQUIPOS
// =====================================================




async function testDevice(id) {

  try {

    const response = await fetch(
      `/api/devices/${id}/test`,
      {
        method: "POST"
      }
    );

    const data = await response.json();

    if (response.ok) {

      alert("✓ Conexión RouterOS correcta.");

    } else {

      alert(
        "✗ Error de conexión:\n\n" +
        (data.error || "Error desconocido")
      );

    }

  } catch (error) {

    alert("Error: " + error.message);

  }

}



async function editDevice(id) {

  const device = devices.find(
    x => x.id === id
  );

  if (!device) {
    alert("Equipo no encontrado.");
    return;
  }

  $("dev-name").value =
    device.name || "";

  $("dev-host").value =
    device.host || "";

  $("dev-port").value =
    device.port || 8728;

  $("dev-user").value =
    device.username || "";

  $("dev-pass").value =
    "";

  $("dev-tls").value =
    device.tls ? "true" : "false";

  $("dev-tags").value =
    Array.isArray(device.tags)
      ? device.tags.join(",")
      : "";

  const form = $("deviceForm");

  if (form) {
    form.classList.remove("hidden");
  }

  const title =
    form?.querySelector("h3");

  if (title) {
    title.textContent = "Editar equipo";
  }

  const actions =
    form?.querySelector(".actions");

  if (actions) {

    actions.innerHTML = `

      <button
        class="secondary"
        onclick="hideDeviceForm()">
        Cancelar
      </button>

      <button
        class="primary"
        onclick="updateDevice('${device.id}')">
        Guardar cambios
      </button>

    `;
  }

  $("dev-name")?.focus();
}


async function updateDevice(id) {

  const name =
    $("dev-name")?.value.trim();

  const host =
    $("dev-host")?.value.trim();

  const port =
    Number($("dev-port")?.value);

  const username =
    $("dev-user")?.value.trim();

  const password =
    $("dev-pass")?.value;

  const tls =
    $("dev-tls")?.value === "true";

  const tags =
    $("dev-tags")
      ?.value
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean) || [];

  if (!name || !host || !username) {

    alert(
      "Completa nombre, host y usuario."
    );

    return;
  }

  try {

    const response = await fetch(
      `/api/devices/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          host,
          port,
          username,
          password,
          tls,
          tags
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {

      alert(
        data.error ||
        "No se pudo actualizar el equipo."
      );

      return;
    }

    alert(
      "Equipo actualizado correctamente."
    );

    hideDeviceForm();

    await loadDevices();

    renderDevices();

  } catch (error) {

    console.error(
      "[UPDATE DEVICE]",
      error
    );

    alert(
      "Error actualizando equipo: " +
      error.message
    );
  }
}



async function deleteDevice(id) {

  const device = devices.find(x => x.id === id);

  if (!device) return;

  if (!confirm(
    `¿Eliminar el equipo "${device.name}"?`
  )) return;

  const response = await fetch(
    `/api/devices/${id}`,
    {
      method: "DELETE"
    }
  );

  if (response.ok) {

    await loadDevices();
    renderDevices();

  } else {

    alert("No se pudo eliminar el equipo.");

  }

}


// =====================================================
// SELECTORES DE EQUIPOS
// =====================================================

async function loadDeviceSelectors() {

  await loadDevices();

  const selectors = [
    $("monitorDevice"),
    $("terminalDevice"),
    $("device")
  ];

  selectors.forEach(select => {

    if (!select) return;

    const current = select.value;

    select.innerHTML =
      `<option value="">Equipo destino...</option>` +
      devices.map(d =>
        `<option value="${d.id}">
          ${esc(d.name)} — ${esc(d.host)}
        </option>`
      ).join("");

    if (devices.some(d => d.id === current)) {
      select.value = current;
    }

  });

}


// =====================================================
// MONITOR
// =====================================================

const monitorEndpoints = {

  identity: "identity",
  resource: "resource",
  interfaces: "interfaces",
  ip: "ip",
  routes: "routes",
  firewall: "firewall",
  dhcp: "dhcp",
  log: "log"

};


async function monitorRequest(type) {

  const id = $("monitorDevice").value;

  if (!id) {

    alert("Selecciona un equipo.");

    return;
  }

  const endpoint = monitorEndpoints[type];

  $("monitorOutput").textContent =
    "Consultando RouterOS...";

  try {

    const response = await fetch(
      `/api/devices/${id}/${endpoint}`
    );

    const data = await response.json();

    if (!response.ok) {

      $("monitorOutput").textContent =
        data.error || "Error consultando RouterOS.";

      return;
    }

    $("monitorOutput").textContent =
      JSON.stringify(data.result, null, 2);

  } catch (error) {

    $("monitorOutput").textContent =
      "Error: " + error.message;

  }

}


// =====================================================
// TERMINAL
// =====================================================

async function executeCommand() {

  const id = $("terminalDevice").value;
  const command = $("terminalCommand").value.trim();

  if (!id) {

    alert("Selecciona un equipo.");

    return;
  }

  if (!command) {

    alert("Escribe un comando RouterOS.");

    return;
  }

  $("terminalOutput").textContent =
    "Ejecutando comando...";

  try {

    const response = await fetch(
      `/api/devices/${id}/command`,
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          command
        })

      }
    );

    const data = await response.json();

    $("terminalOutput").textContent =
      JSON.stringify(
        response.ok ? data.result : data,
        null,
        2
      );

  } catch (error) {

    $("terminalOutput").textContent =
      "Error: " + error.message;

  }

}


// =====================================================
// AUDITORÍA
// =====================================================

async function loadAudit() {

  const container = $("auditList");

  container.innerHTML =
    `<div class="empty">Cargando auditoría...</div>`;

  try {

    const response = await fetch("/api/audit");

    const rows = await response.json();

    if (!rows.length) {

      container.innerHTML =
        `<div class="empty">No hay operaciones registradas.</div>`;

      return;
    }

    container.innerHTML = rows.map(row => `

      <div class="audit-row">

        <div>

          <strong>${esc(row.action || "")}</strong>

          <div class="muted">
            ${esc(row.command || "")}
          </div>

        </div>

        <div>
          ${row.ok
            ? '<span class="status-ok">OK</span>'
            : '<span class="status-error">ERROR</span>'}
        </div>

        <div class="muted">
          ${esc(row.created_at || "")}
        </div>

      </div>

    `).join("");

  } catch (error) {

    container.innerHTML =
      `<div class="empty">
        Error cargando auditoría.
      </div>`;

  }

}


// =====================================================
// DASHBOARD
// =====================================================

async function loadDashboard() {

const totalEl =
$("statTotal");

const onlineEl =
$("statOnline");

const offlineEl =
$("statOffline");

const auditEl =
$("statAudit");

const activityEl =
$("dashboardActivity");

if (activityEl) {

activityEl.innerHTML = `
  <div class="empty">
    Actualizando estado de los equipos...
  </div>
`;

}

await loadDevices();

if (totalEl) {

totalEl.textContent =
  devices.length;

}

/*

* Usamos el estado almacenado por devices.js.
*
* De esta manera el Dashboard no abre
* conexiones RouterOS adicionales.
  */

let online = 0;
let offline = 0;

devices.forEach((device) => {

const cached =
  typeof getCachedDevice === "function"
    ? getCachedDevice(device.id)
    : null;


if (cached?.online === true) {

  online++;

} else if (cached?.online === false) {

  offline++;

}

});

/*
 * DASHBOARD - ESTADO Y RECURSOS
 *
 * Usa exclusivamente el cache generado por devices.js.
 * No realiza conexiones RouterOS adicionales.
 */

const dashboardDevices =
  $("dashboardDevices");

if (dashboardDevices) {

  dashboardDevices.innerHTML =
    devices.length
      ? devices.map((device) => {

          const cached =
            typeof getCachedDevice === "function"
              ? getCachedDevice(device.id)
              : null;

          if (!cached) {

            return `
              <div class="dashboard-device">

                <div class="dashboard-device-header">

                  <strong>
                    ${esc(device.name || "Equipo")}
                  </strong>

                  <span class="badge device-checking">
                    ● ESPERANDO MONITOREO
                  </span>

                </div>

                <div class="dashboard-device-empty">
                  Esperando datos del monitoreo...
                </div>

              </div>
            `;

          }

          if (!cached.online) {

            return `
              <div class="dashboard-device">

                <div class="dashboard-device-header">

                  <strong>
                    ${esc(device.name || "Equipo")}
                  </strong>

                  <span class="badge device-offline">
                    ● OFFLINE
                  </span>

                </div>

                <div class="dashboard-device-empty">
                  Sin conexión al MikroTik
                </div>

              </div>
            `;

          }

          const m =
            cached.metrics || {};

          const cpu =
            Number(m.cpu || 0);

          const ram =
            Number(m.ram || 0);

          const disk =
            Number(m.disk || 0);

          return `
            <div class="dashboard-device">

              <div class="dashboard-device-header">

                <strong>
                  ${esc(device.name || "Equipo")}
                </strong>

                <span class="badge device-online">
                  ● ONLINE
                </span>

              </div>

              <div class="dashboard-metrics">

                <div class="dashboard-metric">
                  <span>⚡ CPU</span>
                  <strong>${cpu.toFixed(0)}%</strong>
                </div>

                <div class="dashboard-metric">
                  <span>🧠 RAM</span>
                  <strong>${ram.toFixed(0)}%</strong>
                </div>

                <div class="dashboard-metric">
                  <span>💾 DISCO</span>
                  <strong>${disk.toFixed(0)}%</strong>
                </div>

              </div>

              <div class="dashboard-device-info">

                <span>
                  ⏱️ Uptime:
                  <strong>
                    ${esc(m.uptime || "-")}
                  </strong>
                </span>

                <span>
                  RouterOS:
                  <strong>
                    ${esc(m.version || "-")}
                  </strong>
                </span>

                <span>
                  CPU:
                  <strong>
                    ${esc(m.cpuName || "-")}
                  </strong>
                </span>

                <span>
                  Cores:
                  <strong>
                    ${esc(String(m.cpuCount ?? "-"))}
                  </strong>
                </span>

              </div>

            </div>
          `;

        }).join("")
      : `
          <div class="empty">
            No hay equipos registrados.
          </div>
        `;

}


if (onlineEl) {

onlineEl.textContent =
  online;

}

if (offlineEl) {

offlineEl.textContent =
  offline;

}

/*

* Cargar auditoría
  */

try {

const response =
  await fetch("/api/audit");


if (!response.ok) {

  throw new Error(
    "Error obteniendo auditoría"
  );

}


const audit =
  await response.json();


if (auditEl) {

  auditEl.textContent =
    audit.length;

}


const recent = audit;
if (activityEl) {

  const actionNames = {
    MONITOR: "Monitorización",
    INTERFACES: "Interfaces",
    RESOURCE: "Recursos"
  };

  const formatRelativeTime = (dateString) => {

    const date = new Date(dateString);
    const now = new Date();

    if (Number.isNaN(date.getTime())) {
      return dateString || "";
    }

    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 10) return "hace unos segundos";
    if (seconds < 60) return `hace ${seconds} segundos`;

    const minutes = Math.floor(seconds / 60);

    if (minutes === 1) return "hace 1 minuto";
    if (minutes < 60) return `hace ${minutes} minutos`;

    const hours = Math.floor(minutes / 60);

    if (hours === 1) return "hace 1 hora";
    if (hours < 24) return `hace ${hours} horas`;

    const days = Math.floor(hours / 24);

    if (days === 1) return "hace 1 día";

    return `hace ${days} días`;
  };

  
const grouped = [];

const actionOrder = [
  "MONITOR",
  "INTERFACES",
  "RESOURCE"
];

actionOrder.forEach((action) => {

  const row = recent.find(
    (item) => item.action === action
  );

  if (!row) {
    return;
  }

  grouped.push({
    ...row,
    action
  });

});

  activityEl.innerHTML =
    grouped.length

      ? grouped.map((row) => {

          const action =
            actionNames[row.action] ||
            row.action ||
            "Evento";

          const statusClass =
            row.ok ? "status-ok" : "status-error";

          const statusText =
            row.ok ? "ÉXITO" : "ERROR";

          const relativeTime =
            formatRelativeTime(row.created_at);

	const countText = "";
          return `
            <div class="audit-row">

              <div class="audit-info">

                <div class="audit-title">

                  <span class="audit-dot ${statusClass}"></span>

                  <strong>
                    ${esc(action)}
                  </strong>

                </div>

                <div
                  class="audit-time muted"
                  title="${esc(row.created_at || "")}"
                >
                  ${esc(relativeTime)}
                  ${countText ? ` · ${esc(countText)}` : ""}
                </div>

              </div>

              <span class="audit-status ${statusClass}">
                ${statusText}
              </span>

            </div>
          `;

        }).join("")

      : `
          <div class="empty">
            No hay actividad reciente.
          </div>
        `;
}
} catch (error) {

console.error(
  "[DASHBOARD AUDIT]",
  error
);


if (auditEl) {

  auditEl.textContent =
    "0";

}


if (activityEl) {

  activityEl.innerHTML = `
    <div class="empty">
      No se pudo cargar la actividad.
    </div>
  `;

}

}

}
