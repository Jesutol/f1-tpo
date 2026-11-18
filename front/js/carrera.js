const letras = {
  blando: 'S', medio: 'M', duro: 'H', intermedio: 'I', lluvia: 'W'
};

// Muestra un mensaje que ocupa las seis columnas de la tabla.
function mostrarMensaje(texto) {
  const tabla = document.getElementById('resultados-carrera');
  tabla.innerHTML = '<tr><td colspan="6"></td></tr>';
  tabla.querySelector('td').textContent = texto;
}

async function cargarCarrera() {
  try {
    // 1. Pedimos la última carrera al backend.
    const respuesta = await fetch('/carrera');
    if (!respuesta.ok) {
      throw new Error('No se pudo consultar la carrera');
    }
    const carrera = await respuesta.json();

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
  }
}

// Ejecutamos la función al abrir la página.
cargarCarrera();
