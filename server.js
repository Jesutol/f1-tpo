const express = require("express");
const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

// 1. Configuración y conexión con PostgreSQL.
if (fs.existsSync(path.join(__dirname, ".env")))
  process.loadEnvFile(path.join(__dirname, ".env"));
const temporada =
  Number(process.env.TEMPORADA_ACTUAL) || new Date().getFullYear();
const db = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "f1_tpo",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000,
});
const app = express();
// Se comparte este pool con el importador. Las rutas web solo leen la base.
const tipos = [
  "carrera",
  "clasificacion",
  "libres-1",
  "libres-2",
  "libres-3",
  "sprint",
];
function numero(valor, defecto) {
  const resultado = Number(valor ?? defecto);
  if (!Number.isInteger(resultado) || resultado < 1) {
    const error = new Error(
      "El año y la ronda deben ser números enteros positivos.",
    );
    error.status = 400;
    throw error;
  }
  return resultado;
}

// 2. Calendario guardado: cada GP incluye los tipos de sesión disponibles.
app.get("/api/estado", async (_req, res) => {
  await db.query("SELECT 1");
  res.json({ estado: "ok" });
});
app.get("/api/temporada", async (req, res) => {
  const anio = numero(req.query.temporada, temporada);
  const { rows } = await db.query(
    `SELECT g.*,
    ARRAY(SELECT tipo FROM f1.sesiones WHERE gran_premio_id=g.id) AS sesiones
    FROM f1.grandes_premios g WHERE temporada=$1 ORDER BY ronda`,
    [anio],
  );
  res.json({ temporada: anio, grandesPremios: rows });
});

// 3. Una sesión de un GP concreto, o del último GP con carrera cargada.
app.get("/api/resultados/:tipo", async (req, res) => {
  const tipo = req.params.tipo;
  if (!tipos.includes(tipo))
    return res.status(400).json({ mensaje: "Sesión desconocida." });
  const anio = numero(req.query.temporada, temporada);
  const ronda = req.query.ronda === undefined ? null : numero(req.query.ronda);
  const {
    rows: [gp],
  } = await db.query(
    `SELECT g.* FROM f1.grandes_premios g
    WHERE temporada=$1 AND ($2::integer IS NULL OR ronda=$2)
      AND ($2::integer IS NOT NULL OR EXISTS (SELECT 1 FROM f1.sesiones
        WHERE gran_premio_id=g.id AND tipo='carrera'))
    ORDER BY fecha_carrera DESC LIMIT 1`,
    [anio, ronda],
  );
  if (!gp)
    return res.status(404).json({ mensaje: "Todavía no hay un GP cargado." });
  const {
    rows: [sesion],
  } = await db.query(
    "SELECT * FROM f1.sesiones WHERE gran_premio_id=$1 AND tipo=$2",
    [gp.id, tipo],
  );
  let resultados = [];
  if (sesion) {
    const consulta = await db.query(
      `SELECT r.*, p.nombre, p.apellido, p.nacionalidad, e.nombre AS equipo
      FROM f1.resultados r JOIN f1.pilotos p ON p.id=r.piloto_id
      LEFT JOIN f1.equipos e ON e.id=r.equipo_id WHERE sesion_id=$1 ORDER BY orden`,
      [sesion.id],
    );
    resultados = consulta.rows;
  }
  res.json({ granPremio: gp, sesion: sesion || null, resultados });
});

// 4. Puntos de carreras y sprints. Cada resultado conserva el equipo que los obtuvo.
app.get("/api/campeonato/:tipo", async (req, res) => {
  if (!["pilotos", "constructores"].includes(req.params.tipo)) {
    return res.status(400).json({ mensaje: "Campeonato desconocido." });
  }
  const pilotos = req.params.tipo === "pilotos";
  const grupo = pilotos
    ? "p.id,p.nombre,p.apellido,p.nacionalidad"
    : "e.id,e.nombre";
  const columnas = pilotos
    ? `p.id,p.nombre,p.apellido,p.nacionalidad,
    (array_agg(e.nombre ORDER BY g.ronda DESC,s.fecha DESC))[1] AS equipo,
    (array_agg(r.equipo_id ORDER BY g.ronda DESC,s.fecha DESC))[1] AS equipo_id`
    : "e.id,e.nombre AS equipo";
  const anio = numero(req.query.temporada, temporada);
  const { rows } = await db.query(
    `SELECT ${columnas}, SUM(r.puntos) AS puntos,
    COALESCE(array_agg(r.posicion) FILTER (WHERE s.tipo='carrera' AND r.posicion>0), '{}') AS puestos
    FROM f1.resultados r JOIN f1.sesiones s ON s.id=r.sesion_id
    JOIN f1.grandes_premios g ON g.id=s.gran_premio_id
    JOIN f1.pilotos p ON p.id=r.piloto_id LEFT JOIN f1.equipos e ON e.id=r.equipo_id
    WHERE g.temporada=$1 AND s.tipo IN ('carrera','sprint')
      ${pilotos ? "" : "AND e.id IS NOT NULL"} GROUP BY ${grupo}`,
    [anio],
  );
  // Si empatan en puntos, se comparan victorias, segundos puestos, terceros, etc.
  const maximo = Math.max(0, ...rows.flatMap((fila) => fila.puestos));
  function comparar(a, b) {
    if (Number(a.puntos) !== Number(b.puntos))
      return Number(b.puntos) - Number(a.puntos);
    for (let puesto = 1; puesto <= maximo; puesto++) {
      const diferencia =
        b.puestos.filter((p) => p === puesto).length -
        a.puestos.filter((p) => p === puesto).length;
      if (diferencia) return diferencia;
    }
    return 0;
  }
  rows.sort(comparar);
  rows.forEach((fila, i) => {
    fila.posicion =
      i && comparar(rows[i - 1], fila) === 0 ? rows[i - 1].posicion : i + 1;
    fila.puntos = Number(fila.puntos);
  });
  res.json({ temporada: anio, posiciones: rows });
});

// 5. Búsqueda por nombre e historial de un piloto o equipo.
app.get("/api/buscar", async (req, res) => {
  const anio = numero(req.query.temporada, temporada);
  const q = String(req.query.q || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!q) return res.json({ temporada: anio, coincidencias: [] });
  const { rows } = await db.query(`
    SELECT 'piloto' AS tipo, p.id::text AS id, p.nombre || ' ' || p.apellido AS nombre
    FROM f1.pilotos p WHERE p.temporada=$1 AND (p.nombre || ' ' || p.apellido) ILIKE $2
    UNION ALL
    SELECT 'equipo', e.id, e.nombre FROM f1.equipos e
    WHERE e.nombre ILIKE $2 AND EXISTS (
      SELECT 1 FROM f1.resultados r JOIN f1.sesiones s ON s.id=r.sesion_id
      JOIN f1.grandes_premios g ON g.id=s.gran_premio_id
      WHERE r.equipo_id=e.id AND g.temporada=$1)
    ORDER BY tipo, nombre`, [anio, '%' + q.replace(/[\\%_]/g, '\\$&') + '%']);
  res.json({ temporada: anio, coincidencias: rows });
});
app.get("/api/historial/:tipo/:id", async (req, res) => {
  const { tipo, id } = req.params;
  if (!["piloto", "equipo"].includes(tipo))
    return res.status(400).json({ mensaje: "Tipo de búsqueda desconocido." });
  const anio = numero(req.query.temporada, temporada);
  const piloto = tipo === "piloto";
  const clave = piloto ? numero(id) : id;
  const { rows: [entidad] } = await db.query(piloto ?
    "SELECT nombre || ' ' || apellido AS nombre FROM f1.pilotos WHERE id=$1 AND temporada=$2" :
    "SELECT nombre FROM f1.equipos WHERE id=$1", piloto ? [clave, anio] : [clave]);
  if (!entidad) return res.status(404).json({ mensaje: "No se encontró el piloto o equipo." });
  // El equipo se toma del resultado en esa sesión, incluso si el piloto cambió de equipo.
  const { rows } = await db.query(`
    SELECT g.ronda, g.nombre AS gran_premio, s.tipo, s.fecha,
      r.posicion, r.estado, r.puntos, r.tiempo, r.vueltas, r.equipo_id,
      p.nombre, p.apellido, p.nacionalidad, e.nombre AS equipo
    FROM f1.resultados r JOIN f1.sesiones s ON s.id=r.sesion_id
    JOIN f1.grandes_premios g ON g.id=s.gran_premio_id
    JOIN f1.pilotos p ON p.id=r.piloto_id LEFT JOIN f1.equipos e ON e.id=r.equipo_id
    WHERE g.temporada=$1 AND s.tipo IN ('carrera','sprint')
      AND ${piloto ? 'r.piloto_id' : 'r.equipo_id'}=$2
    ORDER BY g.ronda, s.fecha, r.orden`, [anio, clave]);
  res.json({ temporada: anio, nombre: entidad.nombre, resultados: rows });
});

// 6. Una plantilla HTML para todas las tablas y enlaces antiguos compatibles.
app.get(["/paginas/sesion.html", "/paginas/campeonato.html"], (_req, res) =>
  res.sendFile(path.join(__dirname, "front/paginas/resultados.html")),
);
app.get("/paginas/resultado-:sesion.html", (req, res) =>
  res.redirect(
    "/paginas/sesion.html?sesion=" + encodeURIComponent(req.params.sesion),
  ),
);
app.get("/paginas/constructores.html", (_req, res) =>
  res.redirect("/paginas/campeonato.html?tipo=constructores"),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ mensaje: "Ruta inexistente." }),
);
app.use(express.static(path.join(__dirname, "front")));
app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(error.status || 503).json({
    mensaje: error.status ? error.message : "No se pudo consultar la base.",
  });
});

// El mismo archivo permite crear las tablas o iniciar el servidor local.
if (require.main === module) {
  if (process.argv.includes("--crear-tablas")) {
    db.query(fs.readFileSync(path.join(__dirname, "base.sql"), "utf8"))
      .then(() => console.log("Tablas listas en PostgreSQL."))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      })
      .finally(() => db.end());
  } else {
    const puerto = process.env.PORT || 3000;
    app.listen(puerto, "127.0.0.1", (error) => {
      if (error) {
        console.error(error.message);
        process.exitCode = 1;
      } else console.log("Página disponible en http://localhost:" + puerto);
    });
  }
}
module.exports = { db, temporada };
