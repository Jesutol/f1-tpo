# F1 Telemetry - proyecto local

Una pagina de resultados de Formula 1 con JavaScript, Node.js y PostgreSQL.
El codigo JavaScript esta en solamente tres archivos:

| Archivo | Que hace |
| --- | --- |
| `server.js` | Conecta PostgreSQL, consulta resultados, suma campeonatos y entrega la pagina. |
| `importar.js` | Descarga resultados de Jolpica y OpenF1 y los guarda en PostgreSQL. |
| `front/js/app.js` | Pide los datos al servidor y muestra las tablas. |

`base.sql` define las siete tablas existentes. `front/paginas` tiene tres HTML:
Ultimo GP, Resultados y Campeonato (pilotos o constructores). El inicio muestra
el podio, los tres primeros constructores y la proxima fecha desde la misma base.
La agenda se muestra en hora de Argentina. Los menus estan escritos en HTML.

## Buscar pilotos y equipos

En cualquier pagina, abrir **🔍 Buscar**, escribir un nombre o parte del nombre
(por ejemplo, `kimi antonelli` o `mercedes`), pulsar **Buscar** y elegir una coincidencia.
La busqueda no distingue mayusculas de minusculas.

Se muestra una fila por piloto y sesion, con GP, carrera o sprint, posicion,
piloto, equipo, puntos, tiempo o estado y vueltas. Arriba se suma el total de puntos
de esos resultados. Solo aparecen los datos ya guardados de la temporada consultada.
Un equipo incluye a todos sus pilotos, tambien reemplazantes, usando el equipo
de cada resultado. Un piloto conserva sus resultados aunque haya cambiado de equipo.

1. El formulario de la lupa, escrito en cada HTML, activa `prepararBusqueda()` de `app.js`.
2. Al pulsar Buscar, `fetch` pide `/api/buscar?q=kimi+antonelli` a `server.js`.
3. PostgreSQL busca coincidencias con `ILIKE` y el servidor devuelve nombre,
   tipo (`piloto` o `equipo`) e identificador. Los valores se pasan como parametros SQL.
4. `app.js` crea enlaces como `campeonato.html?piloto=2&temporada=2026`.
   Se reutiliza esa misma pagina de tablas; el identificador depende de tu BD.
5. Al abrir el enlace, `cargarHistorial()` pide `/api/historial/piloto/2?temporada=2026`.
6. El servidor une grandes premios, sesiones, resultados, pilotos y equipos;
   filtra por temporada, piloto o equipo y sesiones `carrera` y `sprint`.
7. Devuelve JSON y `app.js` dibuja la tabla con las funciones ya existentes.

Los enlaces conservan el año de la busqueda. Sin `temporada` se usa
`TEMPORADA_ACTUAL` del servidor o, si no esta definido, el año actual.
No se agregaron tablas, dependencias ni archivos JavaScript. No se consulta
Jolpica ni OpenF1 al buscar: esas APIs siguen usandose solamente al importar.
Si el servidor ya estaba abierto al modificar el codigo, reiniciarlo con
**Control+C** y `npm start`, y recargar el navegador.

## Usar con la base ya cargada

```sh
npm start
```

Abrir **http://localhost:3000**. Detener el servidor con **Control+C**.
No hace falta volver a crear las tablas ni importar los datos por este cambio.

## Primera instalacion

Necesitas Node.js 22 o superior y PostgreSQL. En pgAdmin, crear la base `f1_tpo`.

```sh
npm install
cp -n .env.example .env
```

Completar `.env` con los datos de tu PostgreSQL y ejecutar:

```sh
npm run db:init
npm run importar:temporada
npm start
```

## Actualizar resultados

```sh
npm run importar:temporada -- 2026
npm run importar:temporada -- 2026 --solo-puntos
```

La carga completa agrega carreras, clasificacion, sprints, practicas y detalles.
`--solo-puntos` omite OpenF1: carga carreras, clasificacion y sprints de Jolpica.
Se espera entre peticiones para respetar la API. Si una consulta falla, se informa
en la terminal; podes repetir la importacion. Cada sesion se reemplaza dentro de
una transaccion, sin duplicar puntos. Las actualizaciones se ejecutan manualmente.

## Recorrido de los datos

1. `importar.js` consulta las APIs y guarda los resultados en `f1_tpo`, esquema `f1`.
2. `app.js` pide una sesion o campeonato a `server.js` usando `fetch`.
3. `server.js` ejecuta SQL y responde JSON; `app.js` arma la tabla.
4. Los campeonatos usan `SUM(puntos)` sobre carreras y sprints, agrupando por
   piloto o equipo. El desempate compara primeros, segundos y sucesivos puestos.

El campeonato refleja los resultados guardados, que pueden ser una carga parcial.
No incluye ajustes exclusivos al campeonato que no aparezcan en puntos por sesion.

## Archivos de ayuda

- `documentacion/Guia_F1_Telemetry.pdf`: guia breve para estudiar y presentar.
- `documentacion/consultas.sql`: consultas de lectura para pegar en pgAdmin.

Las unicas dependencias son `express` y `pg`. `node_modules` se genera con npm;
`.env` contiene tu contrasena y no se sube a Git. Esta version no tiene tests,
build ni configuracion de despliegue: esta pensada para ejecutarse localmente.
