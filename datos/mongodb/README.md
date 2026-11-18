# Datos de MongoDB · Corte posterior a São Paulo 2026

Actualizados el 17 de noviembre de 2026. El último GP disputado es São Paulo,
fecha 20 del campeonato, celebrado el 8 de noviembre. El próximo es Las Vegas,
fecha 21. No hay resultados futuros inventados.

## Archivos e importación

Cada JSON es un arreglo de documentos. Importar en la base `f1_tpo`, usando
una colección con el mismo nombre del archivo, sin `.json`.

| Archivo / colección | Contenido |
| --- | --- |
| `pilotos.json` | 31 pilotos: participantes del campeonato y de las prácticas de São Paulo. |
| `equipos.json` | 11 equipos y sus logos existentes. |
| `carreras.json` | São Paulo con 22 resultados, neumáticos y paradas. |
| `sesiones.json` | Clasificación y prácticas 1, 2 y 3 de São Paulo. |
| `campeonatos.json` | Campeonato de pilotos (25) y constructores (11), después de São Paulo. |
| `calendario.json` | São Paulo finalizada y Las Vegas programada, con su agenda. |
| `inicio.json` | Podio de São Paulo, top 3 de constructores y referencia a Las Vegas. |

En Compass: abrir la colección y elegir **Add Data > Import JSON or CSV file**.
Importar una sola vez. Si ya existe el documento, editarlo y conservar su `_id`.
No importar otra copia de São Paulo sobre la carrera ya cargada con un ObjectId.

Si se importó el paquete anterior, reemplazar los documentos antiguos de
clasificación/calendario de Baréin y Singapur por los correspondientes a este
paquete. No se eliminaron documentos de Atlas automáticamente.

Los identificadores `inicio-2026-html`, `2026-pilotos-html` y
`2026-constructores-html` se conservan para actualizar los registros anteriores
sin generar duplicados. El sufijo es histórico; sus datos ya están actualizados.

## Relaciones y detalles

- `pilotoId` corresponde al `_id` de `pilotos`; `equipoId`, al de `equipos`.
- `eventoId`, `eventoPodioId` y `eventoProximoId` corresponden al `_id` de
  `calendario`. Todos los resultados del último GP apuntan a `2026-sao-paulo`.
- `carreraId` es el número de fecha dentro de la temporada: São Paulo 20 y
  Las Vegas 21. La temporada siempre acompaña a ese número.
- Las imágenes siguen en `front/recursos`. No se duplicaron dentro del paquete.
- Los seis participantes invitados de FP1 no tenían datos de nacionalidad en
  las tablas consultadas. Se dejaron país y bandera en `null`, evitando
  inventar información o crear rutas a imágenes inexistentes.
- Los números históricos de Tsunoda y Hirakawa quedan en `null` cuando no se
  verificaron en las tablas usadas; no se deducen de sus reemplazantes.
- FP2 contiene 21 registros publicados. Sainz no figura en esa tabla; no se
  inventó un tiempo ni una posición para completar 22 filas.
- En prácticas, `tiempo` contiene el tiempo absoluto del primero; para los demás
  la tabla oficial publica una diferencia, guardada en `gap`. No se fabricaron
  tiempos absolutos. La página muestra `tiempo` o `gap`, según corresponda.
- Clasificación conserva Q1, Q2 y Q3. `tiempo` es el de la última fase alcanzada,
  y `gap` queda en `null` para no comparar fases con condiciones diferentes.
  Las posiciones son las de clasificación, no las de la grilla de salida.
- Los puntos del campeonato se copian de las tablas oficiales, no se calculan
  sumando solo São Paulo. No deben sumarse los puntos históricos de pilotos por
  su equipo actual para reemplazar los puntos oficiales de constructores.
- Bottas no tomó la salida: sus arreglos de neumáticos y paradas están vacíos.

## Horarios de Las Vegas

La agenda está convertida a `America/Argentina/Buenos_Aires` (UTC−3).
La carrera es el domingo 22 de noviembre a la 01:00 en Argentina, equivalente
al sábado 21 a las 20:00 en Las Vegas (UTC−8). `fecha` corresponde a Argentina;
`fechaLocalCircuito` conserva la fecha del circuito. No es un fin de semana Sprint.

## Páginas

Inicio, campeonatos, carrera, clasificación y prácticas consultan MongoDB
mediante el servidor. Sus tablas ya no contienen resultados fijos en el HTML.
Los enlaces de cada práctica abren su página correspondiente.

El inicio obtiene el podio desde `carreras`, los rankings desde `campeonatos`
y el próximo evento desde `calendario`. Las copias del podio y los rankings
en `inicio.json` se conservan como archivo anterior; la web no las utiliza.
Las imágenes se resuelven con los catálogos `pilotos` y `equipos`.

Estos archivos son para importar o conservar como respaldo. No se cambió la
configuración del deploy ni se hizo commit, push o importación en Atlas.

## Referencias de comprobación

Se mantienen aquí, sin agregar un campo `fuente` a los JSON:

- Calendario: https://www.formula1.com/en/racing/2026
- Carrera: https://www.formula1.com/en/results/2026/races/1299/brazil/race-result
- Paradas: https://www.formula1.com/en/results/2026/races/1299/brazil/pit-stop-summary
- Neumáticos: https://www.thefieldf1.com/race/2026-sao-paulo-grand-prix/race
- Clasificación: https://www.formula1.com/en/results/2026/races/1299/brazil/qualifying
- FP1: https://www.formula1.com/en/results/2026/races/1299/brazil/practice/1
- FP2: https://www.formula1.com/en/results/2026/races/1299/brazil/practice/2
- FP3: https://www.formula1.com/en/results/2026/races/1299/brazil/practice/3
- Pilotos: https://www.formula1.com/en/results/2026/drivers
- Constructores: https://www.formula1.com/en/results/2026/team
- Las Vegas: https://www.formula1.com/en/latest/article/formula-1-heineken-las-vegas-grand-prix-2026.1qmWzcBwKK5hkTbYbhVC22
