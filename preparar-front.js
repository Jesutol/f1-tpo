const fs = require("fs");
const path = require("path");

// Vercel publica los archivos de public. Seguimos editando el sitio en front.
fs.cpSync(path.join(__dirname, "front"), path.join(__dirname, "public"), {
  recursive: true
});

console.log("Frontend preparado para Vercel");
