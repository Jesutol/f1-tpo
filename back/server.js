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

// 3. Permite arrancar este archivo directamente con node back/server.js.
// npm start y Vercel usan también el server.js de la raíz.
if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, "0.0.0.0", function () {
    console.log("Servidor en el puerto " + puerto);
  });
}

module.exports = app;
