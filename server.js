const express = require("express");
const postgres = require("pg");
const fs = require("node:fs");
const path = require("node:path");
const crearRutasUsuarios = require("./usuarios");

// 1. Configuración y conexión con PostgreSQL.
const archivoEnv = path.join(__dirname, ".env");
if (fs.existsSync(archivoEnv)) {
  process.loadEnvFile(archivoEnv);
}

const temporada = Number(process.env.TEMPORADA_ACTUAL) || new Date().getFullYear();
const db = new postgres.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "f1_tpo",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000,
});
const app = express();
if (process.env.RENDER === "true") {
  app.set("trust proxy", 1);
}
const tipos = [
  "carrera", "clasificacion", "libres-1", "libres-2", "libres-3", "sprint",
];

function numero(valor, defecto) {
  if (valor === null || valor === undefined) {
    valor = defecto;
  }

  const resultado = Number(valor);
  if (!Number.isInteger(resultado) || resultado < 1) {
    const error = new Error("El año y la ronda deben ser números enteros positivos.");
    error.status = 400;
    throw error;
  }
  return resultado;
}

// 2. El calendario incluye las sesiones guardadas para cada GP.
app.get("/api/estado", async function (req, res) {
  await db.query("SELECT 1");
  res.json({ estado: "ok" });
});

app.get("/api/temporada", async function (req, res) {
  const anio = numero(req.query.temporada, temporada);
  const consulta = await db.query(
    `SELECT g.*,
    ARRAY(SELECT tipo FROM f1.sesiones WHERE gran_premio_id=g.id) AS sesiones
    FROM f1.grandes_premios g WHERE temporada=$1 ORDER BY ronda`,
    [anio],
  );
  res.json({ temporada: anio, grandesPremios: consulta.rows });
});

// 3. Con ronda buscamos ese GP. Sin ronda, buscamos el último con carrera guardada.
app.get("/api/resultados/:tipo", async function (req, res) {
  const tipo = req.params.tipo;
  if (!tipos.includes(tipo)) {
    return res.status(400).json({ mensaje: "Sesión desconocida." });
  }

  const anio = numero(req.query.temporada, temporada);
  let ronda = null;
  if (req.query.ronda !== undefined) {
    ronda = numero(req.query.ronda);
  }

  // $1 y $2 se envían aparte del texto SQL, en el array de parámetros.
  const consultaGP = await db.query(
    `SELECT g.* FROM f1.grandes_premios g
    WHERE temporada=$1 AND ($2::integer IS NULL OR ronda=$2)
      AND ($2::integer IS NOT NULL OR EXISTS (SELECT 1 FROM f1.sesiones
        WHERE gran_premio_id=g.id AND tipo='carrera'))
    ORDER BY fecha_carrera DESC LIMIT 1`,
    [anio, ronda],
  );
  const gp = consultaGP.rows[0];
  if (!gp) {
    return res.status(404).json({ mensaje: "Todavía no hay un GP cargado." });
  }

  const consultaSesion = await db.query(
    "SELECT * FROM f1.sesiones WHERE gran_premio_id=$1 AND tipo=$2",
    [gp.id, tipo],
  );
  const sesion = consultaSesion.rows[0] || null;
  let resultados = [];

  if (sesion) {
    const consultaResultados = await db.query(
      `SELECT r.*, p.nombre, p.apellido, p.nacionalidad, e.nombre AS equipo
      FROM f1.resultados r JOIN f1.pilotos p ON p.id=r.piloto_id
      LEFT JOIN f1.equipos e ON e.id=r.equipo_id WHERE sesion_id=$1 ORDER BY orden`,
      [sesion.id],
    );
    resultados = consultaResultados.rows;
  }

  res.json({ granPremio: gp, sesion, resultados });
});

// 4. Puntos de carreras y sprints. Cada resultado conserva el equipo que los obtuvo.
// Campeones confirmados, por temporada y referencia del piloto en la base.
const campeonesPilotos = { 2026: "antonelli" };

function contarPuesto(posiciones, puestoBuscado) {
  let cantidad = 0;
  for (const puesto of posiciones) {
    if (puesto === puestoBuscado) {
      cantidad++;
    }
  }
  return cantidad;
}

function ordenarCampeonato(clasificacion) {
  let ultimoPuesto = 0;
  for (const fila of clasificacion) {
    fila.puntos = Number(fila.puntos);
    for (const puesto of fila.puestos) {
      if (puesto > ultimoPuesto) {
        ultimoPuesto = puesto;
      }
    }
  }

  // A igualdad de puntos, comparamos victorias, segundos puestos y así sucesivamente.
  function comparar(primera, segunda) {
    if (primera.puntos !== segunda.puntos) {
      return segunda.puntos - primera.puntos;
    }

    for (let puesto = 1; puesto <= ultimoPuesto; puesto++) {
      const cantidadPrimera = contarPuesto(primera.puestos, puesto);
      const cantidadSegunda = contarPuesto(segunda.puestos, puesto);
      if (cantidadPrimera !== cantidadSegunda) {
        return cantidadSegunda - cantidadPrimera;
      }
    }
    return 0;
  }

  clasificacion.sort(comparar);
  let anterior = null;
  for (let indice = 0; indice < clasificacion.length; indice++) {
    const fila = clasificacion[indice];
    fila.posicion = indice + 1;
    // Si ni los puntos ni los puestos desempatan, comparten posición.
    if (anterior && comparar(anterior, fila) === 0) {
      fila.posicion = anterior.posicion;
    }
    anterior = fila;
  }
}

app.get("/api/campeonato/:tipo", async function (req, res) {
  const tipo = req.params.tipo;
  if (tipo !== "pilotos" && tipo !== "constructores") {
    return res.status(400).json({ mensaje: "Campeonato desconocido." });
  }
  const anio = numero(req.query.temporada, temporada);

  let columnas;
  let grupo;
  let filtro = "";
  if (tipo === "pilotos") {
    // Mostramos el equipo más reciente, pero sumamos todos los puntos del piloto.
    columnas = `p.id,p.referencia,p.nombre,p.apellido,p.nacionalidad,
    (array_agg(e.nombre ORDER BY g.ronda DESC,s.fecha DESC))[1] AS equipo,
    (array_agg(r.equipo_id ORDER BY g.ronda DESC,s.fecha DESC))[1] AS equipo_id`;
    grupo = "p.id,p.nombre,p.apellido,p.nacionalidad";
  } else {
    columnas = "e.id,e.nombre AS equipo";
    grupo = "e.id,e.nombre";
    filtro = "AND e.id IS NOT NULL";
  }

  const consulta = await db.query(
    `SELECT ${columnas}, SUM(r.puntos) AS puntos,
    COALESCE(array_agg(r.posicion) FILTER (WHERE s.tipo='carrera' AND r.posicion>0), '{}') AS puestos
    FROM f1.resultados r JOIN f1.sesiones s ON s.id=r.sesion_id
    JOIN f1.grandes_premios g ON g.id=s.gran_premio_id
    JOIN f1.pilotos p ON p.id=r.piloto_id LEFT JOIN f1.equipos e ON e.id=r.equipo_id
    WHERE g.temporada=$1 AND s.tipo IN ('carrera','sprint')
      ${filtro} GROUP BY ${grupo}`,
    [anio],
  );
  const posiciones = consulta.rows;
  ordenarCampeonato(posiciones);

  // El título confirmado sigue al piloto aunque cambie su posición.
  let campeonPilotoId = null;
  const referenciaCampeon = campeonesPilotos[anio];
  if (tipo === "pilotos" && referenciaCampeon) {
    for (const fila of posiciones) {
      if (fila.referencia === referenciaCampeon) {
        campeonPilotoId = fila.id;
        break;
      }
    }
  }

  res.json({ temporada: anio, posiciones, campeonPilotoId });
});

// 5. Búsqueda por nombre e historial de un piloto o equipo.
app.get("/api/buscar", async function (req, res) {
  const anio = numero(req.query.temporada, temporada);
  let nombre = String(req.query.q || "");
  // Un solo espacio entre palabras y un máximo de 80 caracteres.
  nombre = nombre.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!nombre) {
    return res.json({ temporada: anio, coincidencias: [] });
  }

  // ILIKE reserva %, _ y la barra inversa. Los tratamos como texto escrito.
  let patron = nombre.replaceAll("\\", "\\\\");
  patron = patron.replaceAll("%", "\\%");
  patron = patron.replaceAll("_", "\\_");
  patron = "%" + patron + "%";

  const consulta = await db.query(
    `SELECT 'piloto' AS tipo, p.id::text AS id, p.nombre || ' ' || p.apellido AS nombre
    FROM f1.pilotos p WHERE p.temporada=$1 AND (p.nombre || ' ' || p.apellido) ILIKE $2
    UNION ALL
    SELECT 'equipo', e.id, e.nombre FROM f1.equipos e
    WHERE e.nombre ILIKE $2 AND EXISTS (
      SELECT 1 FROM f1.resultados r JOIN f1.sesiones s ON s.id=r.sesion_id
      JOIN f1.grandes_premios g ON g.id=s.gran_premio_id
      WHERE r.equipo_id=e.id AND g.temporada=$1)
    ORDER BY tipo, nombre`,
    [anio, patron],
  );
  res.json({ temporada: anio, coincidencias: consulta.rows });
});

app.get("/api/historial/:tipo/:id", async function (req, res) {
  const tipo = req.params.tipo;
  const id = req.params.id;
  if (tipo !== "piloto" && tipo !== "equipo") {
    return res.status(400).json({ mensaje: "Tipo de búsqueda desconocido." });
  }

  const anio = numero(req.query.temporada, temporada);
  let clave = id;
  let consultaEntidad;
  let columnaId;
  if (tipo === "piloto") {
    clave = numero(id);
    consultaEntidad = await db.query(
      "SELECT nombre || ' ' || apellido AS nombre FROM f1.pilotos WHERE id=$1 AND temporada=$2",
      [clave, anio],
    );
    columnaId = "r.piloto_id";
  } else {
    consultaEntidad = await db.query("SELECT nombre FROM f1.equipos WHERE id=$1", [clave]);
    columnaId = "r.equipo_id";
  }
  const entidad = consultaEntidad.rows[0];
  if (!entidad) {
    return res.status(404).json({ mensaje: "No se encontró el piloto o equipo." });
  }

  // El equipo se toma del resultado en esa sesión, aunque el piloto haya cambiado de equipo.
  const consultaResultados = await db.query(
    `SELECT g.ronda, g.nombre AS gran_premio, s.tipo, s.fecha,
      r.posicion, r.estado, r.puntos, r.tiempo, r.vueltas, r.equipo_id,
      p.nombre, p.apellido, p.nacionalidad, e.nombre AS equipo
    FROM f1.resultados r JOIN f1.sesiones s ON s.id=r.sesion_id
    JOIN f1.grandes_premios g ON g.id=s.gran_premio_id
    JOIN f1.pilotos p ON p.id=r.piloto_id LEFT JOIN f1.equipos e ON e.id=r.equipo_id
    WHERE g.temporada=$1 AND s.tipo IN ('carrera','sprint')
      AND ${columnaId}=$2
    ORDER BY g.ronda, s.fecha, r.orden`,
    [anio, clave],
  );
  res.json({ temporada: anio, nombre: entidad.nombre, resultados: consultaResultados.rows });
});

// 6. Registro, sesión y perfil tienen sus propias rutas.
app.use("/api", crearRutasUsuarios(db));

// 7. Los enlaces anteriores redirigen a su nuevo HTML conservando la consulta.
function redirigirPagina(req, res, pagina) {
  const url = new URL(req.originalUrl, "http://localhost");
  res.redirect("/paginas/" + pagina + ".html" + url.search);
}

app.get("/paginas/sesion.html", function (req, res) {
  const tipo = req.query.sesion || "carrera";
  if (!tipos.includes(tipo)) {
    return res.status(404).send("Sesión desconocida.");
  }
  redirigirPagina(req, res, "resultado-" + tipo);
});

app.get("/paginas/campeonato.html", function (req, res) {
  if (Object.hasOwn(req.query, "piloto") || Object.hasOwn(req.query, "equipo")) {
    return redirigirPagina(req, res, "historial");
  }
  const tipo = req.query.tipo || "pilotos";
  if (tipo !== "pilotos" && tipo !== "constructores") {
    return res.status(404).send("Campeonato desconocido.");
  }
  redirigirPagina(req, res, "campeonato-" + tipo);
});

app.get("/paginas/constructores.html", function (req, res) {
  redirigirPagina(req, res, "campeonato-constructores");
});

// Cada página tiene su propio HTML. Express inserta el menú antes de enviarla.
const carpetaFront = path.join(__dirname, "front");
const paginas = [
  "/", "/index.html", "/paginas/resultados.html", "/paginas/historial.html",
  "/paginas/campeonato-pilotos.html", "/paginas/campeonato-constructores.html",
  "/paginas/perfil.html",
];
for (const tipo of tipos) {
  paginas.push("/paginas/resultado-" + tipo + ".html");
}

app.get(paginas, async function (req, res) {
  const archivo = req.path === "/" ? "/index.html" : req.path;
  const html = await fs.promises.readFile(path.join(carpetaFront, archivo), "utf8");
  const navegacion = await fs.promises.readFile(path.join(carpetaFront, "paginas/navegacion.html"), "utf8");
  res.type("html").send(html.replace("<!-- Navegación compartida -->", navegacion.trim()));
});

app.use("/api", function (req, res) {
  res.status(404).json({ mensaje: "Ruta inexistente." });
});
app.use(express.static(carpetaFront));

app.use(function (error, req, res, next) {
  console.error(error.message);
  if (error.status) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  res.status(503).json({ mensaje: "No se pudo consultar la base." });
});

async function crearTablas() {
  try {
    const archivo = path.join(__dirname, "base.sql");
    const sql = fs.readFileSync(archivo, "utf8");
    await db.query(sql);
    console.log("Tablas listas en PostgreSQL.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

function iniciarServidor() {
  const puerto = process.env.PORT || 3000;
  const host = process.env.HOST || "127.0.0.1";
  app.listen(puerto, host, function (error) {
    if (error) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    console.log("Página disponible en http://localhost:" + puerto);
  });
}

if (process.argv.includes("--crear-tablas")) {
  crearTablas();
} else {
  iniciarServidor();
}
