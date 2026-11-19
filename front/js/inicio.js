import {
  buscar, etiquetas, fecha, pedir, sufijoTemporada, temporadaElegida,
} from "./comun.js";
import { bandera, crearElemento, logo } from "./tablas.js";

async function cargarPodio() {
  const nombreGP = buscar("#podio-gp");
  try {
    const datos = await pedir("/api/resultados/carrera" + sufijoTemporada);
    const gp = datos.granPremio;
    nombreGP.textContent = gp.nombre;
    buscar("#podio-fecha").textContent = gp.circuito + " · " + fecha(gp.fecha_carrera);

    const lista = buscar(".inicio-podio");
    lista.replaceChildren();
    for (const resultado of datos.resultados) {
      const estaEnPodio = resultado.posicion >= 1 && resultado.posicion <= 3;
      if (!estaEnPodio) {
        continue;
      }

      const puesto = crearElemento("span", resultado.posicion, "inicio-posicion");
      const imagen = logo(resultado) || document.createElement("span");
      const nombre = (resultado.nombre ?? "—") + " " + (resultado.apellido ?? "—");
      const titulo = crearElemento("h3", nombre);
      const equipo = crearElemento("p", resultado.equipo);
      const tiempo = crearElemento("span", resultado.tiempo, "inicio-resultado");
      const puntos = crearElemento("span", "", "inicio-puntos-gp");
      puntos.append(crearElemento("strong", resultado.puntos, "puntos"), " puntos");

      const item = document.createElement("li");
      item.append(puesto, imagen, titulo, equipo, tiempo, puntos);
      lista.append(item);
    }

    if (lista.children.length === 0) {
      nombreGP.textContent = "Todavía no hay un podio cargado.";
    }
  } catch (error) {
    nombreGP.textContent = error.message;
  }
}

function hora(valor) {
  const momento = new Date(valor);
  return momento.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Salta",
  });
}

function mostrarHorarios(gp) {
  const fechaCarrera = fecha(gp.fecha_carrera);
  const horaCarrera = hora(gp.fecha_carrera);
  buscar(".inicio-fecha-carrera").replaceChildren(
    fechaCarrera,
    document.createElement("br"),
    crearElemento("strong", horaCarrera),
    document.createElement("br"),
    "Hora de Argentina",
  );

  let formato = "Fin de semana tradicional";
  if (gp.agenda && gp.agenda.sprint) {
    formato = "Fin de semana Sprint";
  }

  const ronda = document.createElement("div");
  ronda.append(crearElemento("dt", "Ronda"), crearElemento("dd", gp.ronda));
  const datosFormato = document.createElement("div");
  datosFormato.append(crearElemento("dt", "Formato"), crearElemento("dd", formato));
  buscar(".inicio-datos-circuito").replaceChildren(ronda, datosFormato);

  const agenda = Object.assign({}, gp.agenda);
  agenda.carrera = gp.fecha_carrera;
  const sesiones = [];

  for (const tipo of Object.keys(agenda)) {
    const momento = agenda[tipo];
    const instante = Date.parse(momento);
    if (Number.isFinite(instante)) {
      sesiones.push({ tipo, momento, instante });
    }
  }
  sesiones.sort(function (primera, segunda) {
    return primera.instante - segunda.instante;
  });

  const horarios = buscar(".inicio-agenda");
  horarios.replaceChildren();
  for (const sesion of sesiones) {
    let nombre = etiquetas[sesion.tipo] || sesion.tipo;
    if (sesion.tipo === "clasificacion-sprint") {
      nombre = "Clasificación Sprint";
    }
    const horario = crearElemento("li", nombre);
    horario.append(
      document.createElement("br"),
      fecha(sesion.momento) + " · " + hora(sesion.momento),
    );
    horarios.append(horario);
  }
  buscar(".inicio-horarios").hidden = false;
}

async function cargarProximaCarrera() {
  const titulo = buscar("#titulo-proxima");
  try {
    const datos = await pedir("/api/temporada" + sufijoTemporada);
    buscar(".marca").textContent = "F1 Telemetry · Temporada " + datos.temporada;
    buscar("#etiqueta-ranking").textContent = "Campeonato " + datos.temporada;

    const ahora = Date.now();
    let proxima = null;
    let fechaMasCercana = Infinity;
    for (const gp of datos.grandesPremios) {
      const dia = Date.parse(gp.fecha_carrera);
      if (dia > ahora && dia < fechaMasCercana) {
        proxima = gp;
        fechaMasCercana = dia;
      }
    }
    if (!proxima) {
      titulo.textContent = "No hay próximas carreras en el calendario cargado.";
      return;
    }

    titulo.textContent = proxima.nombre;
    buscar("#proxima-circuito").textContent = proxima.circuito;
    mostrarHorarios(proxima);
  } catch (error) {
    titulo.textContent = error.message;
  }
}

async function cargarRanking(tipo) {
  const panel = buscar("#ranking-" + tipo);
  const estado = panel.querySelector(".estado-ranking");
  if (temporadaElegida !== null) {
    const enlace = panel.querySelector("a");
    const url = new URL(enlace.href);
    url.searchParams.set("temporada", temporadaElegida);
    enlace.href = url.href;
  }

  try {
    const datos = await pedir("/api/campeonato/" + tipo + sufijoTemporada);
    if (datos.posiciones.length === 0) {
      estado.textContent = "Todavía no hay posiciones guardadas.";
      return;
    }
    const lista = panel.querySelector(".inicio-ranking");
    lista.replaceChildren();

    for (const resultado of datos.posiciones.slice(0, 3)) {
      let nombre = resultado.equipo;
      let imagen = logo(resultado);
      const descripcion = document.createElement("div");

      if (tipo === "pilotos") {
        nombre = resultado.nombre + " " + resultado.apellido;
        imagen = bandera(resultado);
        descripcion.append(crearElemento("p", resultado.equipo, "nota"));
        if (resultado.id === datos.campeonPilotoId) {
          descripcion.append(crearElemento("span", "Campeón", "etiqueta-campeon"));
        }
      }
      descripcion.prepend(crearElemento("h3", nombre));

      const icono = document.createElement("span");
      if (imagen) {
        icono.append(imagen);
      }
      const puntos = document.createElement("p");
      puntos.append(crearElemento("strong", resultado.puntos, "puntos"), " ", crearElemento("small", "pts"));

      const item = document.createElement("li");
      item.append(crearElemento("span", resultado.posicion), icono, descripcion, puntos);
      lista.append(item);
    }
    estado.hidden = true;
  } catch (error) {
    estado.textContent = error.message;
  }
}

// Las pestañas alternan los rankings con clic o con las teclas de navegación.
function prepararPestanas() {
  const pestanas = document.querySelectorAll(".inicio-pestanas button");

  function seleccionar(elegida) {
    for (const pestana of pestanas) {
      const activa = pestana === elegida;
      pestana.setAttribute("aria-selected", activa);
      pestana.tabIndex = -1;
      if (activa) {
        pestana.tabIndex = 0;
      }
      const panel = buscar("#" + pestana.getAttribute("aria-controls"));
      panel.hidden = !activa;
    }
  }

  for (const pestana of pestanas) {
    pestana.onclick = function () {
      seleccionar(pestana);
    };
    pestana.onkeydown = function (evento) {
      let siguiente;
      if (evento.key === "Home") {
        siguiente = pestanas[0];
      } else if (evento.key === "End") {
        siguiente = pestanas[1];
      } else if (evento.key === "ArrowLeft" || evento.key === "ArrowRight") {
        if (pestana === pestanas[0]) {
          siguiente = pestanas[1];
        } else {
          siguiente = pestanas[0];
        }
      } else {
        return;
      }
      evento.preventDefault();
      seleccionar(siguiente);
      siguiente.focus();
    };
  }
}

export async function cargarInicio() {
  prepararPestanas();
  // Las tarjetas son independientes, así que pueden pedir sus datos a la vez.
  await Promise.all([
    cargarPodio(),
    cargarProximaCarrera(),
    cargarRanking("pilotos"),
    cargarRanking("constructores"),
  ]);
}
