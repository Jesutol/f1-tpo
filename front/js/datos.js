// Ayudas para mostrar textos, imágenes, fechas y mensajes.

// Leemos el año y la fecha elegidos desde la dirección de la página.
// Ejemplo: resultado-clasificacion.html?temporada=2026&carreraId=20
function parametrosCarrera() {
  const direccion = new URLSearchParams(window.location.search);
  const parametros = new URLSearchParams();
  if (direccion.has('temporada')) {
    parametros.set('temporada', direccion.get('temporada'));
  }
  if (direccion.has('carreraId')) {
    parametros.set('carreraId', direccion.get('carreraId'));
  }
  if (parametros.toString() === '') {
    return '';
  }
  return '?' + parametros.toString();
}

// Conservamos el mismo GP al ir de carrera a clasificación o prácticas.
function conservarCarrera(temporada, carreraId) {
  const direccion = new URL(window.location.href);
  direccion.searchParams.set('temporada', temporada);
  direccion.searchParams.set('carreraId', carreraId);
  window.history.replaceState(null, '', direccion);

  const enlaces = document.querySelectorAll('.menu-ultimo-gp .submenu a');
  for (const enlace of enlaces) {
    const destino = new URL(enlace.href);
    destino.searchParams.set('temporada', temporada);
    destino.searchParams.set('carreraId', carreraId);
    enlace.href = destino.href;
  }
}

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
