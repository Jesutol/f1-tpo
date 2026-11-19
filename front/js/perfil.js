import { buscar, pedir } from "./comun.js";

export async function prepararCuenta() {
  const acceso = buscar("#acceso-cuenta");
  const login = buscar("#iniciar-sesion");
  const registro = buscar("#crear-cuenta");
  const perfil = buscar("#editar-perfil");
  const salir = buscar("#cerrar-sesion");
  const estado = buscar("#estado-cuenta");
  const rutaPerfil = "/api/usuarios/perfil";
  const botones = document.querySelectorAll("main button");

  function bloquearBotones(bloqueados) {
    for (const boton of botones) {
      boton.disabled = bloqueados;
    }
  }

  function mostrarPerfil(cuenta) {
    perfil.elements.usuario.value = cuenta.usuario;
    perfil.elements.nombre.value = cuenta.nombre;
    acceso.hidden = true;
    perfil.hidden = false;
    login.reset();
    registro.reset();
  }

  function mostrarAcceso() {
    perfil.reset();
    perfil.hidden = true;
    acceso.hidden = false;
  }

  // El navegador manda la cookie del JWT en las peticiones al mismo sitio.
  function prepararFormulario(formulario, ruta, metodo, aviso) {
    formulario.onsubmit = async function (evento) {
      evento.preventDefault();
      bloquearBotones(true);
      try {
        const datos = Object.fromEntries(new FormData(formulario));
        const cuenta = await pedir(ruta, {
          method: metodo,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        });
        mostrarPerfil(cuenta);
        estado.textContent = aviso;
      } catch (error) {
        if (formulario === perfil && [401, 404].includes(error.status)) {
          mostrarAcceso();
        }
        estado.textContent = error.message;
      } finally {
        bloquearBotones(false);
      }
    };
  }

  prepararFormulario(login, "/api/sesion", "POST", "Sesión iniciada.");
  prepararFormulario(registro, "/api/usuarios", "POST", "Cuenta creada.");
  prepararFormulario(perfil, rutaPerfil, "PUT", "Perfil actualizado.");

  salir.onclick = async function () {
    bloquearBotones(true);
    try {
      const datos = await pedir("/api/sesion", { method: "DELETE" });
      mostrarAcceso();
      estado.textContent = datos.mensaje;
    } catch (error) {
      estado.textContent = error.message;
    } finally {
      bloquearBotones(false);
    }
  };

  try {
    const cuenta = await pedir(rutaPerfil);
    mostrarPerfil(cuenta);
    estado.textContent = "Sesión iniciada.";
  } catch (error) {
    mostrarAcceso();
    estado.textContent = "";
    if (error.status !== 401 && error.status !== 404) {
      estado.textContent = error.message;
    }
  }
}
