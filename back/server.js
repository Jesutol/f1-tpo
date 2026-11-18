// 1. Cargamos las herramientas y preparamos el servidor.
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../front")));

// 2. Conectamos con MongoDB usando la variable de la terminal o de Vercel.
// Reutilizamos el mismo cliente para todas las consultas.
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

// 3. Estas ayudas se repiten en varias páginas.

// Marca un dato incorrecto para responder con el código 400.
function errorDeConsulta(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

// Ejemplo: /carrera?temporada=2026. Sin año, buscamos los datos más recientes.
function leerTemporada(req) {
  if (!req.query.temporada) {
    return null;
  }
  const temporada = Number(req.query.temporada);
  if (!Number.isInteger(temporada) || temporada < 1950 || temporada > 2100) {
    throw errorDeConsulta("La temporada debe ser un año válido");
  }
  return temporada;
}

// Si no encontramos un documento, avisamos con 404.
function mostrarSinDatos(res) {
  return res.status(404).json({
    mensaje: "No hay datos guardados para esta consulta"
  });
}

// Los errores de conexión se responden con 500.
function mostrarError(res, error) {
  console.error(error.message);
  if (error.status === 400) {
    return res.status(400).json({ mensaje: error.message });
  }
  return res.status(500).json({
    mensaje: "No se pudieron consultar los datos. Revisá la conexión con MongoDB."
  });
}

// Buscamos los nombres y las imágenes de cada resultado en sus catálogos.
// Solo completamos la respuesta para la web; no guardamos cambios en MongoDB.
async function agregarImagenes(base, documento) {
  const pilotos = await base.collection("pilotos").find({}).toArray();
  const equipos = await base.collection("equipos").find({}).toArray();

  for (const resultado of documento.resultados) {
    let piloto = pilotos.find(function (pilotoGuardado) {
      return pilotoGuardado._id === resultado.pilotoId;
    });

    // Los documentos antiguos pueden tener número en lugar de pilotoId.
    if (!piloto && resultado.numero != null) {
      piloto = pilotos.find(function (pilotoGuardado) {
        return pilotoGuardado.numero === resultado.numero;
      });
    }

    const equipo = equipos.find(function (equipoGuardado) {
      return equipoGuardado._id === resultado.equipoId || equipoGuardado.nombre === resultado.equipo;
    });

    resultado.bandera = null;
    resultado.nacionalidad = "";
    resultado.logo = null;
    if (piloto) {
      resultado.nombre = piloto.nombre || resultado.nombre;
      resultado.apellido = piloto.apellido || resultado.apellido;
      resultado.bandera = piloto.bandera || null;
      resultado.nacionalidad = piloto.nacionalidad || "";
    }
    if (equipo) {
      resultado.equipo = equipo.nombre || resultado.equipo;
      resultado.logo = equipo.logo || null;
    }
  }
  return documento;
}

async function buscarUltimaCarrera(base, temporada) {
  // $ne significa "distinto de": excluimos las carreras programadas.
  // También permite leer documentos antiguos que no tienen estado.
  const filtro = { estado: { $ne: "programada" } };
  if (temporada) {
    filtro.temporada = temporada;
  }

  // -1 ordena de mayor a menor: primero el año y luego el número de carrera.
  return base.collection("carreras").findOne(filtro, {
    sort: { temporada: -1, carreraId: -1 }
  });
}

async function buscarCampeonato(base, tipo, temporada) {
  const filtro = { tipo: tipo };
  if (temporada) {
    filtro.temporada = temporada;
  }
  const campeonato = await base.collection("campeonatos").findOne(filtro, {
    sort: { temporada: -1, carreraHasta: -1 }
  });
  if (!campeonato) {
    return null;
  }
  return agregarImagenes(base, campeonato);
}

// 4. Cada ruta sigue el mismo orden: conectar, buscar y responder.
// Todas son de lectura: ninguna borra ni guarda documentos.

// CARRERA: carrera.js pide los resultados en esta dirección.
app.get("/carrera", async function (req, res) {
  try {
    const temporada = leerTemporada(req);
    const base = await conectarBase();
    let carrera;
    if (req.query.carreraId) {
      const carreraId = Number(req.query.carreraId);
      if (!temporada || !Number.isInteger(carreraId) || carreraId < 1) {
        throw errorDeConsulta("Indicá temporada y un número de carrera válido");
      }
      // Cuando el selector pide una carrera, buscamos ese año y ese número.
      carrera = await base.collection("carreras").findOne({
        temporada: temporada,
        carreraId: carreraId,
        estado: { $ne: "programada" }
      });
    } else {
      carrera = await buscarUltimaCarrera(base, temporada);
    }
    if (!carrera) {
      return mostrarSinDatos(res);
    }
    const datos = await agregarImagenes(base, carrera);
    res.json(datos);
  } catch (error) {
    mostrarError(res, error);
  }
});

// CARRERAS: devuelve los nombres para el selector, sin enviar todas las tablas.
app.get("/carreras", async function (req, res) {
  try {
    let temporada = leerTemporada(req);
    const base = await conectarBase();
    if (!temporada) {
      const ultima = await buscarUltimaCarrera(base, null);
      if (!ultima) {
        return res.json([]);
      }
      temporada = ultima.temporada;
    }
    const carreras = await base.collection("carreras").find({
      temporada: temporada,
      estado: { $ne: "programada" }
    }).toArray();
    carreras.sort(function (a, b) {
      return b.carreraId - a.carreraId;
    });

    const lista = [];
    for (const carrera of carreras) {
      lista.push({
        temporada: carrera.temporada,
        carreraId: carrera.carreraId,
        granPremio: carrera.granPremio,
        fecha: carrera.fecha
      });
    }
    res.json(lista);
  } catch (error) {
    mostrarError(res, error);
  }
});

// PILOTOS: devuelve el catálogo completo.
app.get("/pilotos", async function (req, res) {
  try {
    leerTemporada(req);
    const base = await conectarBase();
    const pilotos = await base.collection("pilotos").find({}).toArray();
    res.json(pilotos);
  } catch (error) {
    mostrarError(res, error);
  }
});

// EQUIPOS: devuelve el catálogo completo.
app.get("/equipos", async function (req, res) {
  try {
    leerTemporada(req);
    const base = await conectarBase();
    const equipos = await base.collection("equipos").find({}).toArray();
    res.json(equipos);
  } catch (error) {
    mostrarError(res, error);
  }
});

// CAMPEONATOS: :tipo puede ser pilotos o constructores.
app.get("/campeonato/:tipo", async function (req, res) {
  try {
    const temporada = leerTemporada(req);
    const tipo = req.params.tipo;
    if (tipo !== "pilotos" && tipo !== "constructores") {
      throw errorDeConsulta("El campeonato debe ser pilotos o constructores");
    }
    const base = await conectarBase();
    const campeonato = await buscarCampeonato(base, tipo, temporada);
    if (!campeonato) {
      return mostrarSinDatos(res);
    }
    res.json(campeonato);
  } catch (error) {
    mostrarError(res, error);
  }
});

// SESIONES: devuelve clasificación o prácticas del último GP disputado.
// Para otra carrera: /sesiones/clasificacion?temporada=2026&carreraId=20
app.get("/sesiones/:tipo", async function (req, res) {
  try {
    let temporada = leerTemporada(req);
    const tipo = req.params.tipo;
    const tiposPermitidos = ["clasificacion", "practica1", "practica2", "practica3"];
    if (!tiposPermitidos.includes(tipo)) {
      throw errorDeConsulta("Tipo de sesión inválido");
    }

    const base = await conectarBase();
    let carreraId;
    if (req.query.carreraId) {
      // Si nos piden una carrera concreta, comprobamos su año y su número.
      carreraId = Number(req.query.carreraId);
      if (!temporada || !Number.isInteger(carreraId) || carreraId < 1) {
        throw errorDeConsulta("Indicá temporada y un número de carrera válido");
      }
    } else {
      // Sin un número concreto, usamos la última carrera disputada.
      const carrera = await buscarUltimaCarrera(base, temporada);
      if (!carrera) {
        return mostrarSinDatos(res);
      }
      temporada = carrera.temporada;
      carreraId = carrera.carreraId;
    }

    const sesion = await base.collection("sesiones").findOne({
      temporada: temporada,
      carreraId: carreraId,
      tipo: tipo
    });
    if (!sesion) {
      return mostrarSinDatos(res);
    }
    const datos = await agregarImagenes(base, sesion);
    res.json(datos);
  } catch (error) {
    mostrarError(res, error);
  }
});

// INICIO: reúne los datos de las tarjetas de la página principal.
app.get("/api/inicio", async function (req, res) {
  try {
    let temporada = leerTemporada(req);
    const base = await conectarBase();
    const carrera = await buscarUltimaCarrera(base, temporada);

    // Si no se indicó un año, tomamos el de la última carrera.
    if (!temporada && carrera) {
      temporada = carrera.temporada;
    }
    // Si todavía no hay carreras, usamos el año del resumen guardado.
    if (!temporada) {
      const resumen = await base.collection("inicio").findOne({}, {
        sort: { temporada: -1, fechaCorte: -1 }
      });
      if (resumen) {
        temporada = resumen.temporada;
      }
    }
    if (!temporada) {
      return mostrarSinDatos(res);
    }

    // La fecha queda como año-mes-día. $gte significa "mayor o igual".
    const hoy = new Date().toISOString().slice(0, 10);
    const proximaCarrera = await base.collection("calendario").findOne({
      temporada: temporada,
      estado: "programada",
      fecha: { $gte: hoy }
    }, {
      sort: { fecha: 1, carreraId: 1 }
    });

    // Preparamos el podio y las dos tablas del campeonato.
    let ultimaCarrera = null;
    if (carrera) {
      ultimaCarrera = await agregarImagenes(base, carrera);
    }
    const pilotos = await buscarCampeonato(base, "pilotos", temporada);
    const constructores = await buscarCampeonato(base, "constructores", temporada);

    res.json({
      temporada: temporada,
      ultimaCarrera: ultimaCarrera,
      proximaCarrera: proximaCarrera,
      campeonatoPilotos: pilotos,
      campeonatoConstructores: constructores
    });
  } catch (error) {
    mostrarError(res, error);
  }
});

// 5. Arrancamos el servidor local. Vercel utiliza la última línea: module.exports.
if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, "0.0.0.0", function () {
    console.log("Servidor en el puerto " + puerto);
  });
}
module.exports = app;
