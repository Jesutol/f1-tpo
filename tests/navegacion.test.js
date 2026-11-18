const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ayudas = fs.readFileSync(path.join(__dirname, '../front/js/datos.js'), 'utf8');
const sesiones = fs.readFileSync(path.join(__dirname, '../front/js/sesiones.js'), 'utf8');

function paginaPrueba(pagina, consulta) {
  const direccion = new URL('http://localhost:3000/paginas/' + pagina + consulta);
  const enlaces = ['resultado-carrera.html', 'resultado-clasificacion.html', 'resultado-libres-1.html', 'resultado-libres-2.html', 'resultado-libres-3.html'];
  const menu = enlaces.map(archivo => ({ href: new URL(archivo, direccion).href }));
  const elementos = {};
  const contexto = vm.createContext({
    URL, URLSearchParams,
    window: {
      location: direccion,
      history: { replaceState(estado, titulo, url) { contexto.window.location = new URL(url); } }
    },
    document: {
      querySelectorAll(selector) {
        assert.equal(selector, '.menu-ultimo-gp .submenu a');
        return menu;
      },
      getElementById(id) {
        if (!elementos[id]) elementos[id] = { textContent: '' };
        return elementos[id];
      }
    }
  });
  vm.runInContext(ayudas, contexto);
  return { contexto, menu, elementos };
}

test('Carrera y las cuatro sesiones conservan el año y la fecha en sus enlaces', () => {
  for (const pagina of ['resultado-carrera.html', 'resultado-clasificacion.html', 'resultado-libres-1.html', 'resultado-libres-2.html', 'resultado-libres-3.html']) {
    const { contexto, menu } = paginaPrueba(pagina, '?temporada=2026&carreraId=1');
    assert.equal(contexto.parametrosCarrera(), '?temporada=2026&carreraId=1');
    contexto.conservarCarrera(2026, 1);
    for (const enlace of menu) {
      const url = new URL(enlace.href);
      assert.equal(url.searchParams.get('temporada'), '2026');
      assert.equal(url.searchParams.get('carreraId'), '1');
    }
    // Al cambiar de GP se reemplaza la elección anterior.
    contexto.conservarCarrera(2026, 20);
    assert.equal(contexto.parametrosCarrera(), '?temporada=2026&carreraId=20');
    assert.ok(menu.every(enlace => new URL(enlace.href).searchParams.get('carreraId') === '20'));
  }
});

test('Sin parámetros se consulta el último GP y se ignoran parámetros ajenos', () => {
  assert.equal(paginaPrueba('resultado-carrera.html', '').contexto.parametrosCarrera(), '');
  assert.equal(paginaPrueba('resultado-carrera.html', '?otro=valor&carreraId=1&temporada=2026').contexto.parametrosCarrera(), '?temporada=2026&carreraId=1');
});

test('Una sesión histórica ausente avisa sin consultar ni mostrar otro GP', async () => {
  for (const tipo of ['clasificacion', 'practica1', 'practica2', 'practica3']) {
    const { contexto, elementos, menu } = paginaPrueba('resultado-clasificacion.html', '?temporada=2026&carreraId=1');
    contexto.document.body = { dataset: { sesion: tipo, titulo: tipo } };
    const consultas = [];
    contexto.fetch = async ruta => {
      consultas.push(ruta);
      return { status: 404, ok: false };
    };
    contexto.mensajeTabla = (tabla, texto) => { tabla.textContent = texto; };
    await vm.runInContext(sesiones, contexto);
    assert.deepEqual(consultas, ['/sesiones/' + tipo + '?temporada=2026&carreraId=1']);
    assert.match(elementos['resultados-sesion'].textContent, /Todavía no se cargó/);
    assert.equal(elementos['nombre-sesion'].textContent, 'Temporada 2026 · Fecha 1');
    assert.ok(menu.every(enlace => new URL(enlace.href).searchParams.get('carreraId') === '1'));
  }
});
