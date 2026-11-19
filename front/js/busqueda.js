import {
  buscar, consultaTemporada, etiquetas, parametros, pedir, sufijoTemporada,
} from "./comun.js";
import { encabezado, equipo, piloto, tabla } from "./tablas.js";

// La lupa enlaza al historial de cada piloto o equipo.
export function prepararBusqueda() {
  const formulario = buscar("#form-busqueda");
  if (!formulario) {
    return;
  }

  const lista = buscar("#coincidencias");
  const estado = buscar("#estado-busqueda");
  let ultimaSolicitud = 0;

  formulario.onsubmit = async function (evento) {
    evento.preventDefault();
    ultimaSolicitud++;
    const solicitudActual = ultimaSolicitud;
    const consulta = new URLSearchParams(consultaTemporada);
    consulta.set("q", buscar("#buscar-nombre").value.trim());
    lista.replaceChildren();
    estado.textContent = "Buscando…";

    try {
      const datos = await pedir("/api/buscar?" + consulta.toString());
      // Si el usuario buscó otra cosa mientras tanto, ignoramos esta respuesta.
      if (solicitudActual !== ultimaSolicitud) {
        return;
      }
      if (datos.coincidencias.length === 0) {
        estado.textContent = "No hay coincidencias en esa temporada.";
        return;
      }

      estado.textContent = "Elegí un piloto o equipo · " + datos.temporada;
      for (const coincidencia of datos.coincidencias) {
        const parametrosEnlace = new URLSearchParams();
        parametrosEnlace.set(coincidencia.tipo, coincidencia.id);
        parametrosEnlace.set("temporada", datos.temporada);

        let tipo = "Equipo";
        if (coincidencia.tipo === "piloto") {
          tipo = "Piloto";
        }
        const enlace = document.createElement("a");
        enlace.href = "/paginas/historial.html?" + parametrosEnlace.toString();
        enlace.textContent = coincidencia.nombre + " · " + tipo;

        const item = document.createElement("li");
        item.append(enlace);
        lista.append(item);
      }
    } catch (error) {
      if (solicitudActual === ultimaSolicitud) {
        estado.textContent = error.message;
      }
    }
  };
}

export async function cargarHistorial() {
  let tipo = "equipo";
  if (parametros.has("piloto")) {
    tipo = "piloto";
  }
  const id = parametros.get(tipo);
  if (!id) {
    throw new Error("Usá la lupa para elegir un piloto o equipo.");
  }
  const datos = await pedir(`/api/historial/${tipo}/${encodeURIComponent(id)}${sufijoTemporada}`);

  let puntos = 0;
  const filas = [];
  for (const resultado of datos.resultados) {
    puntos += Number(resultado.puntos);
    let posicion = resultado.posicion;
    if (posicion === null || posicion === undefined) {
      posicion = resultado.estado;
    }
    filas.push([
      resultado.ronda + ". " + resultado.gran_premio,
      etiquetas[resultado.tipo],
      posicion,
      piloto(resultado),
      equipo(resultado),
      resultado.puntos,
      resultado.tiempo || resultado.estado,
      resultado.vueltas,
    ]);
  }

  const detalle = `${filas.length} resultados de carreras y sprints · ${puntos} puntos.`;
  encabezado(datos.nombre, datos.temporada, detalle);
  const columnas = [
    "Gran Premio", "Sesión", "Posición", "Piloto", "Equipo", "Puntos", "Tiempo / Estado", "Vueltas",
  ];
  tabla("Resultados de " + datos.nombre, columnas, filas);
}
