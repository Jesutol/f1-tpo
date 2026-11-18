// Estado de la pantalla: posición en la lista y piloto que estamos editando.
let desde = 0;
let cantidad = 10;
let idEditando = null;
let cargandoLista = false;
let consultandoPiloto = false;
let guardando = false;
const formulario = document.getElementById('formulario-piloto');
const mensaje = document.getElementById('mensaje-piloto');

function mostrarMensajePiloto(texto, esError = false) {
  mensaje.textContent = texto;
  mensaje.className = 'mensaje-correcto';
  if (esError) {
    mensaje.className = 'mensaje-error';
  }
}

function prepararFormulario(piloto) {
  idEditando = piloto._id;
  document.getElementById('id-piloto').value = piloto._id;
  document.getElementById('id-piloto').readOnly = true;
  document.getElementById('nombre-piloto').value = piloto.nombre;
  document.getElementById('apellido-piloto').value = piloto.apellido;
  document.getElementById('numero-piloto').value = piloto.numero ?? '';
  document.getElementById('pais-piloto').value = piloto.pais || '';
  document.getElementById('nacionalidad-piloto').value = piloto.nacionalidad || '';
  document.getElementById('titulo-formulario').textContent = 'Editar piloto';
  document.getElementById('guardar-piloto').textContent = 'Guardar cambios';
}

// 1. La lista pide solo una página; no descarga todos los pilotos.
async function cargarPilotos() {
  if (cargandoLista) {
    return;
  }
  cargandoLista = true;
  const tabla = document.getElementById('lista-pilotos');
  const anterior = document.getElementById('pagina-anterior');
  const siguiente = document.getElementById('pagina-siguiente');
  anterior.disabled = true;
  siguiente.disabled = true;
  document.getElementById('cantidad-pilotos').disabled = true;
  mensajeTabla(tabla, 'Cargando pilotos...', 5);
  try {
    const respuesta = await fetch('/api/pilotos?cantidad=' + cantidad + '&from=' + desde);
    const pagina = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(pagina.mensaje || 'No se pudo consultar la lista');
    }
    tabla.innerHTML = '';
    for (const piloto of pagina.datos) {
      const fila = document.createElement('tr');
      fila.innerHTML = '<td class="id-piloto"></td><th scope="row" class="piloto"></th><td class="numero"></td><td class="pais"></td><td class="accion"></td>';
      fila.querySelector('.id-piloto').textContent = piloto._id;
      fila.querySelector('.piloto').textContent = ' ' + nombrePiloto(piloto);
      ponerImagen(fila.querySelector('.piloto'), piloto.bandera, 'bandera', piloto.nacionalidad);
      fila.querySelector('.numero').textContent = piloto.numero ?? '—';
      fila.querySelector('.pais').textContent = piloto.nacionalidad || 'Sin confirmar';
      const editar = document.createElement('button');
      editar.type = 'button';
      editar.textContent = 'Editar';
      editar.setAttribute('aria-label', 'Editar a ' + nombrePiloto(piloto));
      editar.addEventListener('click', function () {
        editarPiloto(piloto._id);
      });
      fila.querySelector('.accion').append(editar);
      tabla.append(fila);
    }
    if (pagina.total === 0) {
      mensajeTabla(tabla, 'Todavía no hay pilotos guardados', 5);
      document.getElementById('detalle-pagina').textContent = '0 pilotos';
    } else {
      const hasta = Math.min(desde + cantidad, pagina.total);
      document.getElementById('detalle-pagina').textContent = (desde + 1) + '–' + hasta + ' de ' + pagina.total;
    }
    anterior.disabled = desde === 0;
    siguiente.disabled = desde + cantidad >= pagina.total;
  } catch (error) {
    mensajeTabla(tabla, error.message, 5);
    document.getElementById('detalle-pagina').textContent = 'Lista no disponible';
  } finally {
    cargandoLista = false;
    document.getElementById('cantidad-pilotos').disabled = false;
  }
}

// 2. Antes de editar, consultamos ese piloto por su id.
async function editarPiloto(id) {
  if (guardando || consultandoPiloto) {
    return;
  }
  consultandoPiloto = true;
  document.getElementById('guardar-piloto').disabled = true;
  document.getElementById('nuevo-piloto').disabled = true;
  try {
    const respuesta = await fetch('/api/pilotos/' + encodeURIComponent(id));
    const piloto = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(piloto.mensaje || 'No se pudo consultar el piloto');
    }
    prepararFormulario(piloto);
    mostrarMensajePiloto('Editando a ' + nombrePiloto(piloto));
    document.getElementById('nombre-piloto').focus();
  } catch (error) {
    mostrarMensajePiloto(error.message, true);
  } finally {
    consultandoPiloto = false;
    document.getElementById('guardar-piloto').disabled = false;
    document.getElementById('nuevo-piloto').disabled = false;
  }
}

// 3. El mismo formulario crea con POST o actualiza con PUT.
formulario.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  if (guardando || consultandoPiloto) {
    return;
  }
  guardando = true;
  const boton = document.getElementById('guardar-piloto');
  boton.disabled = true;
  document.getElementById('nuevo-piloto').disabled = true;
  const numero = document.getElementById('numero-piloto').value;
  const piloto = {
    _id: document.getElementById('id-piloto').value.trim(),
    nombre: document.getElementById('nombre-piloto').value.trim(),
    apellido: document.getElementById('apellido-piloto').value.trim(),
    numero: null,
    pais: document.getElementById('pais-piloto').value || null,
    nacionalidad: document.getElementById('nacionalidad-piloto').value.trim()
  };
  if (numero !== '') {
    piloto.numero = Number(numero);
  }
  let ruta = '/api/pilotos';
  let metodo = 'POST';
  if (idEditando) {
    ruta += '/' + encodeURIComponent(idEditando);
    metodo = 'PUT';
  }
  try {
    const respuesta = await fetch(ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(piloto)
    });
    const guardado = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(guardado.mensaje || 'No se pudo guardar el piloto');
    }
    prepararFormulario(guardado);
    mostrarMensajePiloto('Guardado en la base de datos: ' + nombrePiloto(guardado));
    await cargarPilotos();
  } catch (error) {
    mostrarMensajePiloto(error.message, true);
  } finally {
    guardando = false;
    boton.disabled = false;
    document.getElementById('nuevo-piloto').disabled = false;
  }
});

// 4. Estos botones cambian de página o preparan un piloto nuevo.
document.getElementById('nuevo-piloto').addEventListener('click', function () {
  formulario.reset();
  idEditando = null;
  document.getElementById('id-piloto').readOnly = false;
  document.getElementById('titulo-formulario').textContent = 'Agregar piloto';
  document.getElementById('guardar-piloto').textContent = 'Crear piloto';
  mostrarMensajePiloto('Formulario listo para un piloto nuevo');
  document.getElementById('id-piloto').focus();
});
document.getElementById('pagina-anterior').addEventListener('click', function () {
  desde = Math.max(0, desde - cantidad);
  cargarPilotos();
});
document.getElementById('pagina-siguiente').addEventListener('click', function () {
  desde += cantidad;
  cargarPilotos();
});
document.getElementById('cantidad-pilotos').addEventListener('change', function () {
  cantidad = Number(this.value);
  desde = 0;
  cargarPilotos();
});
document.getElementById('pais-piloto').addEventListener('change', function () {
  let texto = '';
  if (this.value !== '') {
    texto = this.selectedOptions[0].textContent;
  }
  document.getElementById('nacionalidad-piloto').value = texto;
});

cargarPilotos();
