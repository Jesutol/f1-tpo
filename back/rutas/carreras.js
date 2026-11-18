const express = require("express");
const { conectarBase } = require("../conexion");
const { leerPaginacion } = require("../validaciones");
const {
  leerTemporada,
  errorDeConsulta,
  buscarUltimaCarrera,
  agregarImagenes,
  mostrarSinDatos,
  mostrarError
} = require("../ayudas");

// Agrupamos las direcciones de este tema.
const rutas = express.Router();

// CARRERA: carrera.js pide los resultados en esta dirección.
rutas.get(["/carrera", "/api/carreras/ultima"], async function (req, res) {
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
rutas.get(["/carreras", "/api/carreras"], async function (req, res) {
  try {
    let temporada = leerTemporada(req);
    let pagina;
    if (req.path === "/api/carreras") {
      pagina = leerPaginacion(req.query);
    }
    const base = await conectarBase();
    if (!temporada) {
      const ultima = await buscarUltimaCarrera(base, null);
      if (!ultima) {
        if (pagina) {
          return res.json({ datos: [], total: 0, cantidad: pagina.cantidad, from: pagina.desde });
        }
        return res.json([]);
      }
      temporada = ultima.temporada;
    }
    if (pagina) {
      const filtro = { temporada: temporada, estado: { $ne: "programada" } };
      const coleccion = base.collection("carreras");
      // Para el selector solo necesitamos los nombres, no todos los resultados.
      const campos = { _id: 1, temporada: 1, carreraId: 1, granPremio: 1, fecha: 1 };
      const carreras = await coleccion.find(filtro, { projection: campos })
        .sort({ carreraId: -1, _id: 1 }).skip(pagina.desde).limit(pagina.cantidad).toArray();
      const total = await coleccion.countDocuments(filtro);
      return res.json({ datos: carreras, total: total, cantidad: pagina.cantidad, from: pagina.desde });
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

// Consulta por el _id del documento; no cambia la ruta anterior por año y fecha.
rutas.get("/api/carreras/:id", async function (req, res) {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || id.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
      throw errorDeConsulta("El id de carrera debe contener letras minúsculas, números y guiones");
    }
    const base = await conectarBase();
    const carrera = await base.collection("carreras").findOne({ _id: id, estado: { $ne: "programada" } });
    if (!carrera) {
      return mostrarSinDatos(res);
    }
    res.json(await agregarImagenes(base, carrera));
  } catch (error) {
    mostrarError(res, error);
  }
});

module.exports = rutas;
