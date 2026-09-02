window.$ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

const pageInfo = {
  dashboard: {
    title: "Dashboard",
    desc: "Resumen de infraestructura MikroTik"
  },
  devices: {
    title: "Equipos",
    desc: "Administración de dispositivos RouterOS"
  },
  monitor: {
    title: "Monitor",
    desc: "Supervisión de equipos MikroTik"
  },
  builder: {
    title: "Generador de scripts",
    desc: "Constructor visual de configuraciones RouterOS"
  },
  hotspot: {
    title: "Hotspot",
    desc: "Portal cautivo y generación de fichas"
  },
  terminal: {
    title: "Terminal",
    desc: "Terminal remota RouterOS"
  },
  audit: {
    title: "Auditoría",
    desc: "Historial de operaciones"
  }
};

function showPage(page) {

  const pages =
    document.querySelectorAll(".page");

  /*
   * PRODUCCION:
   * garantizar que todas las paginas excepto
   * la solicitada queden realmente ocultas.
   */
  pages.forEach((section) => {

    const active =
      section.id === page;

    section.classList.toggle(
      "hidden",
      !active
    );

    section.style.display =
      active ? "" : "none";
  });

  const target = $(page);

  if (!target) {
    console.warn(
      "[NAV] Pagina no encontrada:",
      page
    );
    return;
  }

  target.classList.remove("hidden");
  target.style.display = "";

  /*
   * Confirmar exclusividad visual.
   */
  pages.forEach((section) => {

    if (section !== target) {
      section.classList.add("hidden");
      section.style.display = "none";
    }

  });

  document
    .querySelectorAll("nav button[data-page]")
    .forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });

  const info =
    pageInfo[page];

  if (info) {

    const title =
      $("pageTitle");

    const desc =
      $("pageDesc");

    if (title) {
      title.textContent =
        info.title;
    }

    if (desc) {
      desc.textContent =
        info.desc;
    }

  }

  /*
   * Cargar únicamente lo necesario para
   * la página activa.
   */

  if (
    page === "dashboard" &&
    typeof loadDashboard === "function"
  ) {
    loadDashboard();
  }

  if (
    page === "devices" &&
    typeof renderDevices === "function"
  ) {
    renderDevices();
  }

  if (
    page === "monitor" &&
    typeof loadDeviceSelectors === "function"
  ) {
    loadDeviceSelectors();
  }

  if (
    page === "terminal" &&
    typeof loadDeviceSelectors === "function"
  ) {
    loadDeviceSelectors();
  }

  if (
    page === "hotspot" &&
    typeof loadHotspotDevices === "function"
  ) {
    loadHotspotDevices();
  }

  if (
    page === "audit" &&
    typeof loadAudit === "function"
  ) {
    loadAudit();
  }
}

document.addEventListener("DOMContentLoaded", () => {

  document
    .querySelectorAll("nav button[data-page]")
    .forEach((button) => {

      button.addEventListener("click", () => {
        showPage(button.dataset.page);
      });

    });

  showPage("dashboard");

});


async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("No se pudo cerrar la sesión");
    }

    window.location.href = "/login.html";
  } catch (error) {
    console.error("[LOGOUT]", error);
    alert("No se pudo cerrar la sesión.");
  }
}
