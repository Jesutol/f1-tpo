async function cargarCampeonato() {
  // El HTML indica si esta página muestra pilotos o constructores.
  const tipo = document.body.dataset.campeonato;
  const tabla = document.getElementById('resultados-campeonato');
  let columnas = 3;
  if (tipo === 'pilotos') {
    columnas = 4;
  }

  try {
    // 1. Pedimos el campeonato al servidor y leemos su respuesta.
    const respuesta = await fetch('/campeonato/' + tipo);
    if (!respuesta.ok) {
      throw new Error('No se pudo consultar el campeonato');
    }
    const campeonato = await respuesta.json();

    // 2. Completamos los títulos y la fecha.
    document.getElementById('temporada-campeonato').textContent = 'F1 Telemetry · Temporada ' + campeonato.temporada;
    document.getElementById('detalle-campeonato').textContent = 'Actualizado al ' + fechaTexto(campeonato.fechaCorte);
    document.getElementById('titulo-tabla').textContent = 'Campeonato de ' + tipo + ' ' + campeonato.temporada;

    // 3. Limpiamos la tabla y ordenamos las posiciones.
    tabla.innerHTML = '';
    campeonato.resultados.sort(function (a, b) {
      return a.posicion - b.posicion;
    });
    if (campeonato.resultados.length === 0) {
      mensajeTabla(tabla, 'Todavía no hay posiciones guardadas', columnas);
      return;
    }

    // 4. Creamos una fila con la misma estructura que el HTML.
    for (const resultado of campeonato.resultados) {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td class="posicion"></td>
        <td class="equipo"></td>
        <td class="puntos"></td>
      `;
      fila.querySelector('.posicion').textContent = resultado.posicion;
      fila.querySelector('.equipo').textContent = ' ' + resultado.equipo;
      fila.querySelector('.puntos').textContent = resultado.puntos;

      // La tabla de pilotos tiene una columna más: el nombre y la bandera.
      if (tipo === 'pilotos') {
        const piloto = document.createElement('th');
        piloto.scope = 'row';
        piloto.className = 'piloto';
        piloto.textContent = ' ' + resultado.nombre + ' ' + resultado.apellido;
        ponerImagen(piloto, resultado.bandera, 'bandera', resultado.nacionalidad);
        fila.insertBefore(piloto, fila.querySelector('.equipo'));
      }

      // 5. Agregamos el logo y destacamos a Colapinto.
      let claseLogo = 'logo-equipo';
      if (resultado.equipoId === 'mercedes' || resultado.equipo === 'Mercedes') {
        claseLogo += ' logo-oscuro';
      }
      ponerImagen(fila.querySelector('.equipo'), resultado.logo, claseLogo);
      if (resultado.pilotoId === 'colapinto') {
        fila.className = 'colapinto';
      }

      // 6. Agregamos la fila terminada a la tabla.
      tabla.append(fila);
    }
  } catch (error) {
    mensajeTabla(tabla, error.message, columnas);
    document.getElementById('detalle-campeonato').textContent = 'Datos no disponibles';
  }
}

// Ejecutamos la función al abrir la página.
cargarCampeonato();
