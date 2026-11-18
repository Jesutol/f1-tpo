const express = require("express");
const { conectarBase } = require("../conexion");
const {
  leerTemporada,
  buscarUltimaCarrera,
  buscarCampeonato,
  agregarImagenes,
  mostrarSinDatos,
  mostrarError
} = require("../ayudas");

// Agrupamos las direcciones de este tema.
const rutas = express.Router();

// INICIO: reúne los datos de las tarjetas de la página principal.
rutas.get("/api/inicio", async function (req, res) {
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

module.exports = rutas;
