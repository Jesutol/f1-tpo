const letras = {
  blando: 'S', medio: 'M', duro: 'H', intermedio: 'I', lluvia: 'W'
};

// Muestra un mensaje que ocupa las seis columnas de la tabla.
function mostrarMensaje(texto) {
  const tabla = document.getElementById('resultados-carrera');
  tabla.innerHTML = '<tr><td colspan="6"></td></tr>';
  tabla.querySelector('td').textContent = texto;
}

async function cargarCarrera(ruta = '/carrera') {
  const selector = document.getElementById('elegir-carrera');
  selector.disabled = true;
  mostrarMensaje('Cargando resultados...');
  try {
    // 1. Pedimos la carrera elegida. Sin una dirección, pedimos la última.
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) {
      throw new Error('No se pudo consultar la carrera');
    }
    const carrera = await respuesta.json();
    conservarCarrera(carrera.temporada, carrera.carreraId);

    // 2. Cambiamos los textos del encabezado.
    document.getElementById('nombre-carrera').textContent = 'GP de ' + carrera.granPremio;
    document.getElementById('temporada-carrera').textContent = 'F1 Telemetry · Temporada ' + carrera.temporada;
    document.title = 'F1 Telemetry | GP de ' + carrera.granPremio;

    // La fecha viene como año-mes-día. La mostramos como día/mes/año.
    const fecha = carrera.fecha.split('-');
    document.getElementById('detalle-carrera').textContent =
      carrera.circuito + ' · ' + fecha[2] + '/' + fecha[1] + '/' + fecha[0];

    // 3. Vaciamos la tabla y ordenamos los resultados.
    const tabla = document.getElementById('resultados-carrera');
    tabla.innerHTML = '';
    carrera.resultados.sort(function (a, b) {
      return a.orden - b.orden;
    });

    if (carrera.resultados.length === 0) {
      mostrarMensaje('Esta carrera todavía no tiene resultados');
      return;
    }

    // 4. Creamos una fila por piloto, con las mismas clases que tenía el HTML.
    for (const piloto of carrera.resultados) {
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

      // 5. Las imágenes vienen de los catálogos guardados en MongoDB.
      ponerImagen(fila.querySelector('.piloto'), piloto.bandera, 'bandera', piloto.nacionalidad);
      let claseLogo = 'logo-equipo';
      if (piloto.equipoId === 'mercedes' || piloto.equipo === 'Mercedes') {
        claseLogo += ' logo-oscuro';
      }
      ponerImagen(fila.querySelector('.equipo'), piloto.logo, claseLogo);

      // 6. Dibujamos los neumáticos. null significa que faltan los datos.
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

      // 7. Mostramos las paradas y las vueltas en un desplegable.
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

      // 8. Agregamos la fila terminada a la tabla.
      tabla.append(fila);
    }
  } catch (error) {
    console.error(error);
    mostrarMensaje('No se pudieron cargar los resultados. Revisá el servidor y la base de datos.');
    document.getElementById('detalle-carrera').textContent = 'Datos del GP no disponibles';
  } finally {
    selector.disabled = selector.options.length < 2;
  }
}

// Primero cargamos los nombres de las carreras disponibles en MongoDB.
async function cargarListaCarreras() {
  const selector = document.getElementById('elegir-carrera');
  try {
    // Si volvemos desde una sesión, buscamos las carreras de ese mismo año.
    const direccion = new URLSearchParams(window.location.search);
    let rutaLista = '/carreras';
    if (direccion.has('temporada')) {
      rutaLista += '?temporada=' + encodeURIComponent(direccion.get('temporada'));
    }
    const respuesta = await fetch(rutaLista);
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar la lista de carreras');
    }
    const carreras = await respuesta.json();
    selector.innerHTML = '';
    for (const carrera of carreras) {
      const opcion = document.createElement('option');
      opcion.value = '/carrera?temporada=' + carrera.temporada + '&carreraId=' + carrera.carreraId;
      opcion.textContent = 'Fecha ' + carrera.carreraId + ' · ' + carrera.granPremio + ' ' + carrera.temporada;
      selector.append(opcion);
    }
    if (carreras.length === 0) {
      const opcion = document.createElement('option');
      opcion.textContent = 'No hay carreras guardadas';
      selector.append(opcion);
      mostrarMensaje('No hay carreras guardadas en MongoDB');
      return;
    }
    // Al volver desde una sesión, seleccionamos el GP que está en la dirección.
    // Sin una elección previa, abrimos la última carrera de la lista.
    const parametros = parametrosCarrera();
    if (parametros !== '') {
      const rutaElegida = '/carrera' + parametros;
      const existe = carreras.some(function (carrera) {
        return String(carrera.temporada) === direccion.get('temporada') &&
          String(carrera.carreraId) === direccion.get('carreraId');
      });
      if (existe) {
        selector.value = rutaElegida;
      } else {
        // No mostramos otra carrera como si fuera la que se pidió.
        const opcion = document.createElement('option');
        opcion.value = rutaElegida;
        opcion.textContent = 'Carrera solicitada';
        selector.append(opcion);
        selector.value = rutaElegida;
      }
      await cargarCarrera(rutaElegida);
    } else {
      await cargarCarrera(selector.value);
    }
  } catch (error) {
    selector.innerHTML = '<option>Lista no disponible</option>';
    await cargarCarrera('/carrera' + parametrosCarrera());
  }
}

document.getElementById('elegir-carrera').addEventListener('change', function () {
  cargarCarrera(this.value);
});

// Ejecutamos la función al abrir la página.
cargarListaCarreras();
