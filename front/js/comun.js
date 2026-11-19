// Los parámetros de la URL permiten elegir la temporada, el GP o un historial.
export const parametros = new URLSearchParams(location.search);
export const temporadaElegida = parametros.get("temporada");
export const consultaTemporada = new URLSearchParams();
if (temporadaElegida !== null) {
  consultaTemporada.set("temporada", temporadaElegida);
}

let sufijoTemporada = "";
if (consultaTemporada.has("temporada")) {
  sufijoTemporada = "?" + consultaTemporada.toString();
}
export { sufijoTemporada };

export const etiquetas = {
  carrera: "Carrera",
  clasificacion: "Clasificación",
  "libres-1": "Prácticas libres 1",
  "libres-2": "Prácticas libres 2",
  "libres-3": "Prácticas libres 3",
  sprint: "Sprint",
};

export function buscar(selector) {
  return document.querySelector(selector);
}

export function fecha(valor) {
  const momento = new Date(valor);
  return momento.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Salta",
  });
}

// Todas las vistas piden JSON a las rutas de Express.
export async function pedir(ruta, opciones) {
  const respuesta = await fetch(ruta, opciones);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    const error = new Error(datos.mensaje);
    error.status = respuesta.status;
    throw error;
  }

  return datos;
}
