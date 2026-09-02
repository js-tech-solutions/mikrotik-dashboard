let hotspotVouchers = [];

function hotspotValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

/* =====================================================
   GENERAR FICHAS
===================================================== */

function generateHotspot() {

  const quantity = Number(
    hotspotValue("hotspotQuantity")
  );

  const prefix =
    hotspotValue("hotspotPrefix") || "WIFI";

  const profile =
    hotspotValue("hotspotProfile") || "default";

  const duration =
    hotspotValue("hotspotDuration") || "1d";

  if (!quantity || quantity < 1 || quantity > 1000) {
    alert("La cantidad debe estar entre 1 y 1000.");
    return;
  }

  hotspotVouchers = [];

  for (let i = 1; i <= quantity; i++) {

    const number =
      String(i).padStart(
        String(quantity).length,
        "0"
      );

    const username =
      `${prefix}-${number}`;

    const password =
      generateVoucherPassword(6);

    hotspotVouchers.push({
      id: i,
      username,
      password,
      profile,
      duration,
      status: "Pendiente"
    });

  }

  renderHotspotTable();
  generateHotspotScript();

}

/* =====================================================
   PASSWORD
===================================================== */

function generateVoucherPassword(length = 6) {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let password = "";

  for (let i = 0; i < length; i++) {

    password +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];

  }

  return password;
}

/* =====================================================
   TABLA
===================================================== */

function renderHotspotTable() {

  const container =
    document.getElementById("hotspotTable");

  if (!container) return;

  if (!hotspotVouchers.length) {

    container.innerHTML = `
      <div class="empty">
        Todavía no se han generado fichas.
      </div>
    `;

    return;
  }

  container.innerHTML = `

    <div style="overflow:auto">

      <table style="width:100%; border-collapse:collapse">

        <thead>

          <tr>

            <th>#</th>
            <th>Usuario</th>
            <th>Password</th>
            <th>Perfil</th>
            <th>Duración</th>
            <th>Estado</th>

          </tr>

        </thead>

        <tbody>

          ${hotspotVouchers.map(voucher => `

            <tr>

              <td>${voucher.id}</td>

              <td>
                <strong>
                  ${esc(voucher.username)}
                </strong>
              </td>

              <td>
                <code>
                  ${esc(voucher.password)}
                </code>
              </td>

              <td>
                ${esc(voucher.profile)}
              </td>

              <td>
                ${esc(voucher.duration)}
              </td>

              <td>
                <span class="badge">
                  ${esc(voucher.status)}
                </span>
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>

  `;

}

/* =====================================================
   GENERAR SCRIPT ROUTEROS
===================================================== */

function generateHotspotScript() {

  const interfaceName =
    hotspotValue("hotspotInterface") || "bridge";

  const hotspotName =
    hotspotValue("hotspotName") || "hotspot1";

  const gateway =
    hotspotValue("hotspotGateway") || "10.10.10.1/24";

  const pool =
    hotspotValue("hotspotPool") ||
    "10.10.10.10-10.10.10.254";

  const profile =
    hotspotValue("hotspotProfile") ||
    "PLAN-10M";

  const rate =
    hotspotValue("hotspotRate") ||
    "10M/10M";

  let script = "";

  script += `# =============================================\n`;
  script += `# MIKROTIK MANAGER - HOTSPOT\n`;
  script += `# =============================================\n\n`;

  script += `# Pool Hotspot\n`;
  script += `/ip pool add name=pool-${hotspotName} ranges=${pool}\n\n`;

  script += `# IP Gateway\n`;
  script += `/ip address add address=${gateway} interface=${interfaceName}\n\n`;

  script += `# Perfil Hotspot\n`;
  script += `/ip hotspot user profile add name=${profile} rate-limit=${rate}\n\n`;

  script += `# Servidor Hotspot\n`;
  script += `/ip hotspot add name=${hotspotName} interface=${interfaceName} address-pool=pool-${hotspotName} disabled=no\n\n`;

  script += `# Fichas\n`;

  hotspotVouchers.forEach(voucher => {

    script +=
      `/ip hotspot user add name=${voucher.username} password=${voucher.password} profile=${voucher.profile} limit-uptime=${voucher.duration}\n`;

  });

  document.getElementById(
    "hotspotScript"
  ).textContent = script;

  return script;

}

/* =====================================================
   LIMPIAR
===================================================== */

function clearHotspot() {

  hotspotVouchers = [];

  const table =
    document.getElementById("hotspotTable");

  if (table) {

    table.innerHTML = `
      <div class="empty">
        Todavía no se han generado fichas.
      </div>
    `;

  }

  const script =
    document.getElementById("hotspotScript");

  if (script) {

    script.textContent =
      "# Genera las fichas para obtener el script RouterOS.";

  }

}

/* =====================================================
   COPIAR FICHAS
===================================================== */

async function copyHotspot() {

  if (!hotspotVouchers.length) {

    alert("Primero genera las fichas.");

    return;
  }

  const text =
    hotspotVouchers
      .map(v =>
        `${v.username}\t${v.password}\t${v.profile}\t${v.duration}`
      )
      .join("\n");

  try {

    await navigator.clipboard.writeText(text);

    alert("Fichas copiadas.");

  } catch {

    alert("No se pudo copiar al portapapeles.");

  }

}

/* =====================================================
   COPIAR SCRIPT
===================================================== */

async function copyHotspotScript() {

  const script =
    document.getElementById(
      "hotspotScript"
    )?.textContent || "";

  try {

    await navigator.clipboard.writeText(script);

    alert("Script Hotspot copiado.");

  } catch {

    alert("No se pudo copiar el script.");

  }

}

/* =====================================================
   CSV
===================================================== */

function downloadHotspotCSV() {

  if (!hotspotVouchers.length) {

    alert("Primero genera las fichas.");

    return;
  }

  let csv =
    "Numero,Usuario,Password,Perfil,Duracion,Estado\n";

  hotspotVouchers.forEach(v => {

    csv +=
      `${v.id},${csvEscape(v.username)},${csvEscape(v.password)},${csvEscape(v.profile)},${csvEscape(v.duration)},${csvEscape(v.status)}\n`;

  });

  const blob =
    new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "hotspot-fichas.csv";

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);

}

function csvEscape(value) {

  return `"${String(value ?? "").replaceAll('"', '""')}"`;

}

/* =====================================================
   IMPRIMIR
===================================================== */

function printHotspot() {

  if (!hotspotVouchers.length) {

    alert("Primero genera las fichas.");

    return;
  }

  const popup =
    window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

  if (!popup) {

    alert(
      "El navegador bloqueó la ventana de impresión."
    );

    return;
  }

  const cards =
    hotspotVouchers.map(v => `

      <div class="voucher">

        <div class="title">
          Wi-Fi Hotspot
        </div>

        <div class="profile">
          ${esc(v.profile)}
        </div>

        <div class="label">
          USUARIO
        </div>

        <div class="username">
          ${esc(v.username)}
        </div>

        <div class="label">
          CONTRASEÑA
        </div>

        <div class="password">
          ${esc(v.password)}
        </div>

        <div class="duration">
          Duración: ${esc(v.duration)}
        </div>

      </div>

    `).join("");

  popup.document.write(`

    <!doctype html>

    <html>

    <head>

      <meta charset="utf-8">

      <title>Fichas Hotspot</title>

      <style>

        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 15px;
        }

        .voucher {
          border: 2px solid #222;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
          page-break-inside: avoid;
        }

        .title {
          font-size: 20px;
          font-weight: bold;
        }

        .profile {
          margin-top: 5px;
          font-size: 13px;
        }

        .label {
          margin-top: 15px;
          font-size: 10px;
          color: #666;
        }

        .username,
        .password {
          font-size: 22px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-top: 4px;
        }

        .duration {
          margin-top: 15px;
          font-size: 12px;
        }

        @media print {

          body {
            margin: 10px;
          }

        }

      </style>

    </head>

    <body>

      <div class="grid">
        ${cards}
      </div>

      <script>

        window.onload = function() {
          window.print();
        };

      <\/script>

    </body>

    </html>

  `);

  popup.document.close();

}

/* =====================================================
   APLICAR AL MIKROTIK
===================================================== */

async function applyHotspot() {

  const device =
    document.getElementById(
      "hotspotDevice"
    )?.value;

  if (!device) {

    alert(
      "Selecciona el equipo MikroTik."
    );

    return;
  }

  if (!hotspotVouchers.length) {

    alert(
      "Primero genera las fichas."
    );

    return;
  }

  const script =
    generateHotspotScript();

  if (!confirm(
    "¿Aplicar la configuración Hotspot y crear las fichas en el MikroTik?"
  )) {

    return;
  }

  try {

    const response =
      await fetch(
        `/api/devices/${device}/hotspot/apply`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            script
          })

        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      alert(
        data.error ||
        "Error aplicando Hotspot."
      );

      return;
    }

    hotspotVouchers =
      hotspotVouchers.map(v => ({
        ...v,
        status: "Creado"
      }));

    renderHotspotTable();

    alert(
      "✓ Hotspot y fichas aplicados correctamente."
    );

  } catch (error) {

    console.error(
      "[HOTSPOT]",
      error
    );

    alert(
      "Error conectando con el servidor: " +
      error.message
    );

  }

}

/* =====================================================
   CARGAR EQUIPOS
===================================================== */

async function loadHotspotDevices() {

  try {

    if (
      typeof loadDevices === "function"
    ) {

      await loadDevices();

      if (
        typeof updateDeviceSelectors === "function"
      ) {

        updateDeviceSelectors();

      }

    }

  } catch (error) {

    console.error(
      "[HOTSPOT DEVICES]",
      error
    );

  }

}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadHotspotDevices();

  }
);
