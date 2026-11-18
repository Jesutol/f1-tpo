const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function leerCarreras() {
  const carpeta = path.join(__dirname, '../datos/mongodb/carreras');
  const archivos = fs.readdirSync(carpeta).filter(archivo => archivo.endsWith('.json')).sort();
  return archivos.map(archivo => JSON.parse(fs.readFileSync(path.join(carpeta, archivo), 'utf8')));
}

// MongoDB simulado: las pruebas no leen credenciales ni modifican Atlas.
function servidorPrueba() {
  const documentos = {};
  documentos.carreras = leerCarreras();
  for (const nombre of ['pilotos', 'equipos', 'sesiones', 'campeonatos', 'calendario', 'inicio']) {
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
  // Cargamos los módulos reales del backend con el mismo MongoDB simulado.
  const modulos = new Map();
  function cargarModulo(archivo) {
    if (modulos.has(archivo)) return modulos.get(archivo).exports;
    const modulo = { exports: {} };
    modulos.set(archivo, modulo);
    const contexto = vm.createContext({
      module: modulo,
      exports: modulo.exports,
      require(nombre) {
        if (nombre === 'mongodb') return { MongoClient };
        if (nombre.startsWith('.')) {
          return cargarModulo(require.resolve(path.resolve(path.dirname(archivo), nombre)));
        }
        return require(nombre);
      },
      __dirname: path.dirname(archivo),
      process: { env: { MONGODB_URI: 'mongodb://simulado' } },
      Date: FechaPrueba,
      console: { error() {} }
    });
    vm.runInContext(fs.readFileSync(archivo, 'utf8'), contexto, { filename: archivo });
    return modulo.exports;
  }
  const app = cargarModulo(path.join(__dirname, '../back/server.js'));
  const rutas = [];
  function buscarRutas(capas) {
    for (const capa of capas) {
      if (capa.route) rutas.push(capa.route);
      else if (capa.handle.stack) buscarRutas(capa.handle.stack);
    }
  }
  buscarRutas(app.router.stack);
  async function consultar(ruta, params = {}, query = {}) {
    const manejador = rutas.find(r => r.path === ruta).stack[0].handle;
    const respuesta = { codigo: 200, status(codigo) { this.codigo = codigo; return this; }, json(datos) { this.datos = datos; return this; } };
    await manejador({ params, query }, respuesta);
    return respuesta;
  }
  return { app, documentos, consultar, fallar() { fallaConexion = true; } };
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

test('El selector lista las 20 carreras y permite consultar cada fecha', async () => {
  const { consultar } = servidorPrueba();
  const lista = await consultar('/carreras');
  assert.equal(lista.codigo, 200);
  assert.equal(lista.datos.length, 20);
  assert.equal(lista.datos[0].carreraId, 20);
  assert.equal(lista.datos[19].carreraId, 1);
  assert.equal(lista.datos[0].resultados, undefined);
  for (let carreraId = 1; carreraId <= 20; carreraId++) {
    const respuesta = await consultar('/carrera', {}, { temporada: '2026', carreraId: String(carreraId) });
    assert.equal(respuesta.codigo, 200);
    assert.equal(respuesta.datos.carreraId, carreraId);
    assert.equal(respuesta.datos.resultados.length, 22);
  }
  assert.equal((await consultar('/carrera', {}, { temporada: '2026', carreraId: '99' })).codigo, 404);
  assert.equal((await consultar('/carrera', {}, { carreraId: '1' })).codigo, 400);
});

test('El paquete de carreras tiene identificadores, referencias y valores válidos', () => {
  const carreras = leerCarreras();
  const pilotos = JSON.parse(fs.readFileSync(path.join(__dirname, '../datos/mongodb/pilotos.json'), 'utf8'));
  const equipos = JSON.parse(fs.readFileSync(path.join(__dirname, '../datos/mongodb/equipos.json'), 'utf8'));
  assert.equal(new Set(carreras.map(c => c._id)).size, 20);
  for (const carrera of carreras) {
    assert.ok(carrera.fecha <= '2026-11-18');
    assert.equal(new Set(carrera.resultados.map(p => p.numero)).size, 22);
    for (const piloto of carrera.resultados) {
      assert.ok(pilotos.some(p => p._id === piloto.pilotoId));
      assert.ok(equipos.some(e => e._id === piloto.equipoId));
      assert.ok(Number.isFinite(piloto.puntos));
      assert.ok(Number.isFinite(piloto.vueltas));
      assert.ok(piloto.paradas.every(vuelta => Number.isInteger(vuelta) && vuelta > 0));
      assert.ok(piloto.neumaticos.every(tipo => ['blando', 'medio', 'duro', 'intermedio', 'lluvia'].includes(tipo)));
    }
  }
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
  assert.equal((await consultar('/sesiones/:tipo', { tipo: 'clasificacion' }, { temporada: '2026', carreraId: '1' })).codigo, 404);
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
