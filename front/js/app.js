const parametros = new URLSearchParams(location.search);
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
const celda = (valor) => "<td>" + texto(valor) + "</td>";
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
function mensaje(textoMensaje) {
  buscar("tbody").innerHTML =
    '<tr><td colspan="8">' + texto(textoMensaje) + "</td></tr>";
}
function tabla(titulo, columnas, filas) {
  buscar("caption").textContent = titulo;
  buscar("thead").innerHTML =
    "<tr>" +
    columnas.map((c) => '<th scope="col">' + texto(c) + "</th>").join("") +
    "</tr>";
  buscar("tbody").innerHTML = filas.length
    ? filas.map((f) => "<tr>" + f + "</tr>").join("")
    : '<tr><td colspan="8">No hay resultados cargados para esta sesión.</td></tr>';
}
function piloto(r) {
  const bandera = banderas[r.nacionalidad];
  const imagen = bandera
    ? `<img class="bandera" src="/recursos/iconos-banderas/${bandera}.svg" alt=""> `
    : "";
  return (
    '<th scope="row" class="piloto">' +
    imagen +
    texto(r.nombre) +
    " " +
    texto(r.apellido) +
    "</th>"
  );
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
  return '<td class="equipo">' + logo(r) + texto(r.equipo) + "</td>";
}
function neumaticos(r) {
  if (!Array.isArray(r.neumaticos)) return celda("Sin datos");
  const letras = {
    blando: "S",
    medio: "M",
    duro: "H",
    intermedio: "I",
    lluvia: "W",
  };
  return (
    '<td><div class="estrategia">' +
    r.neumaticos
      .map(
        (tipo) =>
          `<span class="neumatico ${letras[tipo] ? tipo : ""}">${letras[tipo] || "?"}</span>`,
      )
      .join(" → ") +
    "</div></td>"
  );
}
function paradas(r) {
  if (!Array.isArray(r.paradas)) return celda("Sin datos");
  if (!r.paradas.length) return celda("Sin paradas");
  return (
    `<td><details class="pit-stops"><summary>${r.paradas.length} paradas</summary><ul>` +
    r.paradas
      .map((vuelta) => "<li>Vuelta " + texto(vuelta) + "</li>")
      .join("") +
    "</ul></details></td>"
  );
}

// 2. Mostrar una sesión. La misma función sirve para Último GP y Resultados.
let solicitud = 0;
async function cargarSesion(tipo, ronda, temporada) {
  const actual = ++solicitud;
  mensaje("Cargando resultados…");
  const consulta = new URLSearchParams();
  if (ronda) consulta.set("ronda", ronda);
  if (temporada) consulta.set("temporada", temporada);
  try {
    const datos = await pedir("/api/resultados/" + tipo + "?" + consulta);
    if (actual !== solicitud) return;
    const gp = datos.granPremio;
    buscar("#temporada-carrera").textContent =
      "F1 Telemetry · Temporada " + gp.temporada;
    buscar("#nombre-carrera").textContent = gp.nombre;
    buscar("#detalle-carrera").textContent =
      gp.circuito + " · " + fecha(datos.sesion?.fecha || gp.fecha_carrera);
    const carrera = ["carrera", "sprint"].includes(tipo);
    const columnas = ["Posición", "Piloto", "Equipo"].concat(
      carrera
        ? ["Puntos", "Tiempo", "Vueltas", "Neumáticos usados", "Paradas"]
        : tipo === "clasificacion"
          ? ["Q1", "Q2", "Q3"]
          : ["Mejor vuelta", "Gap", "Vueltas"],
    );
    const filas = datos.resultados.map((r) => {
      let fila = celda(r.posicion ?? r.estado) + piloto(r) + equipo(r);
      if (carrera)
        fila +=
          celda(r.puntos) +
          celda(r.tiempo || r.estado) +
          celda(r.vueltas) +
          neumaticos(r) +
          paradas(r);
      else if (tipo === "clasificacion")
        fila += celda(r.q1) + celda(r.q2) + celda(r.q3);
      else
        fila += celda(r.tiempo || r.estado) + celda(r.gap) + celda(r.vueltas);
      return fila;
    });
    tabla(etiquetas[tipo] + " · " + gp.nombre, columnas, filas);
  } catch (error) {
    if (actual === solicitud) mensaje(error.message);
  }
}

// Inicio reutiliza las tres consultas existentes: carrera, constructores y calendario.
async function cargarInicio() {
  const consulta = parametros.has("temporada")
    ? "?temporada=" + encodeURIComponent(parametros.get("temporada"))
    : "";
  try {
    const datos = await pedir("/api/resultados/carrera" + consulta);
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
    const datos = await pedir("/api/campeonato/constructores" + consulta);
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
    const datos = await pedir("/api/temporada" + consulta);
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
    const consulta = new URLSearchParams({
      q: buscar("#buscar-nombre").value.trim(),
    });
    if (parametros.has("temporada"))
      consulta.set("temporada", parametros.get("temporada"));
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
  const consulta = parametros.has("temporada")
    ? "?temporada=" + encodeURIComponent(parametros.get("temporada"))
    : "";
  const datos = await pedir(
    "/api/historial/" +
      tipo +
      "/" +
      encodeURIComponent(parametros.get(tipo)) +
      consulta,
  );
  buscar("h1").textContent = datos.nombre;
  document.title = "F1 Telemetry | " + datos.nombre;
  buscar(".marca").textContent = "F1 Telemetry · Temporada " + datos.temporada;
  const puntos = datos.resultados.reduce(
    (suma, r) => suma + Number(r.puntos),
    0,
  );
  buscar("#nota-campeonato").textContent =
    datos.resultados.length +
    " resultados de carreras y sprints guardados · " +
    puntos +
    " puntos.";
  tabla(
    "Resultados de " + datos.nombre,
    [
      "Gran Premio",
      "Sesión",
      "Posición",
      "Piloto",
      "Equipo",
      "Puntos",
      "Tiempo / Estado",
      "Vueltas",
    ],
    datos.resultados.map(
      (r) =>
        celda(r.ronda + ". " + r.gran_premio) +
        celda(etiquetas[r.tipo]) +
        celda(r.posicion ?? r.estado) +
        piloto(r) +
        equipo(r) +
        celda(r.puntos) +
        celda(r.tiempo || r.estado) +
        celda(r.vueltas),
    ),
  );
  if (!datos.resultados.length)
    mensaje("Todavía no hay carreras o sprints cargados para esta búsqueda.");
}

// 3. Elegir qué vista cargar según la página abierta.
async function iniciar() {
  if (document.body.dataset.vista === "inicio") return cargarInicio();
  if (document.body.dataset.vista === "sesion") {
    const tipo = parametros.get("sesion") || "carrera";
    if (!Object.hasOwn(etiquetas, tipo)) throw new Error("Sesión desconocida.");
    return cargarSesion(tipo, null, parametros.get("temporada"));
  }
  if (document.body.dataset.vista === "campeonato") {
    if (parametros.has("piloto") || parametros.has("equipo"))
      return cargarHistorial();
    const tipo = parametros.get("tipo") || "pilotos";
    if (!["pilotos", "constructores"].includes(tipo))
      throw new Error("Campeonato desconocido.");
    const consulta = parametros.has("temporada")
      ? "?temporada=" + encodeURIComponent(parametros.get("temporada"))
      : "";
    const datos = await pedir("/api/campeonato/" + tipo + consulta);
    buscar("h1").textContent = "Campeonato de " + tipo;
    buscar(".marca").textContent =
      "F1 Telemetry · Temporada " + datos.temporada;
    buscar("#nota-campeonato").textContent =
      "Puntos sumados de las carreras y sprints guardados en la base.";
    const columnas =
      tipo === "pilotos"
        ? ["Posición", "Piloto", "Equipo", "Puntos"]
        : ["Posición", "Equipo", "Puntos"];
    tabla(
      "Campeonato de " + tipo,
      columnas,
      datos.posiciones.map(
        (r) =>
          celda(r.posicion) +
          (tipo === "pilotos" ? piloto(r) : "") +
          equipo(r) +
          celda(r.puntos),
      ),
    );
    return;
  }
  const consulta = parametros.has("temporada")
    ? "?temporada=" + encodeURIComponent(parametros.get("temporada"))
    : "";
  const datos = await pedir("/api/temporada" + consulta);
  const gps = buscar("#seleccionar-gp"),
    sesiones = buscar("#seleccionar-sesion");
  buscar("#temporada-carrera").textContent =
    "F1 Telemetry · Temporada " + datos.temporada;
  buscar("#estado-resultados").textContent =
    "Se muestran las sesiones que ya están guardadas en PostgreSQL.";
  datos.grandesPremios.forEach((gp) =>
    gps.add(new Option(gp.ronda + ". " + gp.nombre, gp.ronda)),
  );
  if (!datos.grandesPremios.length)
    return mensaje("Todavía no hay grandes premios cargados.");
  const ultimo = [...datos.grandesPremios]
    .reverse()
    .find((gp) => gp.sesiones.includes("carrera"));
  gps.value =
    parametros.get("ronda") || ultimo?.ronda || datos.grandesPremios[0].ronda;
  gps.disabled = false;
  function elegirGP() {
    ++solicitud;
    const gp = datos.grandesPremios.find((g) => String(g.ronda) === gps.value);
    if (!gp) return mensaje("Gran Premio desconocido. Elegí uno de la lista.");
    buscar("#nombre-carrera").textContent = gp.nombre;
    buscar("#detalle-carrera").textContent =
      gp.circuito + " · " + fecha(gp.fecha_carrera);
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
prepararBusqueda();
iniciar().catch((error) => mensaje(error.message));
