// 1. Preparamos Express y publicamos los archivos del frontend.
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../front")));

// 2. Cada archivo contiene los GET de una parte de la página.
app.use(require("./rutas/carreras"));
app.use(require("./rutas/sesiones"));
app.use(require("./rutas/campeonatos"));
app.use(require("./rutas/inicio"));
app.use(require("./rutas/catalogos"));
app.use(require("./rutas/pilotos"));

// Los errores de la API también se entregan como JSON.
app.use("/api", function (req, res) {
  res.status(404).json({ mensaje: "La dirección solicitada no existe en la API" });
});
app.use(function (error, req, res, next) {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ mensaje: "El cuerpo de la solicitud no contiene JSON válido" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ mensaje: "El contenido enviado es demasiado grande" });
  }
  console.error(error.message);
  res.status(500).json({ mensaje: "Ocurrió un error en el servidor" });
});

// 3. Permite arrancar este archivo directamente con node back/server.js.
// npm start y Vercel usan también el server.js de la raíz.
if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, "0.0.0.0", function () {
    console.log("Servidor en el puerto " + puerto);
  });
}

module.exports = app;
