const express = require("express");
const { conectarBase } = require("../conexion");
const { leerPaginacion } = require("../validaciones");
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
rutas.get(["/equipos", "/api/equipos"], async function (req, res) {
  try {
    leerTemporada(req);
    if (req.path === "/api/equipos") {
      const pagina = leerPaginacion(req.query);
      const base = await conectarBase();
      const coleccion = base.collection("equipos");
      const equipos = await coleccion.find({}).sort({ _id: 1 }).skip(pagina.desde).limit(pagina.cantidad).toArray();
      const total = await coleccion.countDocuments({});
      return res.json({ datos: equipos, total: total, cantidad: pagina.cantidad, from: pagina.desde });
    }
    const base = await conectarBase();
    const equipos = await base.collection("equipos").find({}).toArray();
    res.json(equipos);
  } catch (error) {
    mostrarError(res, error);
  }
});

module.exports = rutas;
