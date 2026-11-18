// Funciones que comparten las consultas de varias páginas.

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


module.exports = {
  errorDeConsulta,
  leerTemporada,
  mostrarSinDatos,
  mostrarError,
  agregarImagenes,
  buscarUltimaCarrera,
  buscarCampeonato
};
