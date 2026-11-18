async function cargarSesion() {
  // El HTML indica qué sesión consultar: clasificación o una práctica.
  const tipo = document.body.dataset.sesion;
  const titulo = document.body.dataset.titulo;
  const tabla = document.getElementById('resultados-sesion');
  let columnas = 5;
  if (tipo === 'clasificacion') {
    columnas = 7;
  }

  try {
    // 1. Pedimos la sesión al servidor y leemos su respuesta.
    const respuesta = await fetch('/sesiones/' + tipo);
    if (!respuesta.ok) {
      throw new Error('No se pudo consultar la sesión');
    }
    const sesion = await respuesta.json();

    // 2. Completamos los títulos, el circuito y la fecha.
    document.getElementById('nombre-sesion').textContent = 'GP de ' + sesion.granPremio;
    document.getElementById('detalle-sesion').textContent = sesion.circuito + ' · ' + fechaTexto(sesion.fecha);
    document.getElementById('temporada-sesion').textContent = 'F1 Telemetry · Temporada ' + sesion.temporada;
    document.getElementById('titulo-tabla').textContent = titulo + ' · ' + sesion.granPremio;
    document.title = 'F1 Telemetry | ' + titulo + ' · ' + sesion.granPremio;

    // 3. Limpiamos la tabla y ordenamos los resultados.
    tabla.innerHTML = '';
    sesion.resultados.sort(function (a, b) {
      return a.orden - b.orden;
    });
    if (sesion.resultados.length === 0) {
      mensajeTabla(tabla, 'Todavía no hay resultados guardados', columnas);
    }

    // 4. Creamos una fila por piloto, igual que en carrera.js.
    for (const piloto of sesion.resultados) {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td class="posicion"></td>
        <th scope="row" class="piloto"></th>
        <td class="equipo"></td>
      `;
      fila.querySelector('.posicion').textContent = piloto.posicion;
      fila.querySelector('.piloto').textContent = ' ' + piloto.nombre + ' ' + piloto.apellido;
      fila.querySelector('.equipo').textContent = ' ' + piloto.equipo;

      // 5. Agregamos la bandera y el logo que vienen de MongoDB.
      ponerImagen(fila.querySelector('.piloto'), piloto.bandera, 'bandera', piloto.nacionalidad);
      let claseLogo = 'logo-equipo';
      if (piloto.equipoId === 'mercedes' || piloto.equipo === 'Mercedes') {
        claseLogo += ' logo-oscuro';
      }
      ponerImagen(fila.querySelector('.equipo'), piloto.logo, claseLogo);
      if (piloto.pilotoId === 'colapinto') {
        fila.className = 'colapinto';
      }

      // 6. Clasificación muestra tres tiempos. Las prácticas muestran uno.
      if (tipo === 'clasificacion') {
        const tiempos = [piloto.q1, piloto.q2, piloto.q3];
        for (const tiempo of tiempos) {
          const celda = document.createElement('td');
          celda.textContent = tiempo || '—';
          fila.append(celda);
        }
      } else {
        const celda = document.createElement('td');
        celda.textContent = piloto.tiempo || piloto.gap || 'Sin tiempo';
        fila.append(celda);
      }

      // 7. Agregamos las vueltas y la fila terminada.
      const vueltas = document.createElement('td');
      vueltas.textContent = '—';
      if (piloto.vueltas != null) {
        vueltas.textContent = piloto.vueltas;
      }
      fila.append(vueltas);
      tabla.append(fila);
    }

    // 8. Mostramos las aclaraciones guardadas para esta sesión.
    const notas = document.getElementById('notas-sesion');
    notas.innerHTML = '';
    if (sesion.notas) {
      for (const nota of sesion.notas) {
        const parrafo = document.createElement('p');
        parrafo.className = 'nota';
        parrafo.textContent = nota;
        notas.append(parrafo);
      }
    }
  } catch (error) {
    mensajeTabla(tabla, error.message, columnas);
    document.getElementById('detalle-sesion').textContent = 'Datos no disponibles';
  }
}

// Ejecutamos la función al abrir la página.
cargarSesion();
