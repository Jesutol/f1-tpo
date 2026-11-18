// Ayudas para mostrar textos, imágenes, fechas y mensajes.
// Crea una etiqueta y le coloca texto para las tarjetas del inicio.
function crearElemento(etiqueta, texto = '', clase = '') {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  elemento.className = clase;
  return elemento;
}

// Agrega una bandera o un logo delante del texto.
function ponerImagen(elemento, ruta, clase, descripcion = '') {
  // Si no hay una imagen local, dejamos solamente el texto.
  if (!ruta || !ruta.startsWith('/recursos/')) {
    return;
  }
  const imagen = document.createElement('img');
  imagen.src = ruta;
  imagen.className = clase;
  imagen.alt = descripcion;
  imagen.addEventListener('error', function () {
    imagen.remove();
  });
  elemento.prepend(imagen);
}

function nombrePiloto(resultado) {
  let nombre = resultado.nombre || '';
  if (resultado.apellido) {
    nombre += ' ' + resultado.apellido;
  }
  return nombre.trim();
}

// Convierte la fecha guardada en una fecha para mostrar en pantalla.
function fechaTexto(fecha) {
  if (!fecha) {
    return 'Fecha sin confirmar';
  }
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(fecha + 'T00:00:00Z'));
}

// Muestra un mensaje en lugar de las filas de una tabla.
function mensajeTabla(tabla, texto, columnas) {
  const fila = crearElemento('tr');
  const celda = crearElemento('td', texto);
  celda.colSpan = columnas;
  fila.append(celda);
  tabla.replaceChildren(fila);
}
