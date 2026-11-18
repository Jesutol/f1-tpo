const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function paginaCampeonato() {
  const elementos = {};
  const contexto = vm.createContext({
    document: {
      getElementById(id) {
        if (!elementos[id]) elementos[id] = { hidden: true, textContent: '', innerHTML: '' };
        return elementos[id];
      }
    },
    nombrePiloto(piloto) { return piloto.nombre + ' ' + piloto.apellido; },
    ponerImagen(elemento, ruta, clase) { elemento.imagen = { ruta, clase }; }
  });
  const codigo = fs.readFileSync(path.join(__dirname, '../front/js/campeonato.js'), 'utf8');
  vm.runInContext(codigo.replace(/\ncargarCampeonato\(\);\s*$/, ''), contexto);
  const campeonato = JSON.parse(fs.readFileSync(path.join(__dirname, '../datos/mongodb/campeonatos.json'), 'utf8'))[0];
  return { contexto, campeonato, elementos };
}

test('El dorado requiere confirmación y un piloto existente; no basta con liderar', () => {
  const { contexto, campeonato } = paginaCampeonato();
  assert.equal(contexto.buscarCampeonConfirmado(campeonato).pilotoId, 'antonelli');
  campeonato.campeonConfirmado = false;
  assert.equal(contexto.buscarCampeonConfirmado(campeonato), null);
  delete campeonato.campeonConfirmado;
  assert.equal(contexto.buscarCampeonConfirmado(campeonato), null);
  campeonato.campeonConfirmado = true;
  campeonato.campeonPilotoId = 'inexistente';
  assert.equal(contexto.buscarCampeonConfirmado(campeonato), null);
  campeonato.campeonPilotoId = 'verstappen';
  assert.equal(contexto.buscarCampeonConfirmado(campeonato).pilotoId, 'verstappen');
  campeonato.tipo = 'constructores';
  assert.equal(contexto.buscarCampeonConfirmado(campeonato), null);
});

test('La tarjeta usa el nombre, equipo y temporada recibidos y se oculta sin campeón', () => {
  const { contexto, campeonato, elementos } = paginaCampeonato();
  const campeon = contexto.buscarCampeonConfirmado(campeonato);
  campeon.logo = '/recursos/logos-equipos/mercedes.svg';
  contexto.mostrarTarjetaCampeon(campeonato, campeon);
  assert.equal(elementos['tarjeta-campeon'].hidden, false);
  assert.equal(elementos['nombre-campeon'].textContent, 'Kimi Antonelli');
  assert.equal(elementos['titulo-campeon'].textContent, 'CAMPEÓN DEL MUNDO 2026');
  assert.equal(elementos['equipo-campeon'].textContent, 'Mercedes');
  assert.equal(elementos['logo-campeon'].imagen.ruta, campeon.logo);
  contexto.mostrarTarjetaCampeon(campeonato, null);
  assert.equal(elementos['tarjeta-campeon'].hidden, true);
});
