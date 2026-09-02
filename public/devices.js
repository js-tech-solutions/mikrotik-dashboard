
let devices = [];

/* =========================================================
   CACHE DE ESTADO DE LOS MIKROTIK
   ========================================================= */

const DEVICE_CACHE_TTL = 60000; // ONLINE: 60 segundos
const OFFLINE_CACHE_TTL = 300000; // OFFLINE: 5 minutos

const deviceResourceCache = new Map();

const deviceInterfaceCache = new Map();

function getCachedDevice(id) {

  const cached = deviceResourceCache.get(id);

  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.timestamp;

  const ttl =
    cached.online
      ? DEVICE_CACHE_TTL
      : OFFLINE_CACHE_TTL;

  if (age > ttl) {
    deviceResourceCache.delete(id);
    return null;
  }

  return cached;
}

function setDeviceCache(id, data) {

  deviceResourceCache.set(id, {
    ...data,
    timestamp: Date.now()
  });

}

function clearDeviceCache(id) {

  deviceResourceCache.delete(id);

}

function refreshDevices() {

  /*
   * Forzar una comprobación completamente nueva.
   */
  deviceResourceCache.clear();
  deviceInterfaceCache.clear();

  /*
   * renderDevices() dibuja la interfaz y después
   * ejecuta refreshMonitoring().
   */
  return renderDevices();
}

function getCachedInterfaces(id) {

  const cached =
    deviceInterfaceCache.get(id);

  if (!cached) {
    return null;
  }

  const age =
    Date.now() - cached.timestamp;

  if (age > DEVICE_CACHE_TTL) {
    deviceInterfaceCache.delete(id);
    return null;
  }

  return cached;
}


function setInterfaceCache(id, data) {

  deviceInterfaceCache.set(id, {
    ...data,
    timestamp: Date.now()
  });

}

async function loadDevices() {

  try {

    const response = await fetch("/api/devices");

    if (!response.ok) {
      throw new Error("No se pudieron cargar los equipos");
    }

    devices = await response.json();

    updateDeviceSelectors();

    return devices;

  } catch (error) {

    console.error("[DEVICES]", error);

    devices = [];

    return [];

  }

}

function updateDeviceSelectors() {

  const selectors = [
    document.getElementById("device"),
    document.getElementById("monitorDevice"),
    document.getElementById("terminalDevice"),
    document.getElementById("hotspotDevice")
  ];

  selectors.forEach((select) => {

    if (!select) return;

    const current = select.value;

    select.innerHTML =
      `<option value="">Equipo destino...</option>` +
      devices.map((device) => `
        <option value="${esc(device.id)}">
          ${esc(device.name)} — ${esc(device.host)}
        </option>
      `).join("");

    if (
      devices.some((device) => device.id === current)
    ) {
      select.value = current;
    }

  });

}

function showDeviceForm() {

  const form = document.getElementById("deviceForm");

  if (form) {
    form.classList.remove("hidden");
  }

  document.getElementById("dev-name")?.focus();

}

function hideDeviceForm() {

  const form = document.getElementById("deviceForm");

  if (form) {
    form.classList.add("hidden");
  }

}

function updateVendorForm() {

  const vendor =
    document.getElementById("dev-vendor")?.value ||
    "mikrotik";

  const port =
    document.getElementById("dev-port");

  const tls =
    document.getElementById("dev-tls");

  if (vendor === "cisco") {

    if (port) {
      port.value = "22";
    }

    if (tls) {
      tls.value = "false";
      tls.disabled = true;
    }

    return;
  }

  if (tls) {
    tls.disabled = false;
  }

  if (port && (!port.value || port.value === "22")) {
    port.value = "8728";
  }

}

async function createDevice() {

  const vendor =
    document.getElementById("dev-vendor")?.value ||
    "mikrotik";

  const name =
    document.getElementById("dev-name")?.value.trim();

  const host =
    document.getElementById("dev-host")?.value.trim();

  const port =
    Number(
      document.getElementById("dev-port")?.value
    );

  const username =
    document.getElementById("dev-user")?.value.trim();

  const password =
    document.getElementById("dev-pass")?.value;

  const tls =
    document.getElementById("dev-tls")?.value === "true";

  const tags =
    document
      .getElementById("dev-tags")
      ?.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) || [];

  if (
    !name ||
    !host ||
    !username ||
    !password
  ) {

    alert(
      "Completa nombre, host, usuario y contraseña."
    );

    return;
  }

  try {

    const response =
      await fetch(
        "/api/devices",
        {
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
            tags,
            vendor
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      alert(
        data.error ||
        "No se pudo crear el equipo."
      );

      return;
    }

    alert(
      "Equipo creado correctamente."
    );

    /*
     * Limpiar formulario.
     */

    [
      "dev-name",
      "dev-host",
      "dev-user",
      "dev-pass",
      "dev-tags"
    ].forEach((id) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.value = "";
      }

    });

    /*
     * Restaurar valores iniciales.
     */

    const vendorSelect =
      document.getElementById("dev-vendor");

    if (vendorSelect) {
      vendorSelect.value = "mikrotik";
    }

    const portInput =
      document.getElementById("dev-port");

    if (portInput) {
      portInput.value = "8728";
    }

    const tlsSelect =
      document.getElementById("dev-tls");

    if (tlsSelect) {
      tlsSelect.value = "false";
    }

    hideDeviceForm();

    /*
     * Recargar dispositivos.
     */

    await renderDevices();

  } catch (error) {

    console.error(
      "[CREATE DEVICE]",
      error
    );

    alert(
      "Error conectando con el servidor: " +
      error.message
    );

  }

}

async function renderDevices() {

  const container =
    document.getElementById("devicesList");

  if (!container) return;

  container.innerHTML =
    `<div class="empty">Cargando equipos...</div>`;

  await loadDevices();

  if (!devices.length) {

    container.innerHTML = `
      <div class="empty">
        No hay equipos registrados.
        <br>
        Agrega tu primer MikroTik.
      </div>
    `;

    return;
  }

  container.innerHTML = devices.map((device) => `

    <div class="device-row">

      <div class="device-main">

        <div class="device-title">

          <strong>
            ${esc(device.name)}
          </strong>

          ${(() => {

            const cached =
              getCachedDevice(device.id);

            if (!cached) {

              return `
                <span
                  id="status-${esc(device.id)}"
                  class="badge device-checking">
                  ● COMPROBANDO
                </span>
              `;

            }

            if (cached.online) {

              return `
                <span
                  id="status-${esc(device.id)}"
                  class="badge device-online">
                  ● ONLINE
                </span>
              `;

            }

            return `
              <span
                id="status-${esc(device.id)}"
                class="badge device-offline">
                ● OFFLINE
              </span>
            `;

          })()}

        </div>

        <div class="muted">
          ${esc(device.host)}:${device.port}
        </div>

        <div
          id="resource-${esc(device.id)}"
          class="device-resource">

          <span class="muted">
            Obteniendo información...
          </span>

        </div>

        <div
          id="interfaces-${esc(device.id)}"
          class="device-interfaces">

          <span class="muted">
            Esperando monitoreo...
          </span>

        </div>

      </div>

      <div>

        <span class="badge">
          ${device.tls ? "TLS" : "API"}
        </span>

      </div>

      <div class="device-actions">

        <button
          class="secondary"
          onclick="testDevice('${esc(device.id)}')">
          Probar
        </button>

        <button
          class="secondary"
          onclick="editDevice('${esc(device.id)}')">
          Editar
        </button>

        <button
          class="secondary"
          onclick="deleteDevice('${esc(device.id)}')">
          Eliminar
        </button>

      </div>

    </div>

  `).join("");
}

	
	async function loadDeviceResource(id) {

  const status =
    document.getElementById(`status-${id}`);

  const resource =
    document.getElementById(`resource-${id}`);

  if (!status || !resource) return;

  /* =====================================================
     USAR CACHE SI LA COMPROBACION ES RECIENTE
     ===================================================== */

  const cached = getCachedDevice(id);

  if (cached) {

    status.textContent =
      cached.online
        ? "● ONLINE"
        : "● OFFLINE";

    status.className =
      cached.online
        ? "badge device-online"
        : "badge device-offline";

    if (cached.resourceHTML) {
      resource.innerHTML = cached.resourceHTML;
    }

    return;
  }

  try {


    const response = await fetch(
      `/api/devices/${id}/resource`,
      {
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || "Equipo offline"
      );
    }

    const r =
      Array.isArray(data.result)
        ? data.result[0]
        : data.result;

    if (!r) {
      throw new Error("Sin información");
    }

    const totalMemory =
      Number(r["total-memory"] || 0);

    const freeMemory =
      Number(r["free-memory"] || 0);

    const usedMemory =
      Math.max(
        0,
        totalMemory - freeMemory
      );

    const ramPercent =
      totalMemory > 0
        ? (usedMemory / totalMemory) * 100
        : 0;

    const totalDisk =
      Number(r["total-hdd-space"] || 0);

    const freeDisk =
      Number(r["free-hdd-space"] || 0);

    const usedDisk =
      Math.max(
        0,
        totalDisk - freeDisk
      );

    const diskPercent =
      totalDisk > 0
        ? (usedDisk / totalDisk) * 100
        : 0;

    const cpuPercent =
      Math.min(
        100,
        Math.max(
          0,
          Number(r["cpu-load"] || 0)
        )
      );

    function formatBytes(bytes) {

      if (!bytes || bytes < 0) {
        return "0 B";
      }

      const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
      ];

      let value = bytes;
      let index = 0;

      while (
        value >= 1024 &&
        index < units.length - 1
      ) {
        value /= 1024;
        index++;
      }

      return `${value.toFixed(
        value >= 10 || index === 0 ? 0 : 1
      )} ${units[index]}`;
    }

    function metric(
      icon,
      label,
      percent,
      detail
    ) {

      return `
        <div class="resource-metric">

          <div class="resource-metric-header">

            <span>
              ${icon} ${label}
            </span>

            <strong>
              ${percent.toFixed(0)}%
            </strong>

          </div>

          <div class="resource-bar">
            <div
              class="resource-bar-fill"
              style="width:${percent.toFixed(1)}%">
            </div>
          </div>

          <div class="resource-detail">
            ${detail}
          </div>

        </div>
      `;
    }

    status.textContent = "● ONLINE";

    status.className =
      "badge device-online";

	const resourceHTML = `

  <div class="resource-grid">

    ${metric(
          "⚡",
          "CPU",
          cpuPercent,
          `${r["cpu"] || "-"} · ${r["cpu-frequency"] || "-"} MHz`
        )}

        ${metric(
          "🧠",
          "RAM",
          ramPercent,
          `${formatBytes(usedMemory)} usados / ${formatBytes(totalMemory)}`
        )}

        ${metric(
          "💾",
          "DISCO",
          diskPercent,
          `${formatBytes(usedDisk)} usados / ${formatBytes(totalDisk)}`
        )}

      </div>

      <div class="resource-info">

        <span>
          ⏱️ Uptime:
          <strong>${esc(r.uptime || "-")}</strong>
        </span>

        <span>
          RouterOS:
          <strong>${esc(r.version || "-")}</strong>
        </span>

        <span>
          CPU:
          <strong>${esc(r["cpu"] || "-")}</strong>
        </span>

        <span>
          Cores:
          <strong>${esc(r["cpu-count"] || "-")}</strong>
        </span>

      </div>

	    `;

    resource.innerHTML = resourceHTML;

    setDeviceCache(id, {
      online: true,
      resourceHTML,
      metrics: {
        cpu: cpuPercent,
        ram: ramPercent,
        disk: diskPercent,
        uptime: r.uptime || "-",
        version: r.version || "-",
        cpuName: r["cpu"] || "-",
        cpuCount: r["cpu-count"] || 0,
        cpuFrequency: r["cpu-frequency"] || 0,
        memoryUsed: usedMemory,
        memoryTotal: totalMemory,
        diskUsed: usedDisk,
        diskTotal: totalDisk
      }
    });

  } catch (error) {
    console.error(
      `[RESOURCE ${id}]`,
      error
    );

status.textContent = "● OFFLINE";

status.className =
  "badge device-offline";

const resourceHTML = `
  <span class="muted">
    Sin conexión al MikroTik
  </span>
`;

resource.innerHTML = resourceHTML;

setDeviceCache(id, {
  online: false,
  resourceHTML
});


  }

}

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

      alert(
        "✓ Conexión RouterOS correcta."
      );

    } else {

      alert(
        "✗ Error de conexión:\n\n" +
        (data.error || "Error desconocido")
      );

    }

  } catch (error) {

    alert(
      "Error: " +
      error.message
    );

  }

}


async function editDevice(id) {

  const device =
    devices.find(
      (item) => item.id === id
    );

  if (!device) {

    alert(
      "Equipo no encontrado."
    );

    return;
  }

  const vendorSelect =
    document.getElementById("dev-vendor");

  const nameInput =
    document.getElementById("dev-name");

  const hostInput =
    document.getElementById("dev-host");

  const portInput =
    document.getElementById("dev-port");

  const userInput =
    document.getElementById("dev-user");

  const passInput =
    document.getElementById("dev-pass");

  const tlsSelect =
    document.getElementById("dev-tls");

  const tagsInput =
    document.getElementById("dev-tags");

  const vendor =
    String(
      device.vendor || "mikrotik"
    ).toLowerCase();

  if (vendorSelect) {
    vendorSelect.value =
      vendor;
  }

  if (nameInput) {
    nameInput.value =
      device.name || "";
  }

  if (hostInput) {
    hostInput.value =
      device.host || "";
  }

  if (portInput) {

    portInput.value =
      device.port ||
      (
        vendor === "cisco"
          ? 22
          : 8728
      );
  }

  if (userInput) {
    userInput.value =
      device.username || "";
  }

  /*
   * Por seguridad, nunca mostramos
   * la contraseña almacenada.
   */
  if (passInput) {
    passInput.value = "";
  }

  if (tlsSelect) {

    tlsSelect.value =
      device.tls
        ? "true"
        : "false";

  }

  if (tagsInput) {

    tagsInput.value =
      Array.isArray(device.tags)
        ? device.tags.join(",")
        : "";

  }

  /*
   * Ajustar campos según fabricante.
   */
  if (
    typeof updateVendorForm ===
    "function"
  ) {
    updateVendorForm();
  }

  const form =
    document.getElementById(
      "deviceForm"
    );

  form?.classList.remove(
    "hidden"
  );

  const title =
    form?.querySelector("h3");

  if (title) {
    title.textContent =
      "Editar equipo";
  }

  const actions =
    form?.querySelector(
      ".actions"
    );

  if (actions) {

    actions.innerHTML = `

      <button
        class="secondary"
        onclick="hideDeviceForm()">
        Cancelar
      </button>

      <button
        class="primary"
        onclick="updateDevice('${esc(device.id)}')">
        Guardar cambios
      </button>

    `;

  }

  nameInput?.focus();

}

async function updateDevice(id) {

  const vendor =
    document.getElementById("dev-vendor")?.value ||
    "mikrotik";

  const name =
    document.getElementById("dev-name")?.value.trim();

  const host =
    document.getElementById("dev-host")?.value.trim();

  const port =
    Number(
      document.getElementById("dev-port")?.value
    );

  const username =
    document.getElementById("dev-user")?.value.trim();

  const password =
    document.getElementById("dev-pass")?.value;

  const tls =
    document.getElementById("dev-tls")?.value === "true";

  const tags =
    document
      .getElementById("dev-tags")
      ?.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) || [];

  if (
    !name ||
    !host ||
    !username
  ) {

    alert(
      "Completa nombre, host y usuario."
    );

    return;
  }

  try {

    const response =
      await fetch(
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
            tags,
            vendor
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

    /*
     * Limpiar caché del dispositivo modificado.
     *
     * Muy importante cuando se cambia:
     * MikroTik -> Cisco
     * Cisco -> MikroTik
     */
    clearDeviceCache(id);

    if (
      typeof deviceInterfaceCache !== "undefined"
    ) {
      deviceInterfaceCache.delete(id);
    }

    /*
     * Volver a cargar la lista.
     */
    await renderDevices();

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

  const device =
    devices.find(
      (item) => item.id === id
    );

  if (!device) return;

  if (
    !confirm(
      `¿Eliminar el equipo "${device.name}"?`
    )
  ) {
    return;
  }

  try {

    const response = await fetch(
      `/api/devices/${id}`,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {

      alert(
        "No se pudo eliminar el equipo."
      );

      return;
    }

    await renderDevices();

  } catch (error) {

    alert(
      "Error eliminando equipo: " +
      error.message
    );

  }

}

async function loadDeviceSelectors() {

  await loadDevices();

}



/* =========================================================
   TRAFICO DE INTERFACES
   ========================================================= */

const interfaceStats = {};
const interfaceHistory = {};

const MAX_HISTORY_POINTS = 30;

function formatTraffic(bytesPerSecond) {

  if (!bytesPerSecond || bytesPerSecond < 0) {
    return "0 bps";
  }

  const bits = bytesPerSecond * 8;

  if (bits >= 1000000000) {
    return `${(bits / 1000000000).toFixed(2)} Gbps`;
  }

  if (bits >= 1000000) {
    return `${(bits / 1000000).toFixed(2)} Mbps`;
  }

  if (bits >= 1000) {
    return `${(bits / 1000).toFixed(2)} Kbps`;
  }

  return `${bits.toFixed(0)} bps`;
}

let interfaceFilter = "physical";

const interfaceDataStore = new Map();

function getInterfaceCategory(iface) {

  const type = String(iface?.type || "").toLowerCase();
  const name = String(iface?.name || "").toLowerCase();

  if (type === "loopback" || name === "lo") {
    return "loopback";
  }

  if (type === "bridge") {
    return "bridge";
  }

  if (type === "ether") {
    return "physical";
  }

  return "virtual";
}

function filterInterfaces(interfaces) {

  if (!Array.isArray(interfaces)) {
    return [];
  }

  if (interfaceFilter === "all") {
    return interfaces;
  }

  return interfaces.filter((iface) => {

    const category =
      getInterfaceCategory(iface);

    return category === interfaceFilter;
  });
}

function changeInterfaceFilter(value) {

  interfaceFilter = value;

  const deviceId =
    window.__lastInterfaceDeviceId;

  if (!deviceId) {
    return;
  }

  const interfaces =
    interfaceDataStore.get(deviceId);

  if (!Array.isArray(interfaces)) {
    return;
  }

  renderInterfaceData(
    deviceId,
    interfaces
  );
}

function renderInterfaceFilter() {

  return `
    <select
      class="interface-filter"
      onchange="changeInterfaceFilter(this.value)"
      aria-label="Filtrar interfaces"
    >
      <option
        value="physical"
        ${interfaceFilter === "physical" ? "selected" : ""}
      >
        Físicas
      </option>

      <option
        value="all"
        ${interfaceFilter === "all" ? "selected" : ""}
      >
        Todas
      </option>

      <option
        value="bridge"
        ${interfaceFilter === "bridge" ? "selected" : ""}
      >
        Bridge
      </option>

      <option
        value="virtual"
        ${interfaceFilter === "virtual" ? "selected" : ""}
      >
        Virtuales
      </option>

      <option
        value="loopback"
        ${interfaceFilter === "loopback" ? "selected" : ""}
      >
        Loopback
      </option>
    </select>
  `;
}

function renderInterfaceData(id, physical) {

  const container =
    document.getElementById(`interfaces-${id}`);

  if (!container) return;

  const visibleInterfaces =
    filterInterfaces(physical);

  if (!visibleInterfaces.length) {
    container.innerHTML = `
      <div class="interfaces-title">
        <span>🌐 Interfaces</span>
        ${renderInterfaceFilter()}
      </div>

      <span class="muted">
        No hay interfaces para este filtro.
      </span>
    `;

    return;
  }

  const chartWidth = 600;
  const chartHeight = 150;

  function makePoints(values, maxTraffic) {

    if (!values || !values.length) {
      return "";
    }

    return values.map((value, index) => {

      const x =
        values.length === 1
          ? chartWidth
          : (index / (values.length - 1)) * chartWidth;

      const normalized =
        maxTraffic > 0
          ? value / maxTraffic
          : 0;

      const y =
        chartHeight -
        (normalized * (chartHeight - 12)) -
        6;

      return `${x.toFixed(1)},${y.toFixed(1)}`;

    }).join(" ");
  }

  function makeArea(values, maxTraffic) {

    if (!values || !values.length) {
      return "";
    }

    const points =
      values.map((value, index) => {

        const x =
          values.length === 1
            ? chartWidth
            : (index / (values.length - 1)) * chartWidth;

        const normalized =
          maxTraffic > 0
            ? value / maxTraffic
            : 0;

        const y =
          chartHeight -
          (normalized * (chartHeight - 12)) -
          6;

        return `${x.toFixed(1)},${y.toFixed(1)}`;

      });

    return [
      `0,${chartHeight}`,
      ...points,
      `${chartWidth},${chartHeight}`
    ].join(" ");
  }

  function renderChart(iface) {

    const history =
      interfaceHistory[id]?.[iface.name] || {
        rx: [],
        tx: []
      };

    const rx =
      history.rx || [];

    const tx =
      history.tx || [];

    const maxTraffic =
      Math.max(
        1,
        ...rx,
        ...tx
      );

    const rxPoints =
      makePoints(
        rx,
        maxTraffic
      );

    const txPoints =
      makePoints(
        tx,
        maxTraffic
      );

    const rxArea =
      makeArea(
        rx,
        maxTraffic
      );

    const txArea =
      makeArea(
        tx,
        maxTraffic
      );

    const lastRx =
      rx.length
        ? rx[rx.length - 1]
        : 0;

    const lastTx =
      tx.length
        ? tx[tx.length - 1]
        : 0;

    return `

      <div class="interface-chart">

        <div class="interface-chart-header">

          <div class="interface-chart-title">
            <span class="chart-icon">◉</span>
            Tráfico en tiempo real
          </div>

          <div class="interface-chart-legend">

            <span class="legend-rx">
              <i></i>
              RX
            </span>

            <span class="legend-tx">
              <i></i>
              TX
            </span>

          </div>

        </div>

        <div class="traffic-chart-wrapper">

          <svg
            viewBox="0 0 ${chartWidth} ${chartHeight}"
            preserveAspectRatio="none"
            class="traffic-chart"
            aria-label="Gráfico de tráfico ${esc(iface.name)}">

            <defs>

              <linearGradient
                id="rxGradient-${esc(id)}-${esc(iface.name)}"
                x1="0"
                y1="0"
                x2="0"
                y2="1">

                <stop
                  offset="0%"
                  stop-opacity="0.28">
                </stop>

                <stop
                  offset="100%"
                  stop-opacity="0">
                </stop>

              </linearGradient>

              <linearGradient
                id="txGradient-${esc(id)}-${esc(iface.name)}"
                x1="0"
                y1="0"
                x2="0"
                y2="1">

                <stop
                  offset="0%"
                  stop-opacity="0.20">
                </stop>

                <stop
                  offset="100%"
                  stop-opacity="0">
                </stop>

              </linearGradient>

            </defs>

            <!-- rejilla -->

            <line
              x1="0"
              y1="25%"
              x2="${chartWidth}"
              y2="25%"
              class="chart-grid">
            </line>

            <line
              x1="0"
              y1="50%"
              x2="${chartWidth}"
              y2="50%"
              class="chart-grid">
            </line>

            <line
              x1="0"
              y1="75%"
              x2="${chartWidth}"
              y2="75%"
              class="chart-grid">
            </line>

            <!-- áreas -->

            <polygon
              points="${rxArea}"
              class="traffic-rx-area">
            </polygon>

            <polygon
              points="${txArea}"
              class="traffic-tx-area">
            </polygon>

            <!-- líneas -->

            <polyline
              points="${rxPoints}"
              class="traffic-rx"
              vector-effect="non-scaling-stroke">
            </polyline>

            <polyline
              points="${txPoints}"
              class="traffic-tx"
              vector-effect="non-scaling-stroke">
            </polyline>

          </svg>

        </div>

        <div class="interface-chart-values">

          <div class="chart-current rx">

            <span class="chart-value-label">
              ↓ RX
            </span>

            <strong>
              ${formatTraffic(lastRx)}
            </strong>

          </div>

          <div class="chart-current tx">

            <span class="chart-value-label">
              ↑ TX
            </span>

            <strong>
              ${formatTraffic(lastTx)}
            </strong>

          </div>

        </div>

      </div>

    `;
  }

  container.innerHTML = `

    <div class="interfaces-title">
      <span>🌐 Interfaces</span>
      ${renderInterfaceFilter()}
    </div>

    <div class="interfaces-list">

      ${visibleInterfaces.map((iface) => {

        const running =
          iface.running === "true";

        const disabled =
          iface.disabled === "true";

        const state =
          disabled
            ? "DISABLED"
            : running
              ? "UP"
              : "DOWN";

        const stateClass =
          disabled
            ? "interface-disabled"
            : running
              ? "interface-up"
              : "interface-down";

        return `

          <div class="interface-row">

            <div class="interface-header">

              <div class="interface-name-block">

                <strong>
                  ${esc(iface.name)}
                </strong>

                <div class="interface-subtitle">
                  ${esc(iface.type || "interface")}
                </div>

              </div>

              <span class="${stateClass}">
                ● ${state}
              </span>

            </div>

            <div class="interface-meta">

              <span>
                ↓ RX
                <strong>
                  ${formatTraffic(iface._rxRate)}
                </strong>
              </span>

              <span>
                ↑ TX
                <strong>
                  ${formatTraffic(iface._txRate)}
                </strong>
              </span>

              <span>
                RX packets:
                <strong>
                  ${esc(iface["rx-packet"] || "0")}
                </strong>
              </span>

              <span>
                TX packets:
                <strong>
                  ${esc(iface["tx-packet"] || "0")}
                </strong>
              </span>

            </div>

            ${renderChart(iface)}

            <div class="interface-details">

              <span>
                MTU:
                <strong>
                  ${esc(
                    iface["actual-mtu"] ||
                    iface.mtu ||
                    "-"
                  )}
                </strong>
              </span>

              <span>
                MAC:
                <strong>
                  ${esc(
                    iface["mac-address"] ||
                    "-"
                  )}
                </strong>
              </span>

            </div>

            <div class="interface-errors">

              Drops:
              <strong>
                ${
                  Number(iface["rx-drop"] || 0) +
                  Number(iface["tx-drop"] || 0)
                }
              </strong>

              ·

              Errors:
              <strong>
                ${
                  Number(iface["rx-error"] || 0) +
                  Number(iface["tx-error"] || 0)
                }
              </strong>

            </div>

          </div>

        `;

      }).join("")}

    </div>

  `;
}
async function loadDeviceInterfaces(id) {

  window.__lastInterfaceDeviceId = id;

  const container =
    document.getElementById(`interfaces-${id}`);

  if (!container) return;


  const cached =
    getCachedInterfaces(id);

  if (cached) {

    if (cached.html) {
      container.innerHTML = cached.html;
    }

    return;
  }


  try {
    const response = await fetch(
      `/api/devices/${id}/interfaces`,
      {
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || "No se pudieron obtener las interfaces"
      );
    }

    const interfaces =
      Array.isArray(data.result)
        ? data.result
        : [];

    const physical =
      interfaces.filter((iface) =>
        iface.type !== "loopback" &&
        iface.type !== "bridge" &&
        iface.type !== "vlan"
      );

    if (!interfaceStats[id]) {
      interfaceStats[id] = {};
    }

    const now = Date.now();

    physical.forEach((iface) => {

      const name = iface.name;

      const rx =
        Number(iface["rx-byte"] || 0);

      const tx =
        Number(iface["tx-byte"] || 0);

      const previous =
        interfaceStats[id][name];

      let rxRate = 0;
      let txRate = 0;

      if (previous) {

        const elapsed =
          (now - previous.time) / 1000;

        if (elapsed > 0) {

          rxRate =
            Math.max(
              0,
              (rx - previous.rx) / elapsed
            );

          txRate =
            Math.max(
              0,
              (tx - previous.tx) / elapsed
            );

        }

      }

      interfaceStats[id][name] = {
        rx,
        tx,
        time: now
      };

      iface._rxRate = rxRate;
      iface._txRate = txRate;

      if (!interfaceHistory[id]) {
        interfaceHistory[id] = {};
      }

      if (!interfaceHistory[id][name]) {
        interfaceHistory[id][name] = {
          rx: [],
          tx: []
        };
      }

      const history =
        interfaceHistory[id][name];

      history.rx.push(rxRate);
      history.tx.push(txRate);

      if (history.rx.length > MAX_HISTORY_POINTS) {
        history.rx.shift();
      }

      if (history.tx.length > MAX_HISTORY_POINTS) {
        history.tx.shift();
      }

    });

    const visibleInterfaces =
      filterInterfaces(interfaces);

    if (!visibleInterfaces.length) {

      container.innerHTML = `
        <div class="interfaces-title">
          <span>🌐 Interfaces</span>
          ${renderInterfaceFilter()}
        </div>

        <span class="muted">
          No hay interfaces para este filtro.
        </span>
      `;

      return;
    }

    container.innerHTML = `

      <div class="interfaces-title">
        <span>🌐 Interfaces</span>
        ${renderInterfaceFilter()}
      </div>

      <div class="interfaces-list">

        ${visibleInterfaces.map((iface) => {

          const running =
            iface.running === "true";

          const disabled =
            iface.disabled === "true";

          const state =
            disabled
              ? "DISABLED"
              : running
                ? "UP"
                : "DOWN";

          const stateClass =
            disabled
              ? "interface-disabled"
              : running
                ? "interface-up"
                : "interface-down";

          const history =
            interfaceHistory[id]?.[iface.name] || {
              rx: [],
              tx: []
            };

          const maxTraffic =
            Math.max(
              1,
              ...history.rx,
              ...history.tx
            );

          const chartWidth = 300;
          const chartHeight = 70;

          function makeChartPath(values) {

            if (!values.length) {
              return "";
            }

            return values.map((value, index) => {

              const x =
                values.length === 1
                  ? 0
                  : (index / (values.length - 1)) * chartWidth;

              const y =
                chartHeight -
                ((value / maxTraffic) * chartHeight);

              return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;

            }).join(" ");

          }

          const rxPath =
            makeChartPath(history.rx);

          const txPath =
            makeChartPath(history.tx);

          return `

            <div class="interface-row">

              <div class="interface-header">

                <div>
                  <strong>
                    ${esc(iface.name)}
                  </strong>

                  <div class="interface-subtitle">
                    ${esc(iface.type || "interface")}
                  </div>
                </div>

                <span class="${stateClass}">
                  ● ${state}
                </span>

              </div>

              <div class="interface-meta">

                <span>
                  ↓ RX
                  <strong>
                    ${formatTraffic(iface._rxRate)}
                  </strong>
                </span>

                <span>
                  ↑ TX
                  <strong>
                    ${formatTraffic(iface._txRate)}
                  </strong>
                </span>

                <span>
                  RX packets:
                  <strong>
                    ${esc(iface["rx-packet"] || "0")}
                  </strong>
                </span>

                <span>
                  TX packets:
                  <strong>
                    ${esc(iface["tx-packet"] || "0")}
                  </strong>
                </span>

              </div>

              <div class="interface-chart">

                <div class="interface-chart-header">
                  <span>📈 Tráfico</span>

                  <span class="interface-chart-legend">
                    <span>↓ RX</span>
                    <span>↑ TX</span>
                  </span>
                </div>

                <svg
                  viewBox="0 0 300 70"
                  preserveAspectRatio="none"
                  class="traffic-chart">

                  <path
                    d="${rxPath}"
                    class="traffic-rx"
                    fill="none"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke">
                  </path>

                  <path
                    d="${txPath}"
                    class="traffic-tx"
                    fill="none"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke">
                  </path>

                </svg>

              </div>

              <div class="interface-details">

                <span>
                  MTU:
                  <strong>
                    ${esc(iface["actual-mtu"] || iface.mtu || "-")}
                  </strong>
                </span>

                <span>
                  MAC:
                  <strong>
                    ${esc(iface["mac-address"] || "-")}
                  </strong>
                </span>

              </div>

              <div class="interface-errors">

                Drops:
                <strong>
                  ${Number(iface["rx-drop"] || 0) +
                    Number(iface["tx-drop"] || 0)}
                </strong>

                ·

                Errors:
                <strong>
                  ${Number(iface["rx-error"] || 0) +
                    Number(iface["tx-error"] || 0)}
                </strong>

              </div>

            </div>

          `;

        }).join("")}

      </div>

    `;

  } catch (error) {

    console.error(
      `[INTERFACES ${id}]`,
      error
    );

    container.innerHTML = `
      <span class="muted">
        No se pudo obtener tráfico.
      </span>
    `;

  }

}


/* =========================================================
   ACTUALIZACION AUTOMATICA DE RECURSOS
   ========================================================= */

let monitoringRunning = false;

async function refreshMonitoring() {

  if (monitoringRunning || !devices.length) {
    return;
  }

  monitoringRunning = true;

  try {

    /*
     * Monitoreo controlado.
     *
     * Cada equipo utiliza /monitor, que devuelve:
     * - resource
     * - interfaces
     *
     * dentro de una sola sesión RouterOS.
     */

    const checkDevice = async (device) => {

      const status =
        document.getElementById(
          `status-${device.id}`
        );

      const resource =
        document.getElementById(
          `resource-${device.id}`
        );

      const interfaces =
        document.getElementById(
          `interfaces-${device.id}`
        );

      if (!status) {
        return;
      }

      status.textContent = "● COMPROBANDO";
      status.className =
        "badge device-checking";

      const startedAt = performance.now();

      try {

        const response = await fetch(
          `/api/devices/${device.id}/monitor`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        let data = null;

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (
          !response.ok ||
          !data?.ok ||
          data.online !== true
        ) {
          throw new Error(
            data?.error ||
            "No se pudo conectar al dispositivo"
          );
        }

        const latency =
          Math.max(
            0,
            Math.round(
              performance.now() - startedAt
            )
          );

        /*
         * ================================
         * ONLINE REAL
         * ================================
         */

        status.textContent = "● ONLINE";
        status.className =
          "badge device-online";

        const rawResource =
          Array.isArray(data.resource)
            ? data.resource[0]
            : data.resource;

        /*
         * ================================
         * RESOURCE
         * ================================
         */

        if (resource && rawResource) {

          const totalMemory =
            Number(
              rawResource["total-memory"] || 0
            );

          const freeMemory =
            Number(
              rawResource["free-memory"] || 0
            );

          const usedMemory =
            Math.max(
              0,
              totalMemory - freeMemory
            );

          const ramPercent =
            totalMemory > 0
              ? (usedMemory / totalMemory) * 100
              : 0;

          const totalDisk =
            Number(
              rawResource["total-hdd-space"] || 0
            );

          const freeDisk =
            Number(
              rawResource["free-hdd-space"] || 0
            );

          const usedDisk =
            Math.max(
              0,
              totalDisk - freeDisk
            );

          const diskPercent =
            totalDisk > 0
              ? (usedDisk / totalDisk) * 100
              : 0;

          const cpuPercent =
            Math.min(
              100,
              Math.max(
                0,
                Number(
                  rawResource["cpu-load"] || 0
                )
              )
            );

          const formatBytes = (bytes) => {

            if (!bytes || bytes < 0) {
              return "0 B";
            }

            const units = [
              "B",
              "KB",
              "MB",
              "GB",
              "TB"
            ];

            let value = bytes;
            let index = 0;

            while (
              value >= 1024 &&
              index < units.length - 1
            ) {
              value /= 1024;
              index++;
            }

            return `${value.toFixed(
              value >= 10 || index === 0
                ? 0
                : 1
            )} ${units[index]}`;
          };

          const metric = (
            icon,
            label,
            percent,
            detail
          ) => `
            <div class="resource-metric">

              <div class="resource-metric-header">

                <span>
                  ${icon} ${label}
                </span>

                <strong>
                  ${percent.toFixed(0)}%
                </strong>

              </div>

              <div class="resource-bar">

                <div
                  class="resource-bar-fill"
                  style="width:${percent.toFixed(1)}%">
                </div>

              </div>

              <div class="resource-detail">
                ${detail}
              </div>

            </div>
          `;

          resource.innerHTML = `

            <div class="resource-grid">

              ${metric(
                "⚡",
                "CPU",
                cpuPercent,
                `${esc(rawResource["cpu"] || "-")} · ${esc(rawResource["cpu-frequency"] || "-")} MHz`
              )}

              ${metric(
                "🧠",
                "RAM",
                ramPercent,
                `${formatBytes(usedMemory)} usados / ${formatBytes(totalMemory)}`
              )}

              ${metric(
                "💾",
                "DISCO",
                diskPercent,
                `${formatBytes(usedDisk)} usados / ${formatBytes(totalDisk)}`
              )}

            </div>

            <div class="resource-info">

              <span>
                ⏱️ Uptime:
                <strong>
                  ${esc(rawResource.uptime || "-")}
                </strong>
              </span>

              <span>
                RouterOS:
                <strong>
                  ${esc(rawResource.version || "-")}
                </strong>
              </span>

              <span>
                CPU:
                <strong>
                  ${esc(rawResource["cpu"] || "-")}
                </strong>
              </span>

              <span>
                Cores:
                <strong>
                  ${esc(rawResource["cpu-count"] || "-")}
                </strong>
              </span>

            </div>

            <div class="resource-info">

              <span>
                API:
                <strong>
                  ${latency} ms
                </strong>
              </span>

              <span>
                Estado:
                <strong>
                  Operativo
                </strong>
              </span>

            </div>
          `;
        }

        /*
         * ================================
         * INTERFACES
         * ================================
         */

        const allInterfaces =
          Array.isArray(data.interfaces)
            ? data.interfaces
            : [];

        /*
         * Guardar interfaces para el filtro visual.
         * No realiza una nueva consulta al MikroTik.
         */
        interfaceDataStore.set(
          device.id,
          allInterfaces
        );

        window.__lastInterfaceDeviceId =
          device.id;

        const physical =
          allInterfaces.filter(
            (iface) =>
              iface.type !== "loopback" &&
              iface.type !== "bridge" &&
              iface.type !== "vlan"
          );

        if (!interfaceStats[device.id]) {
          interfaceStats[device.id] = {};
        }

        const now = Date.now();

        physical.forEach((iface) => {

          const name = iface.name;

          const rx =
            Number(
              iface["rx-byte"] || 0
            );

          const tx =
            Number(
              iface["tx-byte"] || 0
            );

          const previous =
            interfaceStats[device.id][name];

          let rxRate = 0;
          let txRate = 0;

          if (previous) {

            const elapsed =
              (now - previous.time) / 1000;

            if (elapsed > 0) {

              rxRate =
                Math.max(
                  0,
                  (rx - previous.rx) / elapsed
                );

              txRate =
                Math.max(
                  0,
                  (tx - previous.tx) / elapsed
                );

            }
          }

          interfaceStats[device.id][name] = {
            rx,
            tx,
            time: now
          };

	iface._rxRate = rxRate;
iface._txRate = txRate;

/*
 * Guardar historial de tráfico RX/TX
 */

if (!interfaceHistory[device.id]) {
  interfaceHistory[device.id] = {};
}

if (!interfaceHistory[device.id][name]) {
  interfaceHistory[device.id][name] = {
    rx: [],
    tx: []
  };
}

const history =
  interfaceHistory[device.id][name];

history.rx.push(rxRate);
history.tx.push(txRate);

if (history.rx.length > MAX_HISTORY_POINTS) {
  history.rx.shift();
}

if (history.tx.length > MAX_HISTORY_POINTS) {
  history.tx.shift();
}

});
        /*
         * Renderizar las interfaces con la lógica existente.
         */
        if (
          Array.isArray(allInterfaces) &&
          typeof renderInterfaceData === "function"
        ) {

          renderInterfaceData(
            device.id,
            allInterfaces
          );

        }

        /*
         * CACHE
         */

        setDeviceCache(device.id, {
          online: true,
          resourceHTML:
            resource?.innerHTML || "",
          metrics: {
            cpu:
              Number(
                rawResource?.["cpu-load"] || 0
              ),
            ram:
              rawResource
                ? (
                    Number(
                      rawResource["total-memory"] || 0
                    ) > 0
                      ? (
                          (
                            Number(
                              rawResource["total-memory"] || 0
                            ) -
                            Number(
                              rawResource["free-memory"] || 0
                            )
                          ) /
                          Number(
                            rawResource["total-memory"] || 1
                          )
                        ) * 100
                      : 0
                  )
                : 0,
            disk:
              rawResource
                ? (
                    Number(
                      rawResource["total-hdd-space"] || 0
                    ) > 0
                      ? (
                          (
                            Number(
                              rawResource["total-hdd-space"] || 0
                            ) -
                            Number(
                              rawResource["free-hdd-space"] || 0
                            )
                          ) /
                          Number(
                            rawResource["total-hdd-space"] || 1
                          )
                        ) * 100
                      : 0
                  )
                : 0,
            uptime:
              rawResource?.uptime || "-",
            version:
              rawResource?.version || "-",
            cpuName:
              rawResource?.cpu || "-",
            cpuCount:
              rawResource?.["cpu-count"] || 0,
            cpuFrequency:
              rawResource?.["cpu-frequency"] || 0,
            lastCheck:
              Date.now(),
            latency
          }
        });

      } catch (error) {

        /*
         * ================================
         * OFFLINE REAL
         * ================================
         */

        status.textContent = "● OFFLINE";
        status.className =
          "badge device-offline";

        if (resource) {

          resource.innerHTML = `
            <span class="muted">
              Sin conexión al MikroTik
            </span>
          `;

        }

        if (interfaces) {

          interfaces.innerHTML = `
            <span class="muted">
              Monitoreo no disponible
            </span>
          `;

        }

        setDeviceCache(device.id, {
          online: false,
          resourceHTML:
            resource?.innerHTML || "",
          lastCheck:
            Date.now(),
          error:
            error?.message ||
            "Error de conexión"
        });

        console.warn(
          `[MONITOR ${device.host}]`,
          error?.message || error
        );

      }

    };

    /*
     * Ejecutar los equipos en paralelo.
     *
     * Cada fetch corresponde a UNA sesión RouterOS
     * administrada por el driver.
     */
    await Promise.all(
      devices.map(checkDevice)
    );

  } finally {

    monitoringRunning = false;

  }

}

/* =========================================================
   MONITOREO AUTOMÁTICO
   ========================================================= */

/*
 * ÚNICO scheduler del monitoreo.
 *
 * renderDevices() NO ejecuta monitorización.
 * El polling se controla aquí.
 */

let monitoringTimer = null;

function startMonitoringScheduler() {

  if (monitoringTimer !== null) {
    return;
  }

  /*
   * Primera comprobación.
   */
  refreshMonitoring();

  /*
   * Posteriormente cada 60 segundos.
   */
  monitoringTimer = setInterval(
    () => {
      refreshMonitoring();
    },
    60000
  );
}

startMonitoringScheduler();

