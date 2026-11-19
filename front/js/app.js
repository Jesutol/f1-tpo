import { prepararBusqueda, cargarHistorial } from "./busqueda.js";
import { cargarCampeonato } from "./campeonato.js";
import { temporadaElegida } from "./comun.js";
import { cargarInicio } from "./inicio.js";
import { prepararCuenta } from "./perfil.js";
import { cargarResultados, cargarSesion } from "./resultados.js";
import { mensaje } from "./tablas.js";

// Cada HTML indica su vista en data-vista y, si corresponde, su tipo en data-tipo.
async function iniciar() {
  const vista = document.body.dataset.vista;
  const tipo = document.body.dataset.tipo;
  prepararBusqueda();

  try {
    switch (vista) {
      case "inicio":
        await cargarInicio();
        break;
      case "resultados":
        await cargarResultados();
        break;
      case "sesion":
        await cargarSesion(tipo, null, temporadaElegida);
        break;
      case "campeonato":
        await cargarCampeonato(tipo);
        break;
      case "historial":
        await cargarHistorial();
        break;
      case "perfil":
        await prepararCuenta();
        break;
    }
  } catch (error) {
    if (vista === "inicio") {
      document.querySelector("#titulo-proxima").textContent = error.message;
    } else if (vista === "perfil") {
      document.querySelector("#estado-cuenta").textContent = error.message;
    } else {
      mensaje(error.message);
    }
  }
}

iniciar();
