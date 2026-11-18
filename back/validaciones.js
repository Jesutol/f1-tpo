// Validaciones de las nuevas consultas. Si algo es incorrecto, respondemos 400.
const fs = require("fs");
const path = require("path");
const { errorDeConsulta } = require("./ayudas");

function leerIdPiloto(valor) {
  if (typeof valor !== "string" || valor.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(valor)) {
    throw errorDeConsulta("El id debe usar letras minúsculas, números y guiones, por ejemplo: nuevo-piloto");
  }
  return valor;
}

function leerPaginacion(query) {
  let cantidad = 10;
  let desde = 0;
  if (query.cantidad !== undefined) {
    if (typeof query.cantidad !== "string" || !/^\d+$/.test(query.cantidad)) {
      throw errorDeConsulta("cantidad debe ser un número entero entre 1 y 100");
    }
    cantidad = Number(query.cantidad);
  }
  if (query.from !== undefined) {
    if (typeof query.from !== "string" || !/^\d+$/.test(query.from)) {
      throw errorDeConsulta("from debe ser un número entero mayor o igual a 0");
    }
    desde = Number(query.from);
  }
  if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 100) {
    throw errorDeConsulta("cantidad debe ser un número entero entre 1 y 100");
  }
  if (!Number.isSafeInteger(desde) || desde < 0) {
    throw errorDeConsulta("from debe ser un número entero mayor o igual a 0");
  }
  return { cantidad: cantidad, desde: desde };
}

function leerTexto(valor, campo) {
  if (typeof valor !== "string" || valor.trim() === "" || valor.trim().length > 80) {
    throw errorDeConsulta(campo + " debe ser un texto no vacío de hasta 80 caracteres");
  }
  return valor.trim();
}

function validarPiloto(cuerpo, idExistente) {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw errorDeConsulta("Enviá un objeto JSON con los datos del piloto");
  }
  const campos = ["_id", "nombre", "apellido", "numero", "pais", "nacionalidad"];
  for (const campo of Object.keys(cuerpo)) {
    if (!campos.includes(campo)) {
      throw errorDeConsulta("Campo no permitido: " + campo);
    }
  }
  let id = idExistente;
  if (!idExistente) {
    id = leerIdPiloto(cuerpo._id);
  } else if (cuerpo._id !== undefined && cuerpo._id !== idExistente) {
    throw errorDeConsulta("El id de un piloto existente no se puede cambiar");
  }
  const nombre = leerTexto(cuerpo.nombre, "nombre");
  const apellido = leerTexto(cuerpo.apellido, "apellido");

  let numero = null;
  if (cuerpo.numero !== undefined && cuerpo.numero !== null) {
    if (!Number.isInteger(cuerpo.numero) || cuerpo.numero < 1 || cuerpo.numero > 99) {
      throw errorDeConsulta("numero debe ser un entero entre 1 y 99, o null si no se conoce");
    }
    numero = cuerpo.numero;
  }

  let pais = null;
  let bandera = null;
  if (cuerpo.pais !== undefined && cuerpo.pais !== null && cuerpo.pais !== "") {
    if (typeof cuerpo.pais !== "string" || !/^[a-z]{2}$/.test(cuerpo.pais)) {
      throw errorDeConsulta("pais debe ser un código de dos letras minúsculas, por ejemplo: ar");
    }
    const archivo = path.join(__dirname, "../front/recursos/iconos-banderas", cuerpo.pais + ".svg");
    if (!fs.existsSync(archivo)) {
      throw errorDeConsulta("No hay una bandera disponible para ese código de país");
    }
    pais = cuerpo.pais;
    bandera = "/recursos/iconos-banderas/" + pais + ".svg";
  }
  let nacionalidad = "";
  if (cuerpo.nacionalidad !== undefined && cuerpo.nacionalidad !== "") {
    nacionalidad = leerTexto(cuerpo.nacionalidad, "nacionalidad");
  }
  return { _id: id, nombre: nombre, apellido: apellido, numero: numero, pais: pais, nacionalidad: nacionalidad, bandera: bandera };
}

module.exports = { leerIdPiloto, leerPaginacion, validarPiloto };
