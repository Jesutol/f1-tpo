const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
app.use(express.json());

// En Vercel usamos Atlas. En la computadora también podemos usar MongoDB local.
const direccionMongo =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const cliente = new MongoClient(direccionMongo, { maxPoolSize: 5 });

// Para abrir el frontend al ejecutar el proyecto en la computadora.
// En Vercel, los archivos se publican desde la copia generada en public.
app.use(express.static(path.join(__dirname, "../front")));

app.get("/carrera", async (req, res) => {
  try {
    // El mismo cliente reutiliza la conexión entre consultas.
    await cliente.connect();
    const db = cliente.db("f1_tpo");
    const carrera = await db.collection("carreras").findOne(
      {},
      { sort: { temporada: -1, carreraId: -1 } }
    );

    if (!carrera) {
      return res.status(404).json({
        mensaje: "No hay carreras guardadas"
      });
    }

    res.json(carrera);
  } catch (error) {
    console.error("Error al consultar la carrera:", error.message);
    res.status(500).json({
      mensaje: "No se pudo consultar la carrera"
    });
  }
});

app.get("/pilotos", async (req, res) => {
  try {
    await cliente.connect();
    const db = cliente.db("f1_tpo");
    const pilotos = await db.collection("pilotos").find({}).toArray();
    res.json(pilotos);
  } catch (error) {
    console.error("Error al consultar los pilotos:", error.message);
    res.status(500).json({
      mensaje: "No se pudieron consultar los pilotos"
    });
  }
});

// Conserva la opción de ejecutar: node back/server.js.
if (require.main === module) {
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, "0.0.0.0", () => {
    console.log("Servidor en el puerto " + puerto);
  });
}

// Vercel recibe la aplicación sin iniciar otro servidor.
module.exports = app;
