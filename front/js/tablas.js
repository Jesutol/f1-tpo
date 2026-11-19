import { buscar } from "./comun.js";

// Identificadores que vinculan los resultados con los recursos del sitio.
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

export function crearElemento(etiqueta, valor, clase = "") {
  const elemento = document.createElement(etiqueta);
  if (valor === null || valor === undefined) {
    valor = "—";
  }
  elemento.textContent = valor;
  if (clase) {
    elemento.className = clase;
  }
  return elemento;
}

export function mensaje(valor) {
  const cuerpo = buscar("tbody");
  cuerpo.replaceChildren();
  const fila = cuerpo.insertRow();
  fila.className = "mensaje-tabla";
  fila.setAttribute("role", "row");
  const celda = fila.insertCell();
  celda.setAttribute("role", "cell");
  celda.colSpan = 8;
  celda.textContent = valor;
}

// Cada celda recibe un valor de texto o un elemento, como un logo o un menú.
export function tabla(titulo, columnas, filas, indiceCampeon = -1) {
  buscar("caption").textContent = titulo;

  const encabezadoTabla = document.createElement("tr");
  encabezadoTabla.setAttribute("role", "row");
  for (const columna of columnas) {
    const celda = crearElemento("th", columna);
    celda.scope = "col";
    celda.setAttribute("role", "columnheader");
    encabezadoTabla.append(celda);
  }
  buscar("thead").replaceChildren(encabezadoTabla);

  if (filas.length === 0) {
    mensaje("No hay resultados cargados.");
    return;
  }

  const cuerpo = buscar("tbody");
  cuerpo.replaceChildren();
  for (let indice = 0; indice < filas.length; indice++) {
    const valores = filas[indice];
    const fila = cuerpo.insertRow();
    fila.setAttribute("role", "row");
    if (indice === indiceCampeon) {
      fila.className = "campeon";
    }

    // En pantallas angostas, CSS muestra data-columna al lado del valor.
    for (let i = 0; i < valores.length; i++) {
      const celda = fila.insertCell();
      celda.setAttribute("role", "cell");
      celda.dataset.columna = columnas[i];

      const valor = valores[i];
      if (valor instanceof Node) {
        const contenido = document.createElement("div");
        contenido.append(valor);
        celda.append(contenido);
      } else {
        celda.append(crearElemento("div", valor));
      }
    }
  }
}

export function bandera(resultado) {
  if (!Object.hasOwn(banderas, resultado.nacionalidad)) {
    return null;
  }
  const codigo = banderas[resultado.nacionalidad];
  const imagen = document.createElement("img");
  imagen.className = "bandera";
  imagen.src = "/recursos/iconos-banderas/" + codigo + ".svg";
  imagen.alt = "";
  return imagen;
}

export function piloto(resultado) {
  const nombre = crearElemento("strong", "", "piloto");
  const imagen = bandera(resultado);
  if (imagen) {
    nombre.append(imagen, " ");
  }
  const nombreDePila = resultado.nombre ?? "—";
  const apellido = resultado.apellido ?? "—";
  nombre.append(nombreDePila + " " + apellido);
  return nombre;
}

export function logo(resultado) {
  const id = resultado.equipo_id || resultado.id;
  if (!Object.hasOwn(logos, id)) {
    return null;
  }
  const archivo = logos[id];
  const imagen = document.createElement("img");
  imagen.className = "logo-equipo";
  if (id === "mercedes") {
    imagen.classList.add("logo-oscuro");
  }
  imagen.src = "/recursos/logos-equipos/" + archivo + ".svg";
  imagen.alt = "";
  return imagen;
}

export function equipo(resultado) {
  const nombre = crearElemento("span", "", "equipo");
  const imagen = logo(resultado);
  if (imagen) {
    nombre.append(imagen, " ");
  }
  nombre.append(resultado.equipo ?? "—");
  return nombre;
}

export function encabezado(titulo, temporada, detalle) {
  document.title = "F1 Telemetry | " + titulo;
  buscar("h1").textContent = titulo;
  buscar(".marca").textContent = "F1 Telemetry · Temporada " + temporada;
  buscar("#detalle-vista").textContent = detalle;
}
