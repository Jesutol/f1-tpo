// Los parámetros de la URL eligen la temporada, el GP y el tipo de vista.
const parametros = new URLSearchParams(location.search);
const temporadaElegida = parametros.get("temporada");
const consultaTemporada = new URLSearchParams();
if (temporadaElegida !== null) consultaTemporada.set("temporada", temporadaElegida);
const sufijoTemporada = consultaTemporada.size ? "?" + consultaTemporada : "";
const etiquetas = {
  carrera: "Carrera",
  clasificacion: "Clasificación",
  "libres-1": "Prácticas libres 1",
  "libres-2": "Prácticas libres 2",
  "libres-3": "Prácticas libres 3",
  sprint: "Sprint",
};
const logos = {
  red_bull: "redbull_racing",
  mercedes: "mercedes",
  ferrari: "ferrari",
  mclaren: "mclaren",
  aston_martin: "aston_martin",
  alpine: "alpine",
  williams: "williams",
  haas: "haas",
  rb: "racing_bulls",
  audi: "audi",
  cadillac: "cadillac",
  racing_bulls: "racing_bulls",
};
const banderas = {
  British: "uk",
  GBR: "uk",
  Dutch: "nl",
  NED: "nl",
  NLD: "nl",
  French: "fr",
  FRA: "fr",
  Italian: "it",
  ITA: "it",
  Australian: "au",
  AUS: "au",
  "New Zealander": "nz",
  NZL: "nz",
  Monegasque: "mc",
  MON: "mc",
  MCO: "mc",
  German: "de",
  GER: "de",
  DEU: "de",
  Spanish: "es",
  ESP: "es",
  Argentine: "ar",
  Argentinian: "ar",
  ARG: "ar",
  Thai: "th",
  THA: "th",
  Brazilian: "br",
  BRA: "br",
  Mexican: "mx",
  MEX: "mx",
  Canadian: "ca",
  CAN: "ca",
  Finnish: "fi",
  FIN: "fi",
  Japanese: "jp",
  JPN: "jp",
};
const buscar = (selector) => document.querySelector(selector);
const texto = (valor) =>
  String(valor ?? "—").replace(
    /[&<>"']/g,
    (letra) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        letra
      ],
  );
const fecha = (valor) =>
  new Date(valor).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Salta",
  });

// 1. Pedir datos a nuestro servidor. Los valores se escapan antes de insertarlos en HTML.
async function pedir(ruta) {
  const respuesta = await fetch(ruta);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);
  return datos;
}
// Una sola función escribe las tablas. Cada fila recibe contenido HTML ya escapado.
function mensaje(valor) {
  buscar("tbody").innerHTML =
    '<tr class="mensaje-tabla" role="row"><td role="cell" colspan="8">' + texto(valor) + "</td></tr>";
}
function tabla(titulo, columnas, filas) {
  buscar("caption").textContent = titulo;
  buscar("thead").innerHTML = '<tr role="row">' + columnas.map(columna =>
    '<th role="columnheader" scope="col">' + texto(columna) + "</th>"
  ).join("") + "</tr>";
  if (!filas.length) return mensaje("No hay resultados cargados.");

  // data-columna le permite a CSS mostrar la etiqueta junto al valor en pantallas angostas.
  buscar("tbody").innerHTML = filas.map(fila =>
    '<tr role="row">' + fila.map((valor, i) =>
      `<td role="cell" data-columna="${texto(columnas[i])}"><div>${valor}</div></td>`
    ).join("") + "</tr>"
  ).join("");
}
function piloto(r) {
  const bandera = banderas[r.nacionalidad];
  const imagen = bandera
    ? `<img class="bandera" src="/recursos/iconos-banderas/${bandera}.svg" alt=""> `
    : "";
  return `<strong class="piloto">${imagen}${texto(r.nombre)} ${texto(r.apellido)}</strong>`;
}
function logo(r) {
  const id = r.equipo_id || r.id;
  const clase = id === "mercedes" ? "logo-equipo logo-oscuro" : "logo-equipo";
  const imagen = logos[id]
    ? `<img class="${clase}" src="/recursos/logos-equipos/${logos[id]}.svg" alt=""> `
    : "";
  return imagen;
}
function equipo(r) {
  return `<span class="equipo">${logo(r)}${texto(r.equipo)}</span>`;
}
function neumaticos(r) {
  if (!Array.isArray(r.neumaticos) || !r.neumaticos.length) return "Sin datos";
  const letras = { blando: "S", medio: "M", duro: "H", intermedio: "I", lluvia: "W" };
  const tandas = r.neumaticos.map((tipo, i) => {
    const compuesto = Object.hasOwn(letras, tipo) ? tipo : "";
    const flecha = i === 0 ? "" : '<span aria-hidden="true">→</span>';
    return `<span class="tanda">${flecha}<span class="neumatico ${compuesto}">${letras[compuesto] || "?"}</span></span>`;
  });
  return '<span class="estrategia">' + tandas.join("") + "</span>";
}
function paradas(r) {
  if (!Array.isArray(r.paradas)) return "Sin datos";
  if (!r.paradas.length) return "Sin paradas";
  const vueltas = r.paradas.map(vuelta => "<li>Vuelta " + texto(vuelta) + "</li>");
  return `<details class="pit-stops"><summary>${r.paradas.length} paradas</summary><ul>${vueltas.join("")}</ul></details>`;
}

function encabezado(titulo, temporada, detalle) {
  document.title = "F1 Telemetry | " + titulo;
  buscar("h1").textContent = titulo;
  buscar(".marca").textContent = "F1 Telemetry · Temporada " + temporada;
  buscar("#detalle-vista").textContent = detalle;
}

// 2. Mostrar una sesión. La misma función sirve para Último GP y Resultados.
let solicitud = 0;
async function cargarSesion(tipo, ronda, temporada) {
  // Un cambio de selector invalida la respuesta anterior si todavía está en viaje.
  const actual = ++solicitud;
  mensaje("Cargando resultados…");
  const consulta = new URLSearchParams();
  if (ronda) consulta.set("ronda", ronda);
  if (temporada) consulta.set("temporada", temporada);
  try {
    const datos = await pedir("/api/resultados/" + tipo + "?" + consulta);
    if (actual !== solicitud) return;
    const gp = datos.granPremio;
    encabezado(gp.nombre, gp.temporada,
      gp.circuito + " · " + fecha(datos.sesion?.fecha || gp.fecha_carrera));
    const carrera = ["carrera", "sprint"].includes(tipo);
    const columnas = ["Posición", "Piloto", "Equipo"];
    if (carrera) columnas.push("Puntos", "Tiempo", "Vueltas", "Neumáticos", "Paradas");
    else if (tipo === "clasificacion") columnas.push("Q1", "Q2", "Q3");
    else columnas.push("Mejor vuelta", "Gap", "Vueltas");

    const filas = datos.resultados.map(r => {
      const fila = [texto(r.posicion ?? r.estado), piloto(r), equipo(r)];
      const tiempo = texto(r.tiempo || r.estado);
      if (carrera) return fila.concat(texto(r.puntos), tiempo, texto(r.vueltas), neumaticos(r), paradas(r));
      if (tipo === "clasificacion") return fila.concat([r.q1, r.q2, r.q3].map(texto));
      return fila.concat(tiempo, texto(r.gap), texto(r.vueltas));
    });
    tabla(etiquetas[tipo] + " · " + gp.nombre, columnas, filas);
  } catch (error) {
    if (actual === solicitud) mensaje(error.message);
  }
}

// Inicio reutiliza las tres consultas existentes: carrera, constructores y calendario.
async function cargarInicio() {
  try {
    const datos = await pedir("/api/resultados/carrera" + sufijoTemporada);
    const gp = datos.granPremio;
    buscar("#podio-gp").textContent = gp.nombre;
    buscar("#podio-fecha").textContent =
      gp.circuito + " · " + fecha(gp.fecha_carrera);
    const podio = datos.resultados.filter(
      (r) => r.posicion >= 1 && r.posicion <= 3,
    );
    buscar(".inicio-podio").innerHTML = podio
      .map(
        (r) =>
          `<li><span class="inicio-posicion">${texto(r.posicion)}</span>${logo(r) || "<span></span>"}
        <h3>${texto(r.nombre)} ${texto(r.apellido)}</h3><p>${texto(r.equipo)}</p>
        <span class="inicio-resultado">${texto(r.tiempo)}</span>
        <span class="inicio-puntos-gp"><strong class="puntos">${texto(r.puntos)}</strong> puntos</span></li>`,
      )
      .join("");
    if (!podio.length)
      buscar("#podio-gp").textContent = "Todavía no hay un podio cargado.";
  } catch (error) {
    buscar("#podio-gp").textContent = error.message;
  }
  try {
    const datos = await pedir("/api/campeonato/constructores" + sufijoTemporada);
    buscar("#constructores-nota").textContent = datos.posiciones.length
      ? "Puntos de las carreras y sprints guardados."
      : "Todavía no hay puntajes cargados.";
    buscar(".inicio-constructores").innerHTML = datos.posiciones
      .slice(0, 3)
      .map(
        (r) =>
          `<li><span>${texto(r.posicion)}</span>${logo(r) || "<span></span>"}<h3>${texto(r.equipo)}</h3>
        <p><strong class="puntos">${texto(r.puntos)}</strong> <small>puntos</small></p></li>`,
      )
      .join("");
  } catch (error) {
    buscar("#constructores-nota").textContent = error.message;
  }
  try {
    const datos = await pedir("/api/temporada" + sufijoTemporada);
    buscar(".marca").textContent =
      "F1 Telemetry · Temporada " + datos.temporada;
    buscar("h1").textContent =
      "Resumen temporada " + datos.temporada + " de F1";
    const proxima = datos.grandesPremios
      .filter((g) => Date.parse(g.fecha_carrera) > Date.now())
      .sort(
        (a, b) => Date.parse(a.fecha_carrera) - Date.parse(b.fecha_carrera),
      )[0];
    if (!proxima) {
      buscar("#titulo-proxima").textContent =
        "No hay próximas carreras en el calendario cargado.";
      return;
    }
    const hora = (valor) =>
      new Date(valor).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Salta",
      });
    buscar("#titulo-proxima").textContent = proxima.nombre;
    buscar("#proxima-circuito").textContent = proxima.circuito;
    buscar(".inicio-fecha-carrera").innerHTML =
      texto(fecha(proxima.fecha_carrera)) +
      "<br><strong>" +
      texto(hora(proxima.fecha_carrera)) +
      "</strong><br>Hora de Argentina";
    buscar(".inicio-datos-circuito").innerHTML =
      `<div><dt>Ronda</dt><dd>${texto(proxima.ronda)}</dd></div>
       <div><dt>Formato</dt><dd>${proxima.agenda?.sprint ? "Fin de semana Sprint" : "Fin de semana tradicional"}</dd></div>`;
    const agenda = Object.entries({
      ...proxima.agenda,
      carrera: proxima.fecha_carrera,
    })
      .filter(([, momento]) => Number.isFinite(Date.parse(momento)))
      .sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]));
    buscar(".inicio-agenda").innerHTML = agenda
      .map(
        ([tipo, momento]) =>
          "<li>" +
          texto(
            tipo === "clasificacion-sprint"
              ? "Clasificación Sprint"
              : etiquetas[tipo] || tipo,
          ) +
          "<br>" +
          texto(fecha(momento)) +
          " · " +
          texto(hora(momento)) +
          "</li>",
      )
      .join("");
  } catch (error) {
    buscar("#titulo-proxima").textContent = error.message;
  }
}

// La lupa muestra enlaces al historial usando la misma página de tablas.
function prepararBusqueda() {
  const formulario = buscar("#form-busqueda");
  if (!formulario) return;
  let solicitudBusqueda = 0;
  formulario.onsubmit = async (evento) => {
    evento.preventDefault();
    const actual = ++solicitudBusqueda;
    const consulta = new URLSearchParams(consultaTemporada);
    consulta.set("q", buscar("#buscar-nombre").value.trim());
    buscar("#coincidencias").innerHTML = "";
    buscar("#estado-busqueda").textContent = "Buscando…";
    try {
      const datos = await pedir("/api/buscar?" + consulta);
      if (actual !== solicitudBusqueda) return;
      buscar("#estado-busqueda").textContent = datos.coincidencias.length
        ? "Elegí un piloto o equipo · " + datos.temporada
        : "No hay coincidencias en esa temporada.";
      buscar("#coincidencias").innerHTML = datos.coincidencias
        .map((r) => {
          const enlace = new URLSearchParams({
            [r.tipo]: r.id,
            temporada: datos.temporada,
          });
          return (
            '<li><a href="/paginas/campeonato.html?' +
            texto(enlace.toString()) +
            '">' +
            texto(r.nombre) +
            " · " +
            (r.tipo === "piloto" ? "Piloto" : "Equipo") +
            "</a></li>"
          );
        })
        .join("");
    } catch (error) {
      if (actual === solicitudBusqueda)
        buscar("#estado-busqueda").textContent = error.message;
    }
  };
}
async function cargarHistorial() {
  const tipo = parametros.has("piloto") ? "piloto" : "equipo";
  const id = encodeURIComponent(parametros.get(tipo));
  const datos = await pedir(`/api/historial/${tipo}/${id}${sufijoTemporada}`);
  const puntos = datos.resultados.reduce((suma, r) => suma + Number(r.puntos), 0);
  encabezado(datos.nombre, datos.temporada,
    `${datos.resultados.length} resultados de carreras y sprints · ${puntos} puntos.`);

  tabla("Resultados de " + datos.nombre,
    ["Gran Premio", "Sesión", "Posición", "Piloto", "Equipo", "Puntos", "Tiempo / Estado", "Vueltas"],
    datos.resultados.map(r => [
      texto(r.ronda + ". " + r.gran_premio), texto(etiquetas[r.tipo]),
      texto(r.posicion ?? r.estado), piloto(r), equipo(r),
      texto(r.puntos), texto(r.tiempo || r.estado), texto(r.vueltas),
    ]));
}

async function cargarCampeonato() {
  const tipo = parametros.get("tipo") || "pilotos";
  if (!["pilotos", "constructores"].includes(tipo))
    throw new Error("Campeonato desconocido.");
  const datos = await pedir("/api/campeonato/" + tipo + sufijoTemporada);
  const titulo = "Campeonato de " + tipo;
  encabezado(titulo, datos.temporada, "Puntos sumados de las carreras y sprints guardados.");
  const columnas = ["Posición", "Equipo", "Puntos"];
  if (tipo === "pilotos") columnas.splice(1, 0, "Piloto");
  const filas = datos.posiciones.map(r => {
    const fila = [texto(r.posicion), equipo(r), texto(r.puntos)];
    if (tipo === "pilotos") fila.splice(1, 0, piloto(r));
    return fila;
  });
  tabla(titulo, columnas, filas);
}

// Los selectores ofrecen los GP y las sesiones que figuran en la base.
async function cargarResultados() {
  buscar("#filtros-resultados").hidden = false;
  const datos = await pedir("/api/temporada" + sufijoTemporada);
  const gps = buscar("#seleccionar-gp"),
    sesiones = buscar("#seleccionar-sesion");
  encabezado("Resultados", datos.temporada, "Elegí un Gran Premio y una sesión.");
  datos.grandesPremios.forEach((gp) =>
    gps.add(new Option(gp.ronda + ". " + gp.nombre, gp.ronda)),
  );
  if (!datos.grandesPremios.length)
    return mensaje("Todavía no hay grandes premios cargados.");
  const ultimo = [...datos.grandesPremios]
    .reverse()
    .find((gp) => gp.sesiones.includes("carrera"));
  const ronda = parametros.get("ronda");
  if (datos.grandesPremios.some(gp => String(gp.ronda) === ronda)) gps.value = ronda;
  else gps.value = ultimo?.ronda || datos.grandesPremios[0].ronda;
  gps.disabled = false;
  function elegirGP() {
    ++solicitud;
    const gp = datos.grandesPremios.find((g) => String(g.ronda) === gps.value);
    if (!gp) return mensaje("Gran Premio desconocido. Elegí uno de la lista.");
    encabezado(gp.nombre, datos.temporada, gp.circuito + " · " + fecha(gp.fecha_carrera));
    sesiones.replaceChildren();
    for (const [tipo, nombre] of Object.entries(etiquetas)) {
      const opcion = new Option(nombre, tipo);
      opcion.disabled = !gp.sesiones.includes(tipo);
      sesiones.add(opcion);
    }
    const disponibles = [...sesiones.options].filter((o) => !o.disabled);
    sesiones.disabled = !disponibles.length;
    if (!disponibles.length)
      return mensaje("Este GP todavía no tiene resultados cargados.");
    sesiones.value = disponibles.some(
      (o) => o.value === parametros.get("sesion"),
    )
      ? parametros.get("sesion")
      : disponibles[0].value;
    cargarSesion(sesiones.value, gps.value, datos.temporada);
  }
  gps.onchange = elegirGP;
  sesiones.onchange = () =>
    cargarSesion(sesiones.value, gps.value, datos.temporada);
  elegirGP();
}
// Express sirve el mismo HTML para las tres vistas con tabla.
async function iniciar() {
  if (document.body.dataset.vista === "inicio") return cargarInicio();
  const pagina = location.pathname.split("/").pop();
  if (pagina === "sesion.html") {
    const tipo = parametros.get("sesion") || "carrera";
    if (!Object.hasOwn(etiquetas, tipo)) throw new Error("Sesión desconocida.");
    return cargarSesion(tipo, null, temporadaElegida);
  }
  if (pagina === "campeonato.html") {
    if (parametros.has("piloto") || parametros.has("equipo")) return cargarHistorial();
    return cargarCampeonato();
  }
  return cargarResultados();
}
prepararBusqueda();
iniciar().catch((error) => mensaje(error.message));
