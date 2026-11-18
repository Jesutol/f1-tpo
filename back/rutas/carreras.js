const express = require("express");
const { conectarBase } = require("../conexion");
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
rutas.get("/carrera", async function (req, res) {
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
rutas.get("/carreras", async function (req, res) {
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

module.exports = rutas;
