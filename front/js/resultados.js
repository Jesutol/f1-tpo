import { buscar, etiquetas, fecha, parametros, pedir, sufijoTemporada } from "./comun.js";
import { crearElemento, encabezado, equipo, mensaje, piloto, tabla } from "./tablas.js";

const compuestos = {
  blando: "S",
  medio: "M",
  duro: "H",
  intermedio: "I",
  lluvia: "W",
};

function neumaticos(resultado) {
  if (!Array.isArray(resultado.neumaticos) || resultado.neumaticos.length === 0) {
    return "Sin datos";
  }

  const estrategia = crearElemento("span", "", "estrategia");
  for (const tipo of resultado.neumaticos) {
    let letra = "?";
    const neumatico = crearElemento("span", letra, "neumatico");
    if (Object.hasOwn(compuestos, tipo)) {
      letra = compuestos[tipo];
      neumatico.classList.add(tipo);
      neumatico.textContent = letra;
    }

    const tanda = crearElemento("span", "", "tanda");
    if (estrategia.children.length > 0) {
      const flecha = crearElemento("span", "→");
      flecha.setAttribute("aria-hidden", "true");
      tanda.append(flecha);
    }
    tanda.append(neumatico);
    estrategia.append(tanda);
  }
  return estrategia;
}

function paradas(resultado) {
  if (!Array.isArray(resultado.paradas)) {
    return "Sin datos";
  }
  if (resultado.paradas.length === 0) {
    return "Sin paradas";
  }

  const vueltas = document.createElement("ul");
  for (const vuelta of resultado.paradas) {
    vueltas.append(crearElemento("li", "Vuelta " + (vuelta ?? "—")));
  }
  const detalle = crearElemento("details", "", "pit-stops");
  const titulo = crearElemento("summary", resultado.paradas.length + " paradas");
  detalle.append(titulo, vueltas);
  return detalle;
}

function mostrarSesion(datos, tipo) {
  const gp = datos.granPremio;
  let dia = gp.fecha_carrera;
  if (datos.sesion && datos.sesion.fecha) {
    dia = datos.sesion.fecha;
  }
  const detalle = gp.circuito + " · " + fecha(dia);
  encabezado(gp.nombre, gp.temporada, detalle);

  const esCarrera = tipo === "carrera" || tipo === "sprint";
  const columnas = ["Posición", "Piloto", "Equipo"];
  if (esCarrera) {
    columnas.push("Puntos", "Tiempo", "Vueltas", "Neumáticos", "Paradas");
  } else if (tipo === "clasificacion") {
    columnas.push("Q1", "Q2", "Q3");
  } else {
    columnas.push("Mejor vuelta", "Gap", "Vueltas");
  }

  const filas = [];
  for (const resultado of datos.resultados) {
    // Cuando falta una posición, mostramos el estado (por ejemplo, abandono).
    let posicion = resultado.posicion;
    if (posicion === null || posicion === undefined) {
      posicion = resultado.estado;
    }
    const fila = [posicion, piloto(resultado), equipo(resultado)];
    const tiempo = resultado.tiempo || resultado.estado;

    if (esCarrera) {
      fila.push(resultado.puntos, tiempo, resultado.vueltas);
      fila.push(neumaticos(resultado), paradas(resultado));
    } else if (tipo === "clasificacion") {
      fila.push(resultado.q1, resultado.q2, resultado.q3);
    } else {
      fila.push(tiempo, resultado.gap, resultado.vueltas);
    }

    filas.push(fila);
  }
  tabla(etiquetas[tipo] + " · " + gp.nombre, columnas, filas);
}

// Último GP y Resultados consultan la misma ruta.
let ultimaSolicitud = 0;
export async function cargarSesion(tipo, ronda, temporada) {
  ultimaSolicitud++;
  const solicitudActual = ultimaSolicitud;
  mensaje("Cargando resultados…");

  const consulta = new URLSearchParams();
  if (ronda) {
    consulta.set("ronda", ronda);
  }
  if (temporada) {
    consulta.set("temporada", temporada);
  }

  try {
    const ruta = "/api/resultados/" + tipo + "?" + consulta.toString();
    const datos = await pedir(ruta);
    // Si cambió el selector mientras llegaban los datos, esta respuesta ya no sirve.
    if (solicitudActual === ultimaSolicitud) {
      mostrarSesion(datos, tipo);
    }
  } catch (error) {
    if (solicitudActual === ultimaSolicitud) {
      mensaje(error.message);
    }
  }
}

// Los selectores ofrecen los GP y las sesiones que figuran en la base.
export async function cargarResultados() {
  const datos = await pedir("/api/temporada" + sufijoTemporada);
  const selectorGP = buscar("#seleccionar-gp");
  const selectorSesion = buscar("#seleccionar-sesion");
  encabezado("Resultados", datos.temporada, "Elegí un Gran Premio y una sesión.");

  if (datos.grandesPremios.length === 0) {
    mensaje("Todavía no hay grandes premios cargados.");
    return;
  }

  // El calendario está ordenado por ronda. Guardamos la última con carrera cargada.
  let rondaInicial = datos.grandesPremios[0].ronda;
  const rondaPedida = parametros.get("ronda");
  let rondaPedidaDisponible = false;

  for (const gp of datos.grandesPremios) {
    const opcion = new Option(gp.ronda + ". " + gp.nombre, gp.ronda);
    selectorGP.add(opcion);
    if (gp.sesiones.includes("carrera")) {
      rondaInicial = gp.ronda;
    }
    if (opcion.value === rondaPedida) {
      rondaPedidaDisponible = true;
    }
  }
  if (rondaPedidaDisponible) {
    rondaInicial = rondaPedida;
  }

  selectorGP.value = rondaInicial;
  selectorGP.disabled = false;

  function elegirGP() {
    ultimaSolicitud++;
    const gp = datos.grandesPremios.find(function (granPremio) {
      return String(granPremio.ronda) === selectorGP.value;
    });

    if (!gp) {
      mensaje("Gran Premio desconocido. Elegí uno de la lista.");
      return;
    }

    encabezado(gp.nombre, datos.temporada, gp.circuito + " · " + fecha(gp.fecha_carrera));
    selectorSesion.replaceChildren();
    const sesionPedida = parametros.get("sesion");
    let sesionInicial = null;

    for (const tipo of Object.keys(etiquetas)) {
      const opcion = new Option(etiquetas[tipo], tipo);
      const disponible = gp.sesiones.includes(tipo);
      opcion.disabled = !disponible;
      selectorSesion.add(opcion);

      if (disponible && (sesionInicial === null || tipo === sesionPedida)) {
        sesionInicial = tipo;
      }
    }

    selectorSesion.disabled = sesionInicial === null;
    if (sesionInicial === null) {
      mensaje("Este GP todavía no tiene resultados cargados.");
      return;
    }
    selectorSesion.value = sesionInicial;
    cargarSesion(sesionInicial, selectorGP.value, datos.temporada);
  }

  selectorGP.onchange = elegirGP;
  selectorSesion.onchange = function () {
    cargarSesion(selectorSesion.value, selectorGP.value, datos.temporada);
  };
  elegirGP();
}
