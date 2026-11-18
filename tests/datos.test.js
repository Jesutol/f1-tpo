const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// MongoDB simulado: las pruebas no leen credenciales ni modifican Atlas.
function servidorPrueba() {
  const documentos = {};
  for (const nombre of ['carreras', 'pilotos', 'equipos', 'sesiones', 'campeonatos', 'calendario', 'inicio']) {
    documentos[nombre] = JSON.parse(fs.readFileSync(path.join(__dirname, '../datos/mongodb', nombre + '.json'), 'utf8'));
  }
  let fallaConexion = false;
  function coincide(documento, filtro) {
    return Object.entries(filtro).every(([clave, valor]) => {
      if (valor && typeof valor === 'object') {
        if ('$ne' in valor) return documento[clave] !== valor.$ne;
        if ('$gte' in valor) return documento[clave] >= valor.$gte;
      }
      return documento[clave] === valor;
    });
  }
  const db = {
    collection(nombre) {
      return {
        async findOne(filtro, opciones = {}) {
          const encontrados = documentos[nombre].filter(d => coincide(d, filtro));
          const orden = Object.entries(opciones.sort || {});
          encontrados.sort((a, b) => {
            for (const [clave, sentido] of orden) {
              if (a[clave] > b[clave]) return sentido;
              if (a[clave] < b[clave]) return -sentido;
            }
            return 0;
          });
          return encontrados[0] || null;
        },
        find(filtro) {
          return { toArray: async () => documentos[nombre].filter(d => coincide(d, filtro)) };
        }
      };
    }
  };
  class MongoClient {
    async connect() { if (fallaConexion) throw new Error('Conexión de prueba fallida'); }
    db(nombre) { assert.equal(nombre, 'f1_tpo'); return db; }
  }
  class FechaPrueba extends Date {
    constructor(...argumentos) { super(...(argumentos.length ? argumentos : ['2026-11-17T12:00:00Z'])); }
  }
  const modulo = { exports: {} };
  const contexto = vm.createContext({
    module: modulo,
    require: nombre => nombre === 'mongodb' ? { MongoClient } : require(nombre),
    __dirname: path.join(__dirname, '../back'),
    process: { env: { MONGODB_URI: 'mongodb://simulado' } },
    Date: FechaPrueba,
    console: { error() {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../back/server.js'), 'utf8'), contexto);
  const rutas = modulo.exports.router.stack.filter(capa => capa.route).map(capa => capa.route);
  async function consultar(ruta, params = {}, query = {}) {
    const manejador = rutas.find(r => r.path === ruta).stack[0].handle;
    const respuesta = { codigo: 200, status(codigo) { this.codigo = codigo; return this; }, json(datos) { this.datos = datos; return this; } };
    await manejador({ params, query }, respuesta);
    return respuesta;
  }
  return { app: modulo.exports, documentos, consultar, fallar() { fallaConexion = true; } };
}

test('Carrera conserva resultados, neumáticos y paradas y agrega imágenes desde catálogos', async () => {
  const { consultar } = servidorPrueba();
  const respuesta = await consultar('/carrera');
  assert.equal(respuesta.codigo, 200);
  assert.equal(respuesta.datos.resultados.length, 22);
  const primero = respuesta.datos.resultados[0];
  assert.equal(primero.apellido, 'Norris');
  assert.equal(primero.logo, '/recursos/logos-equipos/mclaren.svg');
  assert.equal(primero.bandera, '/recursos/iconos-banderas/uk.svg');
  assert.equal(primero.paradas.length, 3);
});

test('Una carrera programada no reemplaza la última finalizada', async () => {
  const prueba = servidorPrueba();
  prueba.documentos.carreras.push({ temporada: 2026, carreraId: 21, estado: 'programada' });
  assert.equal((await prueba.consultar('/carrera')).datos.carreraId, 20);
});

test('Campeonatos devuelven los documentos correctos y reflejan cambios en los datos', async () => {
  const prueba = servidorPrueba();
  prueba.documentos.campeonatos.find(c => c.tipo === 'pilotos').resultados[0].puntos = 999;
  assert.equal((await prueba.consultar('/campeonato/:tipo', { tipo: 'pilotos' })).datos.resultados[0].puntos, 999);
  assert.equal((await prueba.consultar('/campeonato/:tipo', { tipo: 'constructores' })).datos.resultados.length, 11);
  assert.equal((await prueba.consultar('/campeonato/:tipo', { tipo: 'incorrecto' })).codigo, 400);
});

test('Sesiones corresponden al último GP y admiten temporada y carrera explícitas', async () => {
  const { consultar } = servidorPrueba();
  for (const tipo of ['clasificacion', 'practica1', 'practica2', 'practica3']) {
    const respuesta = await consultar('/sesiones/:tipo', { tipo });
    assert.equal(respuesta.codigo, 200);
    assert.equal(respuesta.datos.carreraId, 20);
    assert.equal(respuesta.datos.resultados.length, tipo === 'practica2' ? 21 : 22);
  }
  assert.equal((await consultar('/sesiones/:tipo', { tipo: 'clasificacion' }, { temporada: '2026', carreraId: '20' })).codigo, 200);
  assert.equal((await consultar('/sesiones/:tipo', { tipo: 'otra' })).codigo, 400);
  assert.equal((await consultar('/sesiones/:tipo', { tipo: 'clasificacion' }, { carreraId: '20' })).codigo, 400);
});

test('Inicio obtiene el podio, campeonatos y próximo evento desde sus colecciones', async () => {
  const prueba = servidorPrueba();
  prueba.documentos.inicio[0].podio[0].apellido = 'Dato viejo que no debe mostrarse';
  const respuesta = await prueba.consultar('/api/inicio');
  assert.equal(respuesta.datos.ultimaCarrera.resultados[0].apellido, 'Norris');
  assert.equal(respuesta.datos.proximaCarrera.granPremio, 'Las Vegas');
  assert.equal(respuesta.datos.campeonatoPilotos.resultados[0].puntos, 390);
  prueba.documentos.calendario = [];
  assert.equal((await prueba.consultar('/api/inicio')).datos.proximaCarrera, null);
});

test('Sin documentos, parámetros inválidos y fallos de conexión muestran errores sin datos fijos', async () => {
  const prueba = servidorPrueba();
  assert.equal((await prueba.consultar('/carrera', {}, { temporada: 'abc' })).codigo, 400);
  prueba.documentos.carreras = [];
  assert.equal((await prueba.consultar('/carrera')).codigo, 404);
  prueba.documentos.campeonatos = [];
  assert.equal((await prueba.consultar('/campeonato/:tipo', { tipo: 'pilotos' })).codigo, 404);
  prueba.fallar();
  assert.equal((await prueba.consultar('/pilotos')).codigo, 500);
});
