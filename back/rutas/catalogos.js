const express = require("express");
const { conectarBase } = require("../conexion");
const {
  leerTemporada,
  mostrarError
} = require("../ayudas");

// Agrupamos las direcciones de este tema.
const rutas = express.Router();

// PILOTOS: devuelve el catálogo completo.
rutas.get("/pilotos", async function (req, res) {
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
rutas.get("/equipos", async function (req, res) {
  try {
    leerTemporada(req);
    const base = await conectarBase();
    const equipos = await base.collection("equipos").find({}).toArray();
    res.json(equipos);
  } catch (error) {
    mostrarError(res, error);
  }
});

module.exports = rutas;
