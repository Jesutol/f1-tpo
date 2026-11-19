import { buscar, pedir, sufijoTemporada } from "./comun.js";
import { crearElemento, encabezado, equipo, logo, piloto, tabla } from "./tablas.js";

function mostrarCampeon(campeon, temporada) {
  buscar("#titulo-campeon").textContent = "Campeón del mundo " + temporada;
  buscar("#nombre-campeon").textContent = campeon.nombre + " " + campeon.apellido;
  buscar("#equipo-campeon").textContent = campeon.equipo;
  const imagen = logo(campeon);
  const escudo = buscar("#logo-campeon");
  escudo.replaceChildren();
  if (imagen) {
    escudo.append(imagen);
  }
  buscar("#tarjeta-campeon").hidden = false;
}

// El servidor calcula la clasificación. Esta vista elige qué columnas mostrar.
export async function cargarCampeonato(tipo) {
  const datos = await pedir("/api/campeonato/" + tipo + sufijoTemporada);
  const titulo = "Campeonato de " + tipo;
  encabezado(titulo, datos.temporada, "Puntos sumados de las carreras y sprints guardados.");

  const columnas = ["Posición"];
  if (tipo === "pilotos") {
    columnas.push("Piloto");
  }
  columnas.push("Equipo", "Puntos");

  const filas = [];
  let indiceCampeon = -1;
  for (const resultado of datos.posiciones) {
    const fila = [resultado.posicion];
    if (tipo === "pilotos") {
      const nombre = piloto(resultado);
      if (resultado.id === datos.campeonPilotoId) {
        indiceCampeon = filas.length;
        mostrarCampeon(resultado, datos.temporada);
        const etiqueta = crearElemento("span", "Campeón", "etiqueta-campeon");
        const celdaPiloto = document.createDocumentFragment();
        celdaPiloto.append(nombre, etiqueta);
        fila.push(celdaPiloto);
      } else {
        fila.push(nombre);
      }
    }
    fila.push(equipo(resultado), resultado.puntos);
    filas.push(fila);
  }

  tabla(titulo, columnas, filas, indiceCampeon);
}
