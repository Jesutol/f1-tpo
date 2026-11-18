const express = require("express");
const { conectarBase } = require("../conexion");
const { mostrarError } = require("../ayudas");
const { leerIdPiloto, leerPaginacion, validarPiloto } = require("../validaciones");
const rutas = express.Router();

// 1. LISTAR: devuelve solamente la página solicitada.
rutas.get("/api/pilotos", async function (req, res) {
  try {
    const pagina = leerPaginacion(req.query);
    const base = await conectarBase();
    const coleccion = base.collection("pilotos");
    const pilotos = await coleccion.find({})
      .sort({ apellido: 1, nombre: 1, _id: 1 })
      .skip(pagina.desde)
      .limit(pagina.cantidad)
      .toArray();
    const total = await coleccion.countDocuments({});
    res.json({ datos: pilotos, total: total, cantidad: pagina.cantidad, from: pagina.desde });
  } catch (error) {
    mostrarError(res, error);
  }
});

// 2. CONSULTAR UNO: el id es el texto del catálogo, por ejemplo antonelli.
rutas.get("/api/pilotos/:id", async function (req, res) {
  try {
    const id = leerIdPiloto(req.params.id);
    const base = await conectarBase();
    const piloto = await base.collection("pilotos").findOne({ _id: id });
    if (!piloto) {
      return res.status(404).json({ mensaje: "No existe un piloto con ese id" });
    }
    res.json(piloto);
  } catch (error) {
    mostrarError(res, error);
  }
});

// 3. CREAR: recibimos JSON, validamos y guardamos un piloto nuevo.
rutas.post("/api/pilotos", async function (req, res) {
  try {
    const piloto = validarPiloto(req.body);
    const base = await conectarBase();
    await base.collection("pilotos").insertOne(piloto);
    res.status(201).json(piloto);
  } catch (error) {
    // MongoDB usa 11000 cuando el _id ya existe.
    if (error.code === 11000) {
      return res.status(409).json({ mensaje: "Ya existe un piloto con ese id. Elegí otro o editá el existente." });
    }
    mostrarError(res, error);
  }
});

// 4. ACTUALIZAR: conservamos el _id y cambiamos los campos del formulario.
rutas.put("/api/pilotos/:id", async function (req, res) {
  try {
    const id = leerIdPiloto(req.params.id);
    const piloto = validarPiloto(req.body, id);
    const datos = Object.assign({}, piloto);
    delete datos._id;
    const base = await conectarBase();
    const resultado = await base.collection("pilotos").updateOne({ _id: id }, { $set: datos });
    if (resultado.matchedCount === 0) {
      return res.status(404).json({ mensaje: "No existe un piloto con ese id" });
    }
    res.json(piloto);
  } catch (error) {
    mostrarError(res, error);
  }
});

module.exports = rutas;
