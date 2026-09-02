import express from "express";
import pg from "pg";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getDriver,
  closeAllDrivers
} from "./drivers/index.js";
const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* =========================================================
   MANEJO GLOBAL DE ERRORES
   Evita que una excepciÃ³n interna de node-routeros
   termine completamente el proceso de Node.js.
   ========================================================= */

process.on("uncaughtException", (err) => {
  console.error(
    "[UNCAUGHT EXCEPTION]",
    err?.stack || err
  );
});

process.on("unhandledRejection", (reason) => {
  console.error(
    "[UNHANDLED REJECTION]",
    reason?.stack || reason
  );
});

/* =========================================================
   POSTGRESQL
   ========================================================= */

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://mikrotik:change_me_now@localhost:5432/mikrotik"
});

const db = (sql, params = []) => pool.query(sql, params);

/* =========================================================
   BASE DE DATOS
   ========================================================= */

await db(`
  CREATE TABLE IF NOT EXISTS devices(
    id uuid PRIMARY KEY,
    name text NOT NULL,
    host text NOT NULL,
    port int NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    tls boolean DEFAULT false,
    tags text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now()
  );

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS vendor text NOT NULL DEFAULT 'mikrotik';

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS platform text;

    ALTER TABLE devices
      ADD COLUMN IF NOT EXISTS protocol text NOT NULL DEFAULT 'routeros';

  CREATE TABLE IF NOT EXISTS audit(
    id bigserial PRIMARY KEY,
    device_id uuid,
    action text,
    command text,
    ok boolean,
    message text,
    created_at timestamptz DEFAULT now()
  );
`);

/* =========================================================
   RESPUESTA PUBLICA DE DISPOSITIVOS
   No devuelve password.
   ========================================================= */

function pub(d) {
  return {
    id: d.id,
    name: d.name,
    host: d.host,
    port: d.port,
    username: d.username,
    tls: d.tls,
    tags: d.tags || []
  };
}

/* =========================================================
   OBTENER DISPOSITIVO
   ========================================================= */

async function getDevice(id) {
  const r = await db(
    "SELECT * FROM devices WHERE id = $1",
    [id]
  );

  return r.rows[0];
}


/* =========================================================
   UTILIDADES HOTSPOT
   ========================================================= */

function randomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(0, chars.length)];
  }

  return result;
}

function normalizeHotspotParams(body = {}) {
  return {
    interface: String(body.interface || "bridge-LAN").trim(),
    network: String(body.network || "192.168.20.0/24").trim(),
    gateway: String(body.gateway || "192.168.20.1").trim(),
    poolStart: String(body.poolStart || "192.168.20.10").trim(),
    poolEnd: String(body.poolEnd || "192.168.20.254").trim(),
    dns: String(body.dns || "1.1.1.1,8.8.8.8").trim(),
    profile: String(body.profile || "hotspot-profile").trim(),
    server: String(body.server || "hotspot1").trim(),
    pool: String(body.pool || "hotspot-pool").trim()
  };
}
/* =========================================================
   AUDITORIA
   ========================================================= */

async function log(
  id,
  action,
  command,
  ok,
  message
) {
  try {
    await db(
      `
      INSERT INTO audit(
        device_id,
        action,
        command,
        ok,
        message
      )
      VALUES($1,$2,$3,$4,$5)
      `,
      [
        id,
        action,
        command,
        ok,
        message
      ]
    );
  } catch (error) {
    console.error(
      "[AUDIT ERROR]",
      error?.message || error
    );
  }
}

/* =========================================================
   CREAR CONEXION MIKROTIK
   ========================================================= */

async function apiFor(d) {

  const driver = getDriver(d);

  await driver.connect();

  return driver;
}

/* =========================================================
   EJECUTOR GENERAL
   ========================================================= */

async function run(
  id,
  action,
  command,
  fn,
  res
) {
  const d = await getDevice(id);

  if (!d) {
    return res.status(404).json({
      ok: false,
      error: "Equipo no encontrado"
    });
  }

  let driver = null;

  try {
    driver = await apiFor(d);

    const result = await fn(driver);

    await log(
      id,
      action,
      command,
      true,
      "OK"
    );

    return res.json({
      ok: true,
      result: result ?? []
    });

  } catch (error) {

    console.error(
      `[${action}] ERROR`,
      error?.stack || error
    );

    try {
      if (driver) {
        await driver.close();
      }
    } catch (closeError) {
      console.error(
        `[${action}] Error cerrando conexión después del fallo:`,
        closeError?.message || closeError
      );
    }

    await log(
      id,
      action,
      command,
      false,
      error?.message || String(error)
    );

    if (!res.headersSent) {
      return res.status(502).json({
        ok: false,
        error:
          error?.message ||
          "Error ejecutando operación"
      });
    }
  }
}

/* =========================================================
   DISPOSITIVOS
   ========================================================= */

app.get(
  "/api/devices",
  async (req, res) => {
    try {
      const r = await db(
        "SELECT * FROM devices ORDER BY created_at DESC"
      );

      return res.json(
        r.rows.map(pub)
      );

    } catch (error) {
      console.error(
        "[GET DEVICES]",
        error?.stack || error
      );

      return res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "Error obteniendo dispositivos"
      });
    }
  }
);

/* =========================================================
   CREAR DISPOSITIVO
   ========================================================= */

app.post(
  "/api/devices",
  async (req, res) => {
    try {
      const {
        name,
        host,
        port,
        username,
        password,
        tls,
        tags = [],
        vendor = "mikrotik",
        platform = null,
        protocol = null
      } = req.body;

      if (
        !name ||
        !host ||
        !username ||
        !password
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Completa nombre, host, usuario y contraseÃ±a"
        });
      }

      const normalizedVendor =
        String(vendor || "mikrotik")
          .trim()
          .toLowerCase();

      const allowedVendors = [
        "mikrotik",
        "cisco"
      ];

      if (!allowedVendors.includes(normalizedVendor)) {
        return res.status(400).json({
          ok: false,
          error:
            `Fabricante no soportado: ${normalizedVendor}`
        });
      }

      const normalizedPlatform =
        platform ||
        (
          normalizedVendor === "cisco"
            ? "ios"
            : "routeros"
        );

      const normalizedProtocol =
        protocol ||
        (
          normalizedVendor === "cisco"
            ? "ssh"
            : (
                tls
                  ? "routeros-ssl"
                  : "routeros"
              )
        );

      const finalPort =
        Number(port) ||
        (
          normalizedVendor === "cisco"
            ? 22
            : (
                tls
                  ? 8729
                  : 8728
              )
        );

      const id =
        crypto.randomUUID();

      const r = await db(
        `
        INSERT INTO devices(
          id,
          name,
          host,
          port,
          username,
          password,
          tls,
          tags,
          vendor,
          platform,
          protocol
        )
        VALUES(
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        RETURNING *
        `,
        [
          id,
          name,
          host,
          finalPort,
          username,
          password,
          !!tls,
          tags,
          normalizedVendor,
          normalizedPlatform,
          normalizedProtocol
        ]
      );

      return res.status(201).json(
        pub(r.rows[0])
      );

    } catch (error) {
      console.error(
        "[POST DEVICE]",
        error?.stack || error
      );

      return res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "Error creando dispositivo"
      });
    }
  }
);


/* =========================================================
   EDITAR DISPOSITIVO
   ========================================================= */

app.put(
  "/api/devices/:id",
  async (req, res) => {
    try {
      const {
        name,
        host,
        port,
        username,
        password,
        tls,
        tags = [],
        vendor = "mikrotik",
        platform = null,
        protocol = null
      } = req.body;

      if (
        !name ||
        !host ||
        !username
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Completa nombre, host y usuario"
        });
      }

      

      
        const normalizedVendor =
          String(vendor || "mikrotik")
            .trim()
            .toLowerCase();

        const allowedVendors = [
          "mikrotik",
          "cisco"
        ];

        if (!allowedVendors.includes(normalizedVendor)) {
          return res.status(400).json({
            ok: false,
            error:
              `Fabricante no soportado: ${normalizedVendor}`
          });
        }

        const normalizedPlatform =
          platform ||
          (
            normalizedVendor === "cisco"
              ? "ios"
              : "routeros"
          );

        const normalizedProtocol =
          protocol ||
          (
            normalizedVendor === "cisco"
              ? "ssh"
              : (
                  tls
                    ? "routeros-ssl"
                    : "routeros"
                )
          );

        const finalPort =
          Number(port) ||
          (
            normalizedVendor === "cisco"
              ? 22
              : (
                  tls
                    ? 8729
                    : 8728
                )
              );



      let query;
      let params;

      /*
       * Si no se envía contraseña,
       * conservamos la actual.
       */
      if (password) {

        query = `
          UPDATE devices
          SET
            name = $1,
            host = $2,
            port = $3,
            username = $4,
            password = $5,
              tls = $6,
              tags = $7,
              vendor = $8,
              platform = $9,
              protocol = $10
            WHERE id = $11
          RETURNING *
        `;

        params = [
            name,
            host,
            finalPort,
            username,
            password,
            !!tls,
            tags,
            normalizedVendor,
            normalizedPlatform,
            normalizedProtocol,
            req.params.id
          ];

      } else {

        query = `
          UPDATE devices
          SET
            name = $1,
            host = $2,
            port = $3,
            username = $4,
            tls = $5,
              tags = $6,
              vendor = $7,
              platform = $8,
              protocol = $9
            WHERE id = $10
          RETURNING *
        `;

        params = [
            name,
            host,
            finalPort,
            username,
            !!tls,
            tags,
            normalizedVendor,
            normalizedPlatform,
            normalizedProtocol,
            req.params.id
          ];
      }

      const r = await db(
        query,
        params
      );

      if (!r.rows.length) {
        return res.status(404).json({
          ok: false,
          error:
            "Dispositivo no encontrado"
        });
      }

      return res.json(
        pub(r.rows[0])
      );

    } catch (error) {

      console.error(
        "[PUT DEVICE]",
        error?.stack || error
      );

      return res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "Error actualizando dispositivo"
      });
    }
  }
);


/* =========================================================
   ELIMINAR DISPOSITIVO
   ========================================================= */

app.delete(
  "/api/devices/:id",
  async (req, res) => {
    try {
      await db(
        "DELETE FROM devices WHERE id = $1",
        [req.params.id]
      );

      return res.sendStatus(204);

    } catch (error) {
      console.error(
        "[DELETE DEVICE]",
        error?.stack || error
      );

      return res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "Error eliminando dispositivo"
      });
    }
  }
);

/* =========================================================
   TEST
   ========================================================= */

app.post(
  "/api/devices/:id/test",
  async (req, res) => {
    return run(
      req.params.id,
      "TEST",
      "/system/identity/print",
      async (driver) => {
          return await driver.getIdentity();
        },
      res
    );
  }
);

/* =========================================================
   IDENTITY
   ========================================================= */

app.get(
  "/api/devices/:id/identity",
  async (req, res) => {
    return run(
      req.params.id,
      "IDENTITY",
      "/system/identity/print",
      async (driver) => {
          return await driver.getIdentity();
        },
      res
    );
  }
);

/* =========================================================
   RESOURCE
   ========================================================= */

app.get(
  "/api/devices/:id/resource",
  async (req, res) => {
    return run(
      req.params.id,
      "RESOURCE",
      "/system/resource/print",
      async (driver) => {
          return await driver.getResource();
        },
      res
    );
  }
);

/* =========================================================
   INTERFACES
   ========================================================= */

app.get(
  "/api/devices/:id/interfaces",
  async (req, res) => {
    return run(
      req.params.id,
      "INTERFACES",
      "/interface/print",
      async (driver) => {
          return await driver.getInterfaces();
        },
      res
    );
  }
);

/* =========================================================
   MONITOR - RESOURCE + INTERFACES
   ========================================================= */

app.get(
  "/api/devices/:id/monitor",
  async (req, res) => {

    const d = await getDevice(req.params.id);

    if (!d) {
      return res.status(404).json({
        ok: false,
        online: false,
        error: "Equipo no encontrado"
      });
    }

    let driver = null;

    try {

      console.log(
        `[MONITOR] Conectando a ${d.host}:${d.port}`
      );

      driver = await apiFor(d);

      const monitor = await driver.getMonitor();

      await log(
        req.params.id,
        "MONITOR",
        "/system/resource/print + /interface/print",
        true,
        "OK"
      );

      return res.json({
        ok: true,
        online: true,
        resource: monitor.resource,
        interfaces: monitor.interfaces
      });

    } catch (error) {

      console.error(
        "[MONITOR ERROR]",
        error?.stack || error
      );

      try {
        if (driver) {
          await driver.close();
        }
      } catch (closeError) {
        console.error(
          "[MONITOR] Error cerrando conexión después del fallo:",
          closeError?.message || closeError
        );
      }

      await log(
        req.params.id,
        "MONITOR",
        "/system/resource/print + /interface/print",
        false,
        error?.message || String(error)
      );

      return res.status(502).json({
        ok: false,
        online: false,
        error:
          error?.message ||
          "No se pudo conectar al dispositivo"
      });
    }
  }
);

/* =========================================================
   IP ADDRESSES
   ========================================================= */

app.get(
  "/api/devices/:id/ip",
  async (req, res) => {
    return run(
      req.params.id,
      "IP",
      "/ip/address/print",
      async (driver) => {
        return await driver.getIpAddresses();
      },
      res
    );
  }
);

/* =========================================================
   ROUTES
   ========================================================= */

app.get(
  "/api/devices/:id/routes",
  async (req, res) => {
    return run(
      req.params.id,
      "ROUTES",
      "/ip/route/print",
      async (driver) => {
        return await driver.getRoutes();
      },
      res
    );
  }
);

/* =========================================================
   FIREWALL
   ========================================================= */

app.get(
  "/api/devices/:id/firewall",
  async (req, res) => {
    return run(
      req.params.id,
      "FIREWALL",
      "/ip/firewall/filter/print",
      async (driver) => {
        return await driver.getFirewall();
      },
      res
    );
  }
);

/* =========================================================
   DHCP
   ========================================================= */

app.get(
  "/api/devices/:id/dhcp",
  async (req, res) => {

    console.log(
      "[DHCP] Solicitud recibida"
    );

    return run(
      req.params.id,
      "DHCP",
      "/ip/dhcp-server/lease/print",
      async (driver) => {

        console.log(
          "[DHCP] Ejecutando /ip/dhcp-server/lease/print"
        );

        const result =
          await driver.getDhcpLeases();

        /*
         * RouterOS puede devolver un array vacÃ­o
         * cuando no existen leases.
         */

        if (!result) {
          console.log(
            "[DHCP] Resultado vacÃ­o"
          );

          return [];
        }

        console.log(
          `[DHCP] Resultado recibido: ${
            Array.isArray(result)
              ? result.length
              : 1
          } registros`
        );

        return result;
      },
      res
    );
  }
);




/* =========================================================
   HOTSPOT - INFORMACION
   ========================================================= */

app.get(
  "/api/devices/:id/hotspot",
  async (req, res) => {

    return run(
      req.params.id,
      "HOTSPOT",
      "/ip/hotspot/print",
      async (driver) => {
        return await driver.getHotspot();
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - CREAR CONFIGURACION
   ========================================================= */

app.post(
  "/api/devices/:id/hotspot/setup",
  async (req, res) => {

    const config = normalizeHotspotParams(req.body);

    return run(
      req.params.id,
      "HOTSPOT_SETUP",
      "/ip/hotspot/setup",
      async (driver) => {

        return await driver.setupHotspot(config);

      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - CREAR PERFIL
   ========================================================= */

app.post(
  "/api/devices/:id/hotspot/profiles",
  async (req, res) => {

    const name =
      String(req.body?.name || "").trim();

    const sessionTimeout =
      String(req.body?.sessionTimeout || "").trim();

    const sharedUsers =
      Number(req.body?.sharedUsers) || 1;

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Nombre de perfil requerido"
      });
    }

    return run(
      req.params.id,
      "HOTSPOT_PROFILE_ADD",
      "/ip/hotspot/user/profile/add",
      async (driver) => {

        return await driver.createHotspotProfile({
          name,
          sharedUsers,
          sessionTimeout
        });

      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - GENERAR FICHAS
   ========================================================= */

app.post(
  "/api/devices/:id/hotspot/vouchers",
  async (req, res) => {

    const quantity =
      Math.min(
        Math.max(
          Number(req.body?.quantity) || 1,
          1
        ),
        500
      );

    const profile =
      String(
        req.body?.profile || "voucher-1h"
      ).trim();

    const prefix =
      String(
        req.body?.prefix || "VCH"
      ).trim();

    return run(
      req.params.id,
      "HOTSPOT_VOUCHERS",
      "/ip/hotspot/user/add",
      async (driver) => {

        const vouchers = [];

        for (let i = 0; i < quantity; i++) {

          const username =
            `${prefix}-${randomCode(6)}`;

          const password =
            randomCode(6);

          const result =
            await driver.createHotspotVoucher({
              username,
              password,
              profile
            });

          vouchers.push({
            username,
            password,
            profile,
            result
          });
        }

        return vouchers;
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - LISTAR FICHAS
   ========================================================= */

app.get(
  "/api/devices/:id/hotspot/vouchers",
  async (req, res) => {

    return run(
      req.params.id,
      "HOTSPOT_VOUCHERS_LIST",
      "/ip/hotspot/user/print",
      async (driver) => {

        const result =
          await driver.getHotspotVouchers();

        return Array.isArray(result)
          ? result
          : [];
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - CREAR FICHA INDIVIDUAL
   ========================================================= */

app.post(
  "/api/devices/:id/hotspot/voucher",
  async (req, res) => {

    const username =
      String(
        req.body?.username ||
        `VCH-${randomCode(6)}`
      ).trim();

    const password =
      String(
        req.body?.password ||
        randomCode(6)
      ).trim();

    const profile =
      String(
        req.body?.profile ||
        "voucher-1h"
      ).trim();

    return run(
      req.params.id,
      "HOTSPOT_VOUCHER_ADD",
      "/ip/hotspot/user/add",
      async (driver) => {

        const result =
          await driver.createHotspotVoucher({
            username,
            password,
            profile
          });

        return {
          username,
          password,
          profile,
          result
        };
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - ELIMINAR FICHA
   ========================================================= */

app.delete(
  "/api/devices/:id/hotspot/vouchers/:voucherId",
  async (req, res) => {

    const voucherId =
      String(req.params.voucherId || "").trim();

    if (!voucherId) {
      return res.status(400).json({
        ok: false,
        error: "ID de ficha inválido"
      });
    }

    return run(
      req.params.id,
      "HOTSPOT_VOUCHER_DELETE",
      "/ip/hotspot/user/remove",
      async (driver) => {

        return await driver.deleteHotspotVoucher(
          voucherId
        );
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - ACTIVAR / DESACTIVAR
   ========================================================= */

app.patch(
  "/api/devices/:id/hotspot/vouchers/:voucherId",
  async (req, res) => {

    const voucherId =
      String(req.params.voucherId || "").trim();

    const disabled =
      Boolean(req.body?.disabled);

    if (!voucherId) {
      return res.status(400).json({
        ok: false,
        error: "ID de ficha inválido"
      });
    }

    return run(
      req.params.id,
      "HOTSPOT_VOUCHER_STATUS",
      "/ip/hotspot/user/set",
      async (driver) => {

        return await driver.setHotspotVoucherStatus(
          voucherId,
          disabled
        );
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - USUARIOS ACTIVOS
   ========================================================= */

app.get(
  "/api/devices/:id/hotspot/active",
  async (req, res) => {

    return run(
      req.params.id,
      "HOTSPOT_ACTIVE",
      "/ip/hotspot/active/print",
      async (driver) => {

        const result =
          await driver.getHotspotActive();

        return Array.isArray(result)
          ? result
          : [];
      },
      res
    );
  }
);


/* =========================================================
   HOTSPOT - DESCONECTAR USUARIO
   ========================================================= */

app.delete(
  "/api/devices/:id/hotspot/active/:activeId",
  async (req, res) => {

    const activeId =
      String(req.params.activeId || "").trim();

    if (!activeId) {
      return res.status(400).json({
        ok: false,
        error: "ID activo inválido"
      });
    }

    return run(
      req.params.id,
      "HOTSPOT_ACTIVE_REMOVE",
      "/ip/hotspot/active/remove",
      async (driver) => {

        return await driver.removeHotspotActive(
          activeId
        );
      },
      res
    );
  }
);


/* =========================================================
   LOG
   ========================================================= */

app.get(
  "/api/devices/:id/log",
  async (req, res) => {
    return run(
      req.params.id,
      "ROUTER_LOG",
      "/log/print",
      async (driver) => {
        return await driver.getLogs();
      },
      res
    );
  }
);


/* =========================================================
   VALIDADOR PYTHON
   ========================================================= */

function validateWithPython(payload) {
  return new Promise((resolve, reject) => {

    const pythonBin =
      process.platform === "win32"
        ? path.join(__dirname, ".venv", "Scripts", "python.exe")
        : path.join(__dirname, ".venv", "bin", "python");

    const python = spawn(
      pythonBin,
      ["-m", "python.validator.main"],
      {
        cwd: __dirname,
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", data => {
      stdout += data.toString();
    });

    python.stderr.on("data", data => {
      stderr += data.toString();
    });

    python.on("error", error => {
      reject(error);
    });

    python.on("close", code => {

      if (code !== 0 && !stdout.trim()) {
        return reject(
          new Error(
            stderr.trim() ||
            `Validador Python terminï¿½ con cï¿½digo ${code}`
          )
        );
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(
          new Error(
            "Respuesta invï¿½lida del validador Python: " +
            stdout
          )
        );
      }
    });

    python.stdin.write(
      JSON.stringify(payload)
    );

    python.stdin.end();
  });
}

/* =========================================================
   VALIDACIï¿½N DE CONFIGURACIï¿½N
   ========================================================= */

app.post(
  "/api/validate",
  async (req, res) => {

    try {
      const payload = req.body || {};

      const result =
        await validateWithPython(payload);

      return res.json(result);

    } catch (error) {

      console.error(
        "[VALIDATOR ERROR]",
        error?.stack || error
      );

      return res.status(500).json({
        valid: false,
        errors: [
          error?.message ||
          "Error ejecutando el validador"
        ],
        warnings: []
      });
    }
  }
);

/* =========================================================
   COMANDO RAW
   ========================================================= */

app.post(
  "/api/devices/:id/command",
  async (req, res) => {

    const command =
      String(req.body?.command || "").trim();

    if (!command) {
      return res.status(400).json({
        ok: false,
        error: "Comando vacío"
      });
    }

    return run(
      req.params.id,
      "COMMAND",
      command,
      async (driver) => {

        const output = [];

        function tokenize(line) {
          return line.match(
            /(?:[^\s"]+="[^"]*"|[^\s"]+|"[^"]*")+/g
          ) || [];
        }

        function parameterize(tokens) {

          return tokens
            .filter(token => token.includes("="))
            .map(token => {

              const index =
                token.indexOf("=");

              const key =
                token.slice(0, index);

              let value =
                token.slice(index + 1);

              value =
                value.replace(/^"|"$/g, "");

              return `=${key}=${value}`;
            });
        }

        async function resolveFind(
          parentPath,
          expression
        ) {

          const tokens =
            tokenize(expression);

          const params = [
            ".proplist=.id"
          ];

          for (const token of tokens) {

            const index =
              token.indexOf("=");

            if (index === -1) {
              continue;
            }

            const key =
              token.slice(0, index);

            let value =
              token.slice(index + 1);

            value =
              value.replace(/^"|"$/g, "");

            params.push(
              `?${key}=${value}`
            );
          }

          const cleanParent =
            parentPath
              .replace(/^\/+/, "");

          const printCommand =
            [
              `/${cleanParent}/print`,
              ...params
            ];

          console.log(
            "[COMMAND FIND]",
            printCommand
          );

          const result =
            await driver.execute(
              printCommand
            );

          console.log(
            "[COMMAND FIND RESULT]",
            result
          );

          if (
            !Array.isArray(result) ||
            result.length === 0
          ) {
            throw new Error(
              `No se encontró ningún elemento para [find ${expression}]`
            );
          }

          const id =
            result[0][".id"];

          if (!id) {
            throw new Error(
              `RouterOS no devolvió .id para [find ${expression}]`
            );
          }

          return id;
        }

        const lines =
          command
            .split(/\r?\n+/)
            .map(line => line.trim())
            .filter(Boolean);

        for (const originalLine of lines) {

          let line =
            originalLine;

          const findMatch =
            line.match(
              /\[find\s+([^\]]+)\]/i
            );

          let findExpression =
            null;

          if (findMatch) {

            findExpression =
              findMatch[1];

            line =
              line
                .replace(
                  findMatch[0],
                  ""
                )
                .trim();
          }

          const tokens =
            tokenize(line);

          if (!tokens.length) {
            continue;
          }

          const pathParts = [];

          while (
            tokens.length &&
            !tokens[0].includes("=")
          ) {

            pathParts.push(
              tokens
                .shift()
                .replace(/^"|"$/g, "")
            );
          }

          /*
           * Soporta:
           *
           * /interface/print
           *
           * además de:
           *
           * /interface print
           */
          if (
            pathParts.length === 1 &&
            pathParts[0].includes("/")
          ) {

            const expanded =
              pathParts[0]
                .split("/")
                .filter(Boolean);

            pathParts.length = 0;
            pathParts.push(...expanded);
          }

          if (pathParts.length < 2) {
            throw new Error(
              `Comando RouterOS invalido: ${originalLine}`
            );
          }

          const menu =
            "/" +
            pathParts
              .join("/")
              .replace(/^\/+/g, "");

          let params =
            parameterize(tokens);

          /*
           * Resolver:
           *
           * [find name=bridge]
           *
           * antes de ejecutar SET.
           */
          if (findExpression) {

            const parentPath =
              "/" +
              pathParts
                .slice(0, -1)
                .join("/")
                .replace(/^\/+/, "");

            const id =
              await resolveFind(
                parentPath,
                findExpression
              );

            params.unshift(
              `=.id=${id}`
            );
          }

          const apiCommand = [
            menu,
            ...params
          ];

          console.log(
            "[COMMAND]",
            menu,
            params
          );

          console.log(
            "[COMMAND API]",
            apiCommand
          );

          const result =
            await driver.execute(
              apiCommand
            );

          output.push(result);
        }

        return output.length === 1
          ? output[0]
          : output;
      },
      res
    );
  }
);


/* =========================================================
   BACKUP
   ========================================================= */

app.post(
  "/api/devices/:id/backup",
  async (req, res) => {
    return run(
      req.params.id,
      "BACKUP",
      "/system/backup/save",
      async (driver) => {
        return await driver.createBackup();
      },
      res
    );
  }
);


/* =========================================================
   REBOOT
   ========================================================= */

app.post(
  "/api/devices/:id/reboot",
  async (req, res) => {
    return run(
      req.params.id,
      "REBOOT",
      "/system/reboot",
      async (driver) => {
        return await driver.reboot();
      },
      res
    );
  }
);


/* =========================================================
   AUDIT
   ========================================================= */

app.get(
  "/api/audit",
  async (req, res) => {
    try {

      const r = await db(
        `
        SELECT *
        FROM audit
        ORDER BY created_at DESC
        LIMIT 300
        `
      );

      return res.json(
        r.rows
      );

    } catch (error) {

      console.error(
        "[AUDIT]",
        error?.stack || error
      );

      return res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "Error obteniendo auditorÃ­a"
      });
    }
  }
);

/* =========================================================
   TEMPLATES
   ========================================================= */

app.get(
  "/api/templates",
  (req, res) => {

    return res.json([
      {
        id: "basic",
        name: "WAN + LAN + NAT",
        cat: "Red",
        script:
`/ip address add address=192.168.88.1/24 interface=bridge
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade`
      },

      {
        id: "dhcp",
        name: "Servidor DHCP",
        cat: "LAN",
        script:
`/ip pool add name=pool-lan ranges=192.168.88.10-192.168.88.254
/ip dhcp-server add name=dhcp1 interface=bridge address-pool=pool-lan disabled=no
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=1.1.1.1,8.8.8.8`
      },

      {
        id: "vlan",
        name: "VLAN 10",
        cat: "VLAN",
        script:
`/interface vlan add name=vlan10 vlan-id=10 interface=bridge
/ip address add address=10.10.10.1/24 interface=vlan10`
      },

      {
        id: "dns",
        name: "DNS",
        cat: "Servicios",
        script:
`/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8`
      },

      {
        id: "backup",
        name: "Backup",
        cat: "Mantenimiento",
        script:
`/system backup save name=manager-auto`
      }
    ]);
  }
);


/* =========================================================
   HOTSPOT
   ========================================================= */

app.post(
  "/api/devices/:id/hotspot/apply",
  async (req, res) => {

    const script =
      String(
        req.body?.script || ""
      ).trim();

    if (!script) {
      return res.status(400).json({
        ok: false,
        error: "Script Hotspot vacío"
      });
    }

    return run(
      req.params.id,
      "HOTSPOT_APPLY",
      script,
      async (api) => {

        const output = [];

        const lines =
          script
            .split(/\r?\n+/)
            .map(line => line.trim())
            .filter(line =>
              line &&
              !line.startsWith("#")
            );

        for (const originalLine of lines) {

          let line = originalLine;

          /*
           * Tokeniza respetando comillas.
           *
           * Ejemplo:
           *
           * /ip pool add name=pool-hotspot1 ranges="10.10.10.10-10.10.10.254"
           */

          const tokens =
            line.match(
              /(?:[^\s"]+="[^"]*"|[^\s"]+|"[^"]*")+/g
            ) || [];

          if (!tokens.length) {
            continue;
          }

          /*
           * Separar PATH RouterOS.
           *
           * /ip pool add
           *
           * =>
           *
           * /ip/pool/add
           */

          const pathParts = [];

          while (
            tokens.length &&
            !tokens[0].includes("=")
          ) {
            pathParts.push(
              tokens
                .shift()
                .replace(/^"|"$/g, "")
            );
          }

          if (pathParts.length < 2) {
            throw new Error(
              `Comando HotSpot inválido: ${originalLine}`
            );
          }

          const menu =
            "/" +
            pathParts
              .join("/")
              .replace(/^\/+/, "");

          /*
           * Convertir parámetros al formato
           * requerido por @fibercom/routeros-api.
           *
           * name=pool
           *
           * =>
           *
           * =name=pool
           */

          const params = [];

          for (const token of tokens) {

            const equalIndex =
              token.indexOf("=");

            if (equalIndex === -1) {
              continue;
            }

            const key =
              token.slice(
                0,
                equalIndex
              );

            let value =
              token.slice(
                equalIndex + 1
              );

            value =
              value.replace(
                /^"|"$/g,
                ""
              );

            params.push(
              `=${key}=${value}`
            );
          }

          /*
           * @fibercom/routeros-api
           *
           * Debe recibir un único array:
           *
           * [
           *   "/ip/pool/add",
           *   "=name=pool-hotspot1",
           *   "=ranges=10.10.10.10-10.10.10.254"
           * ]
           */

          const apiCommand = [
            menu,
            ...params
          ];

          console.log(
            "[HOTSPOT]",
            menu,
            params
          );

          console.log(
            "[HOTSPOT API]",
            apiCommand
          );

          const result =
            await driver.execute(
              apiCommand
            );

          output.push(result);
        }

        return output.length === 1
          ? output[0]
          : output;
      },
      res
    );
  }
);

/* =========================================================
   FRONTEND
   ========================================================= */

app.get(
  "*splat",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);

/* =========================================================
   INICIAR SERVIDOR
   ========================================================= */

const PORT =
  Number(process.env.PORT) || 3000;

process.on("SIGINT", async () => {

  console.log("[SERVER] Cerrando conexiones...");

  await closeAllDrivers();

  process.exit(0);
});

process.on("SIGTERM", async () => {

  console.log("[SERVER] Cerrando conexiones...");

  await closeAllDrivers();

  process.exit(0);
});

app.listen(
  PORT,
  () => {
    console.log(
      `MikroTik Remote Manager listo en http://localhost:${PORT}`
    );
  }
);
