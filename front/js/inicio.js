// Completa una lista del inicio con las posiciones que llegan de MongoDB.
function mostrarRanking(idLista, campeonato, esPilotos) {
  const lista = document.getElementById(idLista);
  lista.replaceChildren();
  if (!campeonato || !campeonato.resultados.length) {
    lista.append(crearElemento('li', 'No hay posiciones guardadas'));
    return;
  }
  const resultados = campeonato.resultados.slice().sort(function (a, b) {
    return a.posicion - b.posicion;
  });
  for (const resultado of resultados.slice(0, 3)) {
    const fila = crearElemento('li');
    const posicion = crearElemento('span', resultado.posicion);
    const imagen = crearElemento('span');
    let clase = 'logo-equipo';
    if (resultado.equipoId === 'mercedes') {
      clase += ' logo-oscuro';
    }
    if (esPilotos) {
      ponerImagen(imagen, resultado.bandera, 'bandera', resultado.nacionalidad);
    } else {
      ponerImagen(imagen, resultado.logo, clase);
    }
    const descripcion = crearElemento('div');
    if (esPilotos) {
      descripcion.append(crearElemento('h3', nombrePiloto(resultado)));
      descripcion.append(crearElemento('p', resultado.equipo, 'nota'));
    } else {
      descripcion.append(crearElemento('h3', resultado.equipo));
    }
    const puntos = crearElemento('p');
    puntos.append(crearElemento('strong', resultado.puntos, 'puntos'), ' ', crearElemento('small', 'pts'));
    fila.append(posicion, imagen, descripcion, puntos);
    lista.append(fila);
  }
}

// Completa la tarjeta con los tres primeros de la última carrera.
function mostrarPodio(carrera) {
  const lista = document.getElementById('podio-inicio');
  lista.replaceChildren();
  if (!carrera) {
    document.getElementById('titulo-podio').textContent = 'No hay carreras guardadas';
    return;
  }
  document.getElementById('titulo-podio').textContent = 'GP de ' + carrera.granPremio;
  document.getElementById('detalle-podio').textContent = carrera.circuito + ' · ' + fechaTexto(carrera.fecha);
  const resultados = carrera.resultados.filter(function (piloto) {
    // Dejamos fuera a quienes no tienen una posición numérica.
    return typeof piloto.posicion === 'number';
  });
  resultados.sort(function (a, b) {
    return a.posicion - b.posicion;
  });
  for (const resultado of resultados.slice(0, 3)) {
    const fila = crearElemento('li');
    // Agregamos el logo y después ponemos la posición delante de él.
    let clase = 'logo-equipo';
    if (resultado.equipoId === 'mercedes') {
      clase += ' logo-oscuro';
    }
    ponerImagen(fila, resultado.logo, clase);
    fila.prepend(crearElemento('span', resultado.posicion, 'inicio-posicion'));
    fila.append(crearElemento('h3', nombrePiloto(resultado)), crearElemento('p', resultado.equipo));
    fila.append(crearElemento('span', resultado.tiempo, 'inicio-resultado'));
    const puntos = crearElemento('span', '', 'inicio-puntos-gp');
    puntos.append(crearElemento('strong', resultado.puntos, 'puntos'), ' puntos');
    fila.append(puntos);
    lista.append(fila);
  }
}

// Completa la próxima carrera, los datos del circuito y sus horarios.
function mostrarProxima(carrera) {
  const fecha = document.getElementById('fecha-proxima');
  const datosCircuito = document.getElementById('datos-circuito');
  const agenda = document.getElementById('agenda-proxima');
  fecha.replaceChildren();
  datosCircuito.replaceChildren();
  agenda.replaceChildren();
  if (!carrera) {
    document.getElementById('titulo-proxima').textContent = 'Sin próxima carrera confirmada';
    document.getElementById('horarios-proxima').hidden = true;
    return;
  }
  document.getElementById('etiqueta-proxima').textContent = 'Próximo GP · Fecha ' + carrera.carreraId;
  document.getElementById('titulo-proxima').textContent = carrera.granPremio;
  document.getElementById('circuito-proxima').textContent = carrera.circuito;
  document.getElementById('sprint-proxima').textContent = 'Fin de semana sin Sprint';
  if (carrera.sprint) {
    document.getElementById('sprint-proxima').textContent = 'Fin de semana Sprint';
  }
  // Convierte el horario guardado al horario argentino.
  let dia = fechaTexto(carrera.fecha);
  let hora = carrera.hora || 'A confirmar';
  if (carrera.fechaHora) {
    const momento = new Date(carrera.fechaHora);
    dia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(momento);
    hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(momento);
  }
  fecha.append(dia, crearElemento('br'), crearElemento('strong', hora), crearElemento('br'), 'Hora de Argentina · UTC−3');
  // Preparamos los textos del circuito antes de mostrarlos.
  let longitud = 'Sin datos';
  let vueltas = 'Sin datos';
  let distancia = 'Sin datos';
  if (carrera.longitudKm != null) {
    longitud = carrera.longitudKm + ' km';
  }
  if (carrera.vueltas != null) {
    vueltas = carrera.vueltas;
  }
  if (carrera.distanciaKm != null) {
    distancia = carrera.distanciaKm + ' km';
  }
  const valores = [
    ['Fin de semana', carrera.finDeSemanaTexto || 'Sin confirmar'],
    ['Longitud', longitud],
    ['Vueltas', vueltas],
    ['Distancia', distancia]
  ];
  for (const valor of valores) {
    const bloque = crearElemento('div');
    bloque.append(crearElemento('dt', valor[0]), crearElemento('dd', valor[1]));
    datosCircuito.append(bloque);
  }
  for (const actividad of carrera.agenda || []) {
    const fila = crearElemento('li');
    fila.append(actividad.actividad, crearElemento('br'), actividad.horarioTexto || 'Horario a confirmar');
    agenda.append(fila);
  }
  document.getElementById('horarios-proxima').hidden = agenda.children.length === 0;
}

// Consulta el servidor y reparte los datos entre las tarjetas.
async function cargarInicio() {
  try {
    // 1. Pedimos los datos del inicio al servidor.
    const respuesta = await fetch('/api/inicio');
    if (!respuesta.ok) {
      throw new Error('No se pudieron consultar los datos del inicio');
    }
    const datos = await respuesta.json();

    // 2. Completamos los títulos de la temporada.
    document.getElementById('temporada-inicio').textContent = 'F1 Telemetry · Temporada ' + datos.temporada;
    document.getElementById('etiqueta-campeonato').textContent = 'Campeonato ' + datos.temporada;
    // 3. Cada función completa una parte de la página.
    mostrarProxima(datos.proximaCarrera);
    mostrarPodio(datos.ultimaCarrera);
    mostrarRanking('lista-pilotos', datos.campeonatoPilotos, true);
    mostrarRanking('lista-constructores', datos.campeonatoConstructores, false);
    const campeonato = datos.campeonatoPilotos || datos.campeonatoConstructores;
    // 4. Mostramos la fecha de actualización del campeonato.
    document.getElementById('detalle-ranking').textContent = 'Sin campeonato guardado';
    if (campeonato) {
      document.getElementById('detalle-ranking').textContent = 'Actualizado al ' + fechaTexto(campeonato.fechaCorte);
    }
  } catch (error) {
    document.getElementById('titulo-proxima').textContent = 'Datos no disponibles';
    document.getElementById('titulo-podio').textContent = 'Datos no disponibles';
    document.getElementById('detalle-ranking').textContent = error.message;
    document.getElementById('circuito-proxima').textContent = error.message;
  }
}

// Las pestañas solo cambian qué resumen se ve; no modifican la base.
const pestanas = document.querySelectorAll('.inicio-pestanas button');
function mostrarCampeonato(elegida) {
  for (const pestana of pestanas) {
    const seleccionada = pestana === elegida;
    pestana.setAttribute('aria-selected', seleccionada);
    pestana.tabIndex = -1;
    if (seleccionada) {
      pestana.tabIndex = 0;
    }
    document.getElementById(pestana.getAttribute('aria-controls')).hidden = !seleccionada;
  }
}
for (const pestana of pestanas) {
  pestana.addEventListener('click', function () {
    mostrarCampeonato(pestana);
  });
  pestana.addEventListener('keydown', function (evento) {
    let siguiente;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      siguiente = pestanas[0];
      if (pestana === pestanas[0]) {
        siguiente = pestanas[1];
      }
    } else if (evento.key === 'Home') {
      siguiente = pestanas[0];
    } else if (evento.key === 'End') {
      siguiente = pestanas[1];
    } else {
      return;
    }
    evento.preventDefault();
    mostrarCampeonato(siguiente);
    siguiente.focus();
  });
}
// Ejecutamos la consulta al abrir la página.
cargarInicio();
