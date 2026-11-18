-- CONSULTAS DE PRESENTACION - F1 TELEMETRY
-- Abrir Query Tool sobre la base f1_tpo. Todas las consultas son de lectura.
-- Seleccionar una consulta y ejecutar. Cambiar 2026 y ronda=1 cuando corresponda.

-- Q01. Confirmar a que base y usuario estamos conectados.
SELECT current_database() AS base, current_user AS usuario;

-- Q02. Ver las siete tablas del esquema propio f1.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'f1'
ORDER BY table_name;

-- Q03. Cuantos registros se guardaron por tabla.
SELECT 'temporadas' AS tabla, COUNT(*) AS filas FROM f1.temporadas
UNION ALL SELECT 'grandes_premios', COUNT(*) FROM f1.grandes_premios
UNION ALL SELECT 'pilotos', COUNT(*) FROM f1.pilotos
UNION ALL SELECT 'inscripciones', COUNT(*) FROM f1.inscripciones
UNION ALL SELECT 'equipos', COUNT(*) FROM f1.equipos
UNION ALL SELECT 'sesiones', COUNT(*) FROM f1.sesiones
UNION ALL SELECT 'resultados', COUNT(*) FROM f1.resultados;

-- Q04. Calendario y sesiones efectivamente importadas.
SELECT g.ronda, g.nombre, g.fecha_carrera,
       s.id AS sesion_id, s.tipo, s.fuente, s.actualizada_en
FROM f1.grandes_premios g
LEFT JOIN f1.sesiones s ON s.gran_premio_id = g.id
WHERE g.temporada = 2026
ORDER BY g.ronda, s.fecha;

-- Q05. Resultados de una sesion: cambiar temporada, ronda y tipo.
SELECT r.orden, r.posicion, p.nombre, p.apellido,
       e.nombre AS equipo, r.puntos, r.tiempo, r.vueltas, r.estado
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
JOIN f1.pilotos p ON p.id = r.piloto_id
LEFT JOIN f1.equipos e ON e.id = r.equipo_id
WHERE g.temporada = 2026 AND g.ronda = 1 AND s.tipo = 'carrera'
ORDER BY r.orden;

-- Q06. Ultimo GP con carrera cargada: mismo criterio de la pagina.
SELECT g.id, g.ronda, g.nombre, g.fecha_carrera
FROM f1.grandes_premios g
WHERE g.temporada = 2026
  AND EXISTS (
    SELECT 1 FROM f1.sesiones s
    WHERE s.gran_premio_id = g.id AND s.tipo = 'carrera'
  )
ORDER BY g.fecha_carrera DESC
LIMIT 1;

-- Q07. Tiempos Q1/Q2/Q3 de la clasificacion de la primera ronda.
SELECT r.posicion, p.apellido, r.q1, r.q2, r.q3
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
JOIN f1.pilotos p ON p.id = r.piloto_id
WHERE g.temporada = 2026 AND g.ronda = 1
  AND s.tipo = 'clasificacion'
ORDER BY r.orden;

-- Q08. Arrays JSONB de neumaticos y paradas.
SELECT g.ronda, p.apellido, r.neumaticos, r.paradas,
       r.neumaticos ->> 0 AS primer_compuesto
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
JOIN f1.pilotos p ON p.id = r.piloto_id
WHERE g.temporada = 2026 AND g.ronda = 1 AND s.tipo = 'carrera'
ORDER BY r.orden;

-- Q09. Total anual de pilotos. El desempate completo lo aplica JavaScript.
SELECT p.id, p.nombre, p.apellido, SUM(r.puntos) AS puntos
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
JOIN f1.pilotos p ON p.id = r.piloto_id
WHERE g.temporada = 2026 AND s.tipo IN ('carrera', 'sprint')
GROUP BY p.id, p.nombre, p.apellido
ORDER BY puntos DESC, p.apellido;

-- Q10. Total anual de constructores: se suman los puntos de sus participantes.
SELECT e.id, e.nombre AS equipo, SUM(r.puntos) AS puntos
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
JOIN f1.equipos e ON e.id = r.equipo_id
WHERE g.temporada = 2026 AND s.tipo IN ('carrera', 'sprint')
GROUP BY e.id, e.nombre
ORDER BY puntos DESC, e.nombre;

-- Q11. Auditar el aporte de cada piloto a un constructor. Cambiar mclaren.
SELECT g.ronda, s.tipo, p.nombre, p.apellido, r.puntos
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
JOIN f1.pilotos p ON p.id = r.piloto_id
WHERE g.temporada = 2026 AND r.equipo_id = 'mclaren'
  AND s.tipo IN ('carrera', 'sprint')
ORDER BY g.ronda, s.fecha, r.orden;

-- Q12. Control de puntos indebidos en practicas/clasificacion: debe dar cero.
SELECT COUNT(*) AS filas_con_puntos_indebidos
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
WHERE s.tipo NOT IN ('carrera', 'sprint') AND r.puntos <> 0;

-- Q13. Control de duplicados: debe devolver cero filas.
SELECT g.temporada, g.ronda, s.tipo, r.piloto_id, COUNT(*)
FROM f1.resultados r
JOIN f1.sesiones s ON s.id = r.sesion_id
JOIN f1.grandes_premios g ON g.id = s.gran_premio_id
GROUP BY g.temporada, g.ronda, s.tipo, r.piloto_id
HAVING COUNT(*) > 1;

-- Q14. Revisar fecha e incidencias de la ultima importacion.
SELECT anio, sincronizada_en, calendario_completo, incidencias
FROM f1.temporadas
WHERE anio = 2026;

-- Q15. Ubicacion fisica de los archivos del servidor (si el usuario tiene permiso).
SHOW data_directory;
