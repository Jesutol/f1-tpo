const { db, temporada } = require('./server');
const { setTimeout: esperar } = require('node:timers/promises');
const argumento = process.argv.slice(2).find(a => !a.startsWith('--'));
const anio = argumento === undefined ? temporada : Number(argumento);
const errores = [];

// 1. Pedir JSON, dejando una pausa entre consultas a las APIs.
async function pedir(url) {
  await esperar(2100);
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!respuesta.ok) throw new Error('La API respondió HTTP ' + respuesta.status);
  return respuesta.json();
}
async function jolpica(recurso, campo) {
  // Una página de respuesta puede cortar un GP a la mitad. Unimos sus filas por ronda.
  const carreras = new Map();
  let offset = 0, total = 1;
  while (offset < total) {
    const ruta = `https://api.jolpi.ca/ergast/f1/${anio}${recurso ? '/' + recurso : ''}.json`;
    const { MRData: datos } = await pedir(`${ruta}?limit=100&offset=${offset}`);
    if (!Array.isArray(datos?.RaceTable?.Races)) throw new Error('Respuesta de Jolpica inválida.');
    total = Number(datos.total);
    if (!Number.isFinite(total) || (offset < total && !datos.RaceTable.Races.length)) throw new Error('Faltan datos de Jolpica.');
    for (const gp of datos.RaceTable.Races) {
      if (Number(gp.season) !== anio) throw new Error("La API devolvió otra temporada.");
      const anterior = carreras.get(gp.round);
      if (campo && anterior) gp[campo] = anterior[campo].concat(gp[campo]);
      carreras.set(gp.round, gp);
    }
    if (!(Number(datos.limit) > 0)) throw new Error('Paginación inválida.');
    offset += Number(datos.limit);
  }
  return [...carreras.values()];
}
const openf1 = (recurso, filtros) => pedir('https://api.openf1.org/v1/' + recurso + '?' + new URLSearchParams(filtros));
const fecha = dato => dato?.date ? `${dato.date}T${dato.time || '00:00:00Z'}` : null;
function avisar(mensaje) { errores.push(mensaje); console.error(mensaje); }

// 2. Guardar un GP del calendario, sin borrar sus sesiones.
async function guardarGP(gp) {
  const agenda = {};
  for (const [campo, tipo] of Object.entries({ FirstPractice: 'libres-1', SecondPractice: 'libres-2',
    ThirdPractice: 'libres-3', Qualifying: 'clasificacion', Sprint: 'sprint' })) {
    if (gp[campo]) agenda[tipo] = fecha(gp[campo]);
  }
  const { rows } = await db.query(`INSERT INTO f1.grandes_premios
    (temporada,ronda,nombre,circuito,fecha_carrera,agenda) VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (temporada,ronda) DO UPDATE SET nombre=EXCLUDED.nombre,
    circuito=EXCLUDED.circuito,fecha_carrera=EXCLUDED.fecha_carrera,agenda=EXCLUDED.agenda RETURNING id`,
  [anio, Number(gp.round), gp.raceName, gp.Circuit.circuitName, fecha(gp), JSON.stringify(agenda)]);
  return { id: rows[0].id, ...gp, agenda };
}

// 3. Reemplazar una sesión completa dentro de una transacción.
async function guardarSesion(gp, tipo, momento, fuente, resultados) {
  if (!resultados.length) throw new Error('Todavía no hay resultados de ' + tipo);
  if (resultados.some(r => r.puntos == null || !Number.isFinite(Number(r.puntos)))) throw new Error('Faltan puntos válidos.');
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const { rows: [sesion] } = await c.query(`INSERT INTO f1.sesiones (gran_premio_id,tipo,fecha,fuente)
      VALUES ($1,$2,$3,$4) ON CONFLICT (gran_premio_id,tipo) DO UPDATE SET
      fecha=EXCLUDED.fecha,fuente=EXCLUDED.fuente,actualizada_en=NOW() RETURNING id`, [gp.id,tipo,momento,fuente]);
    // Si solo se vuelven a importar los resultados, conservamos las tandas y paradas.
    const { rows: anteriores } = await c.query('SELECT numero,neumaticos,paradas FROM f1.resultados WHERE sesion_id=$1', [sesion.id]);
    await c.query('DELETE FROM f1.resultados WHERE sesion_id=$1', [sesion.id]);
    for (const r of resultados) {
      // El identificador de la API permite reconocer al piloto en distintas sesiones.
      let { rows: [piloto] } = await c.query(`SELECT p.id FROM f1.pilotos p
        LEFT JOIN f1.inscripciones i ON i.piloto_id=p.id
        WHERE p.temporada=$1 AND (p.referencia=$2 OR (p.referencia IS NULL AND i.numero=$3)) LIMIT 1`,
      [anio, r.referencia, r.numero]);
      if (!piloto) {
        const consulta = await c.query(`INSERT INTO f1.pilotos (temporada,referencia,nombre,apellido,nacionalidad)
          VALUES ($1,$2,$3,$4,$5) RETURNING id`, [anio,r.referencia,r.nombre,r.apellido,r.nacionalidad]);
        piloto = consulta.rows[0];
      } else {
        await c.query(`UPDATE f1.pilotos SET referencia=$2,nombre=$3,apellido=$4,
          nacionalidad=COALESCE($5,nacionalidad) WHERE id=$1`, [piloto.id,r.referencia,r.nombre,r.apellido,r.nacionalidad]);
      }
      await c.query(`INSERT INTO f1.inscripciones VALUES ($1,$2,$3)
        ON CONFLICT (temporada,numero) DO UPDATE SET piloto_id=EXCLUDED.piloto_id`, [anio,r.numero,piloto.id]);
      if (r.equipoId) await c.query(`INSERT INTO f1.equipos VALUES ($1,$2)
        ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre`, [r.equipoId,r.equipo]);
      const anterior = anteriores.find(p => p.numero === r.numero);
      await c.query(`INSERT INTO f1.resultados
        (sesion_id,piloto_id,equipo_id,numero,orden,posicion,puntos,tiempo,gap,q1,q2,q3,vueltas,estado,neumaticos,paradas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [sesion.id,piloto.id,r.equipoId,r.numero,r.orden,r.posicion,r.puntos,r.tiempo,r.gap,r.q1,r.q2,r.q3,
        r.vueltas,r.estado,JSON.stringify(anterior?.neumaticos ?? null),JSON.stringify(anterior?.paradas ?? null)]);
    }
    await c.query('COMMIT');
  } catch (error) { await c.query('ROLLBACK'); throw error; }
  finally { c.release(); }
}

function resultadoJolpica(r, i, tipo) {
  const puntos = tipo === 'clasificacion' ? 0 : r.points;
  if (puntos == null || String(puntos).trim() === '') throw new Error('Faltan puntos oficiales.');
  return { numero:Number(r.number),referencia:r.Driver.driverId,nombre:r.Driver.givenName,
    apellido:r.Driver.familyName,nacionalidad:r.Driver.nationality,
    equipoId:r.Constructor?.constructorId,equipo:r.Constructor?.name,orden:i+1,
    posicion:r.positionText === 'D' ? null : Number(r.position) || null,puntos:Number(puntos),
    tiempo:r.Time?.time || r.Q3 || r.Q2 || r.Q1,q1:r.Q1,q2:r.Q2,q3:r.Q3,
    vueltas:r.laps == null ? null : Number(r.laps),estado:r.status };
}
const equipos = { 'Red Bull Racing':'red_bull',Mercedes:'mercedes',Ferrari:'ferrari',McLaren:'mclaren',
  'Aston Martin':'aston_martin',Alpine:'alpine',Williams:'williams','Haas F1 Team':'haas',
  'Racing Bulls':'rb',RB:'rb','Kick Sauber':'sauber',Sauber:'sauber',Audi:'audi',Cadillac:'cadillac' };
function tiempo(segundos) {
  if (segundos == null || !Number.isFinite(segundos)) return null;
  const milisegundos = Math.round(segundos * 1000);
  return `${Math.floor(milisegundos / 60000)}:${String(Math.floor(milisegundos / 1000) % 60).padStart(2,'0')}.${String(milisegundos % 1000).padStart(3,'0')}`;
}

// 4. Descargar la temporada y cargar primero las sesiones que tienen puntos.
async function importar() {
  if (!Number.isInteger(anio) || anio < 2023 || anio > temporada) throw new Error('Indicá un año válido desde 2023.');
  await db.query('INSERT INTO f1.temporadas (anio) VALUES ($1) ON CONFLICT DO NOTHING', [anio]);
  const gps = [];
  const identidades = new Map();
  console.log('Descargando calendario y resultados de ' + anio);
  for (const gp of await jolpica('')) gps.push(await guardarGP(gp));
  if (!gps.length) throw new Error('No hay calendario disponible.');
  for (const [recurso,campo,tipo] of [['results','Results','carrera'],
    ['qualifying','QualifyingResults','clasificacion'],['sprint','SprintResults','sprint']]) {
    for (const datos of await jolpica(recurso,campo)) {
      const gp = gps.find(g => g.round === datos.round);
      try {
        const resultados = datos[campo].map((r,i) => resultadoJolpica(r,i,tipo));
        await guardarSesion(gp,tipo,gp.agenda[tipo] || fecha(gp),'jolpica',resultados);
        resultados.forEach(r => identidades.set(r.numero,r));
        console.log('Guardado: ' + gp.raceName + ' - ' + tipo);
      } catch (error) { avisar(datos.raceName + ': ' + error.message); }
    }
  }

  if (!process.argv.includes('--solo-puntos')) await importarOpenF1(gps, identidades);
  await db.query(`UPDATE f1.temporadas SET sincronizada_en=NOW(),calendario_completo=true,
    incidencias=$2 WHERE anio=$1`, [anio,JSON.stringify(errores)]);
  console.log('Importación terminada. Incidencias: ' + errores.length);
  if (errores.length) process.exitCode = 1;
}

// 5. OpenF1 complementa lo guardado con prácticas y datos de estrategia.
async function importarOpenF1(gps, identidades) {
  const sesiones = await openf1('sessions', { year:anio });
  for (const gp of gps) {
    // Las APIs usan identificadores distintos. Vinculamos los GP por fecha.
    const carrera = sesiones.find(s => s.session_name === 'Race' && !s.is_cancelled &&
      Math.abs(Date.parse(s.date_start) - Date.parse(fecha(gp))) < 36 * 3600000);
    if (!carrera) continue;
    const terminadas = sesiones.filter(s => s.meeting_key === carrera.meeting_key &&
      !s.is_cancelled && Date.parse(s.date_end) + 30 * 60000 < Date.now());
    for (const s of terminadas) {
      const tipo = { 'Practice 1':'libres-1','Practice 2':'libres-2','Practice 3':'libres-3' }[s.session_name];
      if (!tipo) continue;
      try {
        console.log('Descargando: ' + gp.raceName + ' - ' + tipo);
        const participantes = await openf1('drivers', { session_key:s.session_key });
        const datos = await openf1('session_result', { session_key:s.session_key });
        const resultados = datos.map((r,i) => {
          const p = participantes.find(p => p.driver_number === r.driver_number);
          if (!p) throw new Error('Falta información de un participante.');
          const conocido = identidades.get(r.driver_number);
          return { numero:r.driver_number,referencia:conocido?.referencia || 'openf1-' + r.driver_number,
            nombre:conocido?.nombre || p.first_name || p.full_name,apellido:conocido?.apellido || p.last_name || '',
            nacionalidad:conocido?.nacionalidad || p.country_code,equipoId:equipos[p.team_name] || conocido?.equipoId,
            equipo:p.team_name,orden:i+1,posicion:r.dsq ? null : r.position,puntos:0,tiempo:tiempo(r.duration),
            gap:typeof r.gap_to_leader === 'number' ? (r.gap_to_leader ? '+' + r.gap_to_leader : null) : r.gap_to_leader,vueltas:r.number_of_laps,estado:r.dsq ? 'DSQ' : null };
        });
        await guardarSesion(gp,tipo,s.date_start,'openf1',resultados);
      } catch (error) { avisar(gp.raceName + ' ' + tipo + ': ' + error.message); }
    }
    if (!terminadas.some(s => s.session_key === carrera.session_key)) continue;
    try {
      const tandas = await openf1('stints', { session_key:carrera.session_key });
      const paradas = await openf1('pit', { session_key:carrera.session_key });
      const compuestos = { SOFT:'blando',MEDIUM:'medio',HARD:'duro',INTERMEDIATE:'intermedio',WET:'lluvia' };
      const numeros = [...new Set(tandas.map(t => t.driver_number))];
      for (const numero of numeros) {
        const ruedas = tandas.filter(t => t.driver_number === numero).sort((a,b) => a.stint_number - b.stint_number);
        const boxes = paradas.filter(p => p.driver_number === numero).sort((a,b) => Date.parse(a.date) - Date.parse(b.date));
        await db.query(`UPDATE f1.resultados r SET neumaticos=$3,paradas=$4 FROM f1.sesiones s
          WHERE r.sesion_id=s.id AND s.gran_premio_id=$1 AND s.tipo='carrera' AND r.numero=$2`,
        [gp.id,numero,JSON.stringify(ruedas.map(t => compuestos[t.compound] || 'desconocido')),
          JSON.stringify(boxes.map(p => p.lap_number))]);
      }
    } catch (error) { avisar(gp.raceName + ' detalles: ' + error.message); }
  }
}
importar().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
