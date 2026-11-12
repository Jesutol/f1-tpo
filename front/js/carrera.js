const logos = {
  'McLaren': 'mclaren',
  'Red Bull Racing': 'redbull_racing',
  'Mercedes': 'mercedes',
  'Ferrari': 'ferrari',
  'Racing Bulls': 'racing_bulls',
  'Aston Martin': 'aston_martin',
  'Alpine': 'alpine',
  'Audi': 'audi',
  'Haas F1 Team': 'haas',
  'Haas': 'haas',
  'Cadillac': 'cadillac',
  'Williams': 'williams'
};

const banderas = {
  1: ['uk', 'Reino Unido'], 3: ['nl', 'Países Bajos'],
  6: ['fr', 'Francia'], 63: ['uk', 'Reino Unido'],
  12: ['it', 'Italia'], 81: ['au', 'Australia'],
  30: ['nz', 'Nueva Zelanda'], 16: ['mc', 'Mónaco'],
  44: ['uk', 'Reino Unido'], 27: ['de', 'Alemania'],
  41: ['uk', 'Reino Unido'], 14: ['es', 'España'],
  43: ['ar', 'Argentina'], 10: ['fr', 'Francia'],
  23: ['th', 'Tailandia'], 5: ['br', 'Brasil'],
  87: ['uk', 'Reino Unido'], 11: ['mx', 'México'],
  55: ['es', 'España'], 51: ['br', 'Brasil'],
  18: ['ca', 'Canadá'], 77: ['fi', 'Finlandia'],
  31: ['fr', 'Francia']
};

const letras = {
  blando: 'S', medio: 'M', duro: 'H', intermedio: 'I', lluvia: 'W'
};

function agregarImagen(celda, ruta, clase, descripcion) {
  const imagen = document.createElement('img');
  imagen.src = ruta;
  imagen.className = clase;
  imagen.alt = descripcion;
  celda.prepend(imagen);
}

function mostrarMensaje(texto) {
  const tabla = document.getElementById('resultados-carrera');
  tabla.innerHTML = '<tr><td colspan="6"></td></tr>';
  tabla.querySelector('td').textContent = texto;
}

function mostrarEncabezado(carrera) {
  document.getElementById('nombre-carrera').textContent = 'GP de ' + carrera.granPremio;
  document.getElementById('temporada-carrera').textContent = 'F1 Telemetry · Temporada ' + carrera.temporada;
  document.title = 'F1 Telemetry | GP de ' + carrera.granPremio;

  const fecha = carrera.fecha.split('-');
  document.getElementById('detalle-carrera').textContent =
    carrera.circuito + ' · ' + fecha[2] + '/' + fecha[1] + '/' + fecha[0];
}

function mostrarResultados(resultados) {
  const tabla = document.getElementById('resultados-carrera');
  tabla.innerHTML = '';

  if (resultados.length === 0) {
    mostrarMensaje('Esta carrera todavía no tiene resultados');
    return;
  }

  resultados.sort(function (a, b) {
    return a.orden - b.orden;
  });

  for (const piloto of resultados) {
    const fila = crearFila(piloto);
    tabla.append(fila);
  }
}

function crearFila(piloto) {
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td class="posicion"></td>
    <th scope="row" class="piloto"></th>
    <td class="equipo"></td>
    <td class="puntos"></td>
    <td class="neumaticos"></td>
    <td class="paradas"></td>
  `;
  fila.querySelector('.posicion').textContent = piloto.posicion;
  fila.querySelector('.piloto').textContent = ' ' + piloto.nombre + ' ' + piloto.apellido;
  fila.querySelector('.equipo').textContent = ' ' + piloto.equipo;
  fila.querySelector('.puntos').textContent = piloto.puntos;

  if (piloto.numero === 43) {
    fila.className = 'colapinto';
  }
  agregarBandera(fila, piloto);
  agregarLogo(fila, piloto);
  mostrarNeumaticos(fila, piloto);
  mostrarParadas(fila, piloto);

  return fila;
}

function agregarBandera(fila, piloto) {
  const bandera = banderas[piloto.numero];
  if (bandera) {
    agregarImagen(fila.querySelector('.piloto'),
      '../recursos/iconos-banderas/' + bandera[0] + '.svg', 'bandera', bandera[1]);
  }
}

function agregarLogo(fila, piloto) {
  const logo = logos[piloto.equipo];
  if (logo) {
    let clase = 'logo-equipo';
    if (piloto.equipo === 'Mercedes') {
      clase = 'logo-equipo logo-oscuro';
    }
    agregarImagen(fila.querySelector('.equipo'),
      '../recursos/logos-equipos/' + logo + '.svg', clase, '');
  }
}

function mostrarNeumaticos(fila, piloto) {
  const neumaticos = fila.querySelector('.neumaticos');
  neumaticos.textContent = 'Sin datos';
  if (piloto.neumaticos && piloto.neumaticos.length > 0) {
    neumaticos.innerHTML = '<div class="estrategia"></div>';
    const estrategia = neumaticos.querySelector('.estrategia');
    for (const tipo of piloto.neumaticos) {
      if (estrategia.children.length > 0) {
        estrategia.append(' → ');
      }
      const circulo = document.createElement('span');
      circulo.className = 'neumatico';
      circulo.textContent = '?';
      circulo.title = 'Compuesto desconocido';
      if (letras[tipo]) {
        circulo.classList.add(tipo);
        circulo.textContent = letras[tipo];
        circulo.title = tipo;
      }
      estrategia.append(circulo);
    }
  }
}

function mostrarParadas(fila, piloto) {
  const paradas = fila.querySelector('.paradas');
  paradas.textContent = 'Sin datos';
  if (piloto.paradas) {
    paradas.textContent = 'Sin paradas';
    if (piloto.paradas.length > 0) {
      paradas.innerHTML = '<details class="pit-stops"><summary></summary><ul></ul></details>';
      let texto = piloto.paradas.length + ' paradas';
      if (piloto.paradas.length === 1) {
        texto = '1 parada';
      }
      paradas.querySelector('summary').textContent = texto;
      for (const vuelta of piloto.paradas) {
        const elemento = document.createElement('li');
        elemento.textContent = 'Vuelta ' + vuelta;
        paradas.querySelector('ul').append(elemento);
      }
    }
  }
}

async function cargarCarrera() {
  try {

    const respuesta = await fetch('/carrera');
    if (!respuesta.ok) {
      throw new Error('No se pudo consultar la carrera');
    }
    const carrera = await respuesta.json();

    mostrarEncabezado(carrera);
    mostrarResultados(carrera.resultados);
  } catch (error) {
    console.error(error);
    mostrarMensaje('No se pudieron cargar los resultados. Revisá el servidor y la base de datos.');
    document.getElementById('detalle-carrera').textContent = 'Datos del GP no disponibles';
  }
}

cargarCarrera();
