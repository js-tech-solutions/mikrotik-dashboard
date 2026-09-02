import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

const SESSION_DAYS =
  Number(process.env.SESSION_DAYS) || 7;

const SESSION_COOKIE =
  "mikrotik_manager_session";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const loginAttempts = new Map();

function tokenHash(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};

  for (const part of header.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) continue;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}

function cookieOptions(maxAge) {
  const secure =
    process.env.NODE_ENV === "production";

  return [
    `${SESSION_COOKIE}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);

  const derivedKey = await scrypt(
    password,
    salt,
    64,
    {
      N: 16384,
      r: 8,
      p: 1
    }
  );

  return [
    "scrypt",
    salt.toString("hex"),
    Buffer.from(derivedKey).toString("hex")
  ].join("$");
}

export async function verifyPassword(
  password,
  storedHash
) {
  try {
    const parts =
      String(storedHash).split("$");

    if (parts.length !== 3) {
      return false;
    }

    const [
      algorithm,
      saltHex,
      hashHex
    ] = parts;

    if (algorithm !== "scrypt") {
      return false;
    }

    const salt =
      Buffer.from(saltHex, "hex");

    const stored =
      Buffer.from(hashHex, "hex");

    const derived =
      await scrypt(
        password,
        salt,
        stored.length,
        {
          N: 16384,
          r: 8,
          p: 1
        }
      );

    return crypto.timingSafeEqual(
      stored,
      Buffer.from(derived)
    );

  } catch {
    return false;
  }
}

export async function ensureAuthTables(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS users(
      id bigserial PRIMARY KEY,
      username text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'admin',
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      last_login timestamptz
    );

    CREATE TABLE IF NOT EXISTS sessions(
      id bigserial PRIMARY KEY,
      token_hash text UNIQUE NOT NULL,
      user_id bigint NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS
      sessions_expires_idx
    ON sessions(expires_at);

    CREATE INDEX IF NOT EXISTS
      sessions_user_idx
    ON sessions(user_id);
  `);
}

export async function ensureAdminUser(db) {
  const username =
    String(
      process.env.ADMIN_USERNAME || ""
    ).trim();

  const password =
    String(
      process.env.ADMIN_PASSWORD || ""
    );

  const existing =
    await db(`
      SELECT id
      FROM users
      LIMIT 1
    `);

  if (existing.rows.length) {
    return;
  }

  if (!username || !password) {
    console.warn(
      "[AUTH] No existe usuario administrador."
    );

    console.warn(
      "[AUTH] Define ADMIN_USERNAME y ADMIN_PASSWORD."
    );

    return;
  }

  if (password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD debe tener al menos 12 caracteres"
    );
  }

  const passwordHash =
    await hashPassword(password);

  await db(
    `
    INSERT INTO users(
      username,
      password_hash,
      role,
      active
    )
    VALUES($1,$2,'admin',true)
    ON CONFLICT(username) DO NOTHING
    `,
    [
      username,
      passwordHash
    ]
  );

  console.log(
    `[AUTH] Usuario administrador creado: ${username}`
  );
}

export function createSessionMiddleware(db) {
  return async (req, res, next) => {
    try {
      req.user = null;

      const cookies =
        parseCookies(req);

      const token =
        cookies[SESSION_COOKIE];

      if (!token) {
        return next();
      }

      const result =
        await db(
          `
          SELECT
            u.id,
            u.username,
            u.role,
            u.active,
            s.expires_at
          FROM sessions s
          JOIN users u
            ON u.id = s.user_id
          WHERE s.token_hash = $1
            AND s.expires_at > now()
            AND u.active = true
          LIMIT 1
          `,
          [tokenHash(token)]
        );

      if (!result.rows.length) {
        res.setHeader(
          "Set-Cookie",
          cookieOptions(0)
        );

        return next();
      }

      req.user = {
        id: result.rows[0].id,
        username: result.rows[0].username,
        role: result.rows[0].role
      };

      return next();

    } catch (error) {

      console.error(
        "[AUTH SESSION]",
        error?.message || error
      );

      req.user = null;

      return next();
    }
  };
}

export function requireAuth(req, res, next) {
  if (req.user) {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({
      ok: false,
      error: "No autenticado"
    });
  }

  return res.redirect("/login.html");
}

export function loginRateLimit(req) {
  const key =
    req.ip || "unknown";

  const now = Date.now();

  const current =
    loginAttempts.get(key);

  if (!current) {
    return {
      allowed: true,
      retryAfter: 0
    };
  }

  if (
    now - current.firstAttempt >
    LOGIN_WINDOW_MS
  ) {
    loginAttempts.delete(key);

    return {
      allowed: true,
      retryAfter: 0
    };
  }

  if (
    current.failures >=
    LOGIN_MAX_ATTEMPTS
  ) {
    return {
      allowed: false,
      retryAfter: Math.ceil(
        (
          LOGIN_WINDOW_MS -
          (now - current.firstAttempt)
        ) / 1000
      )
    };
  }

  return {
    allowed: true,
    retryAfter: 0
  };
}

export function recordLoginFailure(req) {
  const key =
    req.ip || "unknown";

  const now = Date.now();

  const current =
    loginAttempts.get(key);

  if (
    !current ||
    now - current.firstAttempt >
      LOGIN_WINDOW_MS
  ) {
    loginAttempts.set(key, {
      firstAttempt: now,
      failures: 1
    });

    return;
  }

  current.failures += 1;
}

export function resetLoginAttempts(req) {
  const key =
    req.ip || "unknown";

  loginAttempts.delete(key);
}

export async function createSession(
  db,
  userId
) {
  const token =
    crypto.randomBytes(32)
      .toString("base64url");

  const tokenHashValue =
    tokenHash(token);

  const expiresAt =
    new Date(
      Date.now() +
      SESSION_DAYS *
      24 *
      60 *
      60 *
      1000
    );

  await db(
    `
    INSERT INTO sessions(
      token_hash,
      user_id,
      expires_at
    )
    VALUES($1,$2,$3)
    `,
    [
      tokenHashValue,
      userId,
      expiresAt
    ]
  );

  return {
    token,
    expiresAt
  };
}

export async function destroySession(
  db,
  req
) {
  const cookies =
    parseCookies(req);

  const token =
    cookies[SESSION_COOKIE];

  if (token) {
    await db(
      `
      DELETE FROM sessions
      WHERE token_hash = $1
      `,
      [tokenHash(token)]
    );
  }
}

export function setSessionCookie(
  res,
  token
) {
  const secure =
    process.env.NODE_ENV === "production";

  const maxAge =
    SESSION_DAYS *
    24 *
    60 *
    60;

  const cookie = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader(
    "Set-Cookie",
    cookie
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    cookieOptions(0)
  );
}
