const express = require("express");
const { conectarBase } = require("../conexion");
const {
  leerTemporada,
  errorDeConsulta,
  buscarCampeonato,
  mostrarSinDatos,
  mostrarError
} = require("../ayudas");

// Agrupamos las direcciones de este tema.
const rutas = express.Router();

// CAMPEONATOS: :tipo puede ser pilotos o constructores.
rutas.get(["/campeonato/:tipo", "/api/campeonatos/:tipo"], async function (req, res) {
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

module.exports = rutas;
