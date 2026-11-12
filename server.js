// Vercel encuentra el servidor desde este archivo de la carpeta principal.
const express = require("express");
const app = require("./back/server");

if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, "0.0.0.0", () => {
    console.log("Servidor en el puerto " + puerto);
  });
}

module.exports = app;
