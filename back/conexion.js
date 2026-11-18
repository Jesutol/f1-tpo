// Conexión compartida con MongoDB. La clave se lee de MONGODB_URI.
const { MongoClient } = require("mongodb");

let cliente;

async function conectarBase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta configurar MONGODB_URI");
  }
  if (!cliente) {
    cliente = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 });
  }
  await cliente.connect();
  return cliente.db("f1_tpo");
}


module.exports = { conectarBase };
