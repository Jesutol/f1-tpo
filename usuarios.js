const express = require("express");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const derivarClave = promisify(scrypt);
const costoHash = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const duracionSesion = 60 * 60; // Segundos.
const cookieSesion = "f1_sesion";
const emisor = "f1-telemetry";

function leerUsuario(datos) {
  if (typeof datos.usuario === "string") {
    return datos.usuario.trim().toLowerCase();
  }
  return "";
}

function leerNombre(datos) {
  if (typeof datos.nombre === "string") {
    return datos.nombre.trim();
  }
  return "";
}

function validarPerfil(usuario, nombre) {
  if (!/^[a-z0-9_]{3,24}$/.test(usuario)) {
    return "Usá entre 3 y 24 letras sin tilde, números o guiones bajos para el usuario.";
  }
  if (nombre.length < 2 || nombre.length > 80) {
    return "El nombre debe tener entre 2 y 80 caracteres.";
  }
}

async function generarHash(clave) {
  const sal = randomBytes(16).toString("hex");
  const hash = await derivarClave(clave, sal, 64, costoHash);
  return sal + ":" + hash.toString("hex");
}

async function compararClave(clave, claveGuardada) {
  const [sal, hash] = claveGuardada.split(":");
  const candidato = await derivarClave(clave, sal, 64, costoHash);
  return timingSafeEqual(candidato, Buffer.from(hash, "hex"));
}

function crearRutasUsuarios(db) {
  const rutas = express.Router();
  const secreto = process.env.JWT_SECRET || "";
  const secretoValido = /^[0-9a-f]{64}$/i.test(secreto);
  const claveJWT = Buffer.from(secreto, "hex");
  const opcionesCookie = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
  };
  // Hacemos la misma comprobación aunque el usuario no exista.
  const hashFicticio = randomBytes(16).toString("hex") + ":" + randomBytes(64).toString("hex");
  const limitarAcceso = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    legacyHeaders: false,
    standardHeaders: "draft-8",
    message: { mensaje: "Demasiados intentos. Esperá unos minutos." },
  });

  rutas.use(["/usuarios", "/sesion"], function (req, res, next) {
    res.set("Cache-Control", "no-store");
    if (!secretoValido) {
      return res.status(503).json({ mensaje: "Configurá JWT_SECRET para habilitar las cuentas." });
    }
    // Los formularios envían JSON desde la misma web.
    if (["POST", "PUT"].includes(req.method) && !req.is("application/json")) {
      return res.status(415).json({ mensaje: "Enviá los datos como JSON." });
    }
    next();
  }, express.json({ limit: "8kb" }));

  function abrirSesion(res, id) {
    const token = jwt.sign({}, claveJWT, {
      algorithm: "HS256",
      issuer: emisor,
      subject: String(id),
      expiresIn: duracionSesion,
    });
    res.cookie(cookieSesion, token, { ...opcionesCookie, maxAge: duracionSesion * 1000 });
  }

  // Solo el identificador de un JWT válido puede determinar qué perfil se usa.
  function autenticar(req, res, next) {
    const cookies = req.get("Cookie") || "";
    const coincidencia = cookies.match(/(?:^|;\s*)f1_sesion=([^;]+)/);
    if (coincidencia) {
      try {
        const token = jwt.verify(coincidencia[1], claveJWT, {
          algorithms: ["HS256"],
          issuer: emisor,
          maxAge: duracionSesion,
        });
        const id = Number(token.sub);
        if (Number.isInteger(id) && id > 0 && id <= 2147483647) {
          req.usuarioId = id;
          return next();
        }
      } catch {
        // Una firma inválida o una sesión vencida requiere volver a ingresar.
      }
    }
    res.status(401).json({ mensaje: "Iniciá sesión para acceder a tu perfil." });
  }

  rutas.post("/usuarios", limitarAcceso, async function (req, res) {
    const datos = req.body || {};
    const usuario = leerUsuario(datos);
    const nombre = leerNombre(datos);
    const mensaje = validarPerfil(usuario, nombre);
    if (mensaje) {
      return res.status(400).json({ mensaje });
    }
    const clave = datos.clave;
    if (typeof clave !== "string" || clave.length < 15 || clave.length > 128) {
      return res.status(400).json({ mensaje: "La contraseña debe tener entre 15 y 128 caracteres." });
    }

    const hash = await generarHash(clave);
    const consulta = await db.query(
      `INSERT INTO f1.usuarios (usuario, nombre, clave_hash) VALUES ($1, $2, $3)
       ON CONFLICT (usuario) DO NOTHING RETURNING id, usuario, nombre`,
      [usuario, nombre, hash],
    );
    const cuenta = consulta.rows[0];
    if (!cuenta) {
      return res.status(409).json({ mensaje: "Ese nombre de usuario ya está en uso." });
    }
    abrirSesion(res, cuenta.id);
    res.status(201).json(cuenta);
  });

  rutas.post("/sesion", limitarAcceso, async function (req, res) {
    const datos = req.body || {};
    const usuario = leerUsuario(datos);
    const clave = datos.clave;
    const mensaje = "Usuario o contraseña incorrectos.";
    if (!usuario || usuario.length > 24 || typeof clave !== "string" || !clave || clave.length > 128) {
      return res.status(401).json({ mensaje });
    }

    const consulta = await db.query(
      "SELECT id, usuario, nombre, clave_hash FROM f1.usuarios WHERE usuario = $1",
      [usuario],
    );
    const cuenta = consulta.rows[0];
    const hash = cuenta ? cuenta.clave_hash : hashFicticio;
    const coincide = await compararClave(clave, hash);
    if (!cuenta || !coincide) {
      return res.status(401).json({ mensaje });
    }
    abrirSesion(res, cuenta.id);
    res.json({ id: cuenta.id, usuario: cuenta.usuario, nombre: cuenta.nombre });
  });

  rutas.get("/usuarios/perfil", autenticar, async function (req, res) {
    const consulta = await db.query(
      "SELECT id, usuario, nombre FROM f1.usuarios WHERE id = $1",
      [req.usuarioId],
    );
    const cuenta = consulta.rows[0];
    if (!cuenta) {
      return res.status(404).json({ mensaje: "El perfil ya no existe." });
    }
    res.json(cuenta);
  });

  rutas.put("/usuarios/perfil", autenticar, async function (req, res) {
    const datos = req.body || {};
    const usuario = leerUsuario(datos);
    const nombre = leerNombre(datos);
    const mensaje = validarPerfil(usuario, nombre);
    if (mensaje) {
      return res.status(400).json({ mensaje });
    }

    try {
      const consulta = await db.query(
        "UPDATE f1.usuarios SET usuario = $1, nombre = $2 WHERE id = $3 RETURNING id, usuario, nombre",
        [usuario, nombre, req.usuarioId],
      );
      const cuenta = consulta.rows[0];
      if (!cuenta) {
        return res.status(404).json({ mensaje: "El perfil ya no existe." });
      }
      res.json(cuenta);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ mensaje: "Ese nombre de usuario ya está en uso." });
      }
      throw error;
    }
  });

  rutas.delete("/sesion", function (req, res) {
    res.clearCookie(cookieSesion, opcionesCookie);
    res.json({ mensaje: "Sesión cerrada." });
  });

  rutas.use(function (error, req, res, next) {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ mensaje: "El JSON enviado no es válido." });
    }
    next(error);
  });
  return rutas;
}

module.exports = crearRutasUsuarios;
