const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
app.use(express.json());

const cliente = new MongoClient("mongodb://127.0.0.1:27017");

app.get("/", (req, res) => {
  res.send("El servidor de F1 está funcionando");
});

// Publica los HTML, estilos, imágenes y scripts de la carpeta front.
app.use(express.static(path.join(__dirname, "../front")));

async function iniciar() {
  try {
    await cliente.connect();

    const db = cliente.db("f1_tpo");

    app.get("/carrera", async (req, res) => {
      try {
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
        console.error(error);
        res.status(500).json({
          mensaje: "No se pudo consultar la carrera"
        });
      }
    });

    app.get("/pilotos", async (req, res) => {
  try {
    const pilotos = await db
      .collection("pilotos")
      .find({})
      .toArray();

    res.json(pilotos);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se pudieron consultar los pilotos"
    });
  }
});

app.post("/pilotos", async (req, res) => {
  try {
    const { nombre, apellido, numero, nacionalidad } = req.body ?? {};

    if (
      typeof nombre !== "string" || !nombre.trim() ||
      typeof apellido !== "string" || !apellido.trim() ||
      typeof nacionalidad !== "string" || !nacionalidad.trim() ||
      !Number.isInteger(numero) || numero < 0
    ) {
      return res.status(400).json({
        mensaje: "Completá los textos y usá un número entero no negativo"
      });
    }

    const piloto = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      numero,
      nacionalidad: nacionalidad.trim()
    };

    const resultado = await db.collection("pilotos").insertOne(piloto);

    res.status(201).json({
      mensaje: "Piloto creado",
      id: resultado.insertedId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "No se pudo guardar el piloto"
    });
  }
});

   
    await db.command({ ping: 1 });
    console.log("Conectado a MongoDB");

    app.listen(3000, () => {
      console.log("Servidor en http://localhost:3000");
    });
  } catch (error) {
    console.error("Error al iniciar:", error.message);
    await cliente.close();
    process.exitCode = 1;
  }
}


iniciar();
