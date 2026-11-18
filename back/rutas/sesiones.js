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

// SESIONES: devuelve clasificación o prácticas del último GP disputado.
// Para otra carrera: /sesiones/clasificacion?temporada=2026&carreraId=20
// Ambas direcciones usan la misma consulta; la anterior sigue funcionando.
rutas.get(["/sesiones/:tipo", "/api/sesiones/:tipo"], async function (req, res) {
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

module.exports = rutas;
