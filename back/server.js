const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../front")));

// La dirección y la contraseña se configuran en la terminal o en Vercel.
let cliente;
async function conectarBase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta configurar MONGODB_URI");
  }
  if (!cliente) {
    cliente = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 });
  }
  await cliente.connect();
  return cliente.db("f1_tpo");
}

function temporadaConsulta(req) {
  if (!req.query.temporada) return null;
  const temporada = Number(req.query.temporada);
  if (!Number.isInteger(temporada) || temporada < 1950 || temporada > 2100) {
    const error = new Error("La temporada debe ser un año válido");
    error.status = 400;
    throw error;
  }
  return temporada;
}

// Agrega a cada resultado las imágenes que están guardadas en los catálogos.
async function agregarImagenes(db, documento) {
  const pilotos = await db.collection("pilotos").find({}).toArray();
  const equipos = await db.collection("equipos").find({}).toArray();
  const resultados = documento.resultados.map(function (resultado) {
    let piloto = pilotos.find(p => p._id === resultado.pilotoId);
    if (!piloto && resultado.numero != null) {
      piloto = pilotos.find(p => p.numero === resultado.numero);
    }
    const equipo = equipos.find(e => e._id === resultado.equipoId || e.nombre === resultado.equipo);
    return {
      ...resultado,
      nombre: piloto?.nombre || resultado.nombre,
      apellido: piloto?.apellido || resultado.apellido,
      bandera: piloto?.bandera || null,
      nacionalidad: piloto?.nacionalidad || "",
      equipo: equipo?.nombre || resultado.equipo,
      logo: equipo?.logo || null
    };
  });
  return { ...documento, resultados };
}

async function ultimaCarrera(db, temporada) {
  // Acepta también las carreras antiguas que se importaron sin estado.
  const filtro = { estado: { $ne: "programada" } };
  if (temporada) filtro.temporada = temporada;
  return db.collection("carreras").findOne(filtro, {
    sort: { temporada: -1, carreraId: -1 }
  });
}

async function buscarCampeonato(db, tipo, temporada) {
  const filtro = { tipo };
  if (temporada) filtro.temporada = temporada;
  const campeonato = await db.collection("campeonatos").findOne(filtro, {
    sort: { temporada: -1, carreraHasta: -1 }
  });
  if (!campeonato) return null;
  return agregarImagenes(db, campeonato);
}

// Todas las rutas son de lectura. Ninguna modifica los documentos de MongoDB.
function rutaConsulta(ruta, consultar) {
  app.get(ruta, async (req, res) => {
    try {
      const temporada = temporadaConsulta(req);
      const db = await conectarBase();
      const datos = await consultar(db, req, temporada);
      if (!datos) return res.status(404).json({ mensaje: "No hay datos guardados para esta consulta" });
      res.json(datos);
    } catch (error) {
      console.error("Error en " + ruta + ":", error.message);
      res.status(error.status || 500).json({
        mensaje: error.status === 400 ? error.message : "No se pudieron consultar los datos. Revisá la conexión con MongoDB."
      });
    }
  });
}

rutaConsulta("/carrera", async (db, req, temporada) => {
  const carrera = await ultimaCarrera(db, temporada);
  return carrera ? agregarImagenes(db, carrera) : null;
});

rutaConsulta("/pilotos", db => db.collection("pilotos").find({}).toArray());
rutaConsulta("/equipos", db => db.collection("equipos").find({}).toArray());

rutaConsulta("/campeonato/:tipo", async (db, req, temporada) => {
  if (!["pilotos", "constructores"].includes(req.params.tipo)) {
    const error = new Error("El campeonato debe ser pilotos o constructores");
    error.status = 400;
    throw error;
  }
  return buscarCampeonato(db, req.params.tipo, temporada);
});

rutaConsulta("/sesiones/:tipo", async (db, req, temporada) => {
  if (!["clasificacion", "practica1", "practica2", "practica3"].includes(req.params.tipo)) {
    const error = new Error("Tipo de sesión inválido");
    error.status = 400;
    throw error;
  }
  let carreraId;
  if (req.query.carreraId) {
    carreraId = Number(req.query.carreraId);
    if (!temporada || !Number.isInteger(carreraId) || carreraId < 1) {
      const error = new Error("Indicá temporada y un número de carrera válido");
      error.status = 400;
      throw error;
    }
  } else {
    const carrera = await ultimaCarrera(db, temporada);
    if (!carrera) return null;
    temporada = carrera.temporada;
    carreraId = carrera.carreraId;
  }
  const sesion = await db.collection("sesiones").findOne({ temporada, carreraId, tipo: req.params.tipo });
  return sesion ? agregarImagenes(db, sesion) : null;
});

rutaConsulta("/api/inicio", async (db, req, temporada) => {
  const carrera = await ultimaCarrera(db, temporada);
  const resumen = await db.collection("inicio").findOne(temporada ? { temporada } : {}, {
    sort: { temporada: -1, fechaCorte: -1 }
  });
  temporada = temporada || carrera?.temporada || resumen?.temporada;
  if (!temporada) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const proxima = await db.collection("calendario").findOne({
    temporada, estado: "programada", fecha: { $gte: hoy }
  }, { sort: { fecha: 1, carreraId: 1 } });
  const pilotos = await buscarCampeonato(db, "pilotos", temporada);
  const constructores = await buscarCampeonato(db, "constructores", temporada);
  return {
    temporada,
    ultimaCarrera: carrera ? await agregarImagenes(db, carrera) : null,
    proximaCarrera: proxima,
    campeonatoPilotos: pilotos,
    campeonatoConstructores: constructores
  };
});

if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, "0.0.0.0", () => console.log("Servidor en el puerto " + puerto));
}
module.exports = app;