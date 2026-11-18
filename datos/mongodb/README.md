# Datos de MongoDB · Corte posterior a São Paulo 2026

Actualizados el 17 de noviembre de 2026. El último GP disputado es São Paulo,
fecha 20 del campeonato, celebrado el 8 de noviembre. El próximo es Las Vegas,
fecha 21. No hay resultados futuros inventados.

## Archivos e importación

Los JSON de esta carpeta son arreglos de documentos, excepto los de `carreras/`,
que contienen un documento por archivo. Importar en la base `f1_tpo`, usando
una colección con el mismo nombre del archivo, sin `.json`. Todos los archivos
de `carreras/` pertenecen a una sola colección: `carreras`.

| Archivo / colección | Contenido |
| --- | --- |
| `pilotos.json` | 31 pilotos: participantes del campeonato y de las prácticas de São Paulo. |
| `equipos.json` | 11 equipos y sus logos existentes. |
| `carreras/` | Un JSON por carrera: 20 archivos con 440 resultados, neumáticos y paradas. |
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

### Campeón del campeonato de pilotos

El documento de pilotos de `campeonatos.json` incluye `campeonConfirmado: true`
y `campeonPilotoId: "antonelli"`. Estos campos permiten mostrar la tarjeta
y la fila doradas. El primer puesto por sí solo no activa el diseño.
Si el documento ya estaba importado en Atlas, agregar estos dos campos al
documento con `temporada: 2026` y `tipo: "pilotos"`; no importar otro duplicado.
Con `campeonConfirmado: false` o sin un piloto válido, la tarjeta se oculta.

El título de Antonelli fue confirmado por la [FIA](https://www.fia.com/news/f1-antonelli-crowned-f1s-youngest-world-champion-verstappen-wins-mexico-city).

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

## Carreras de 2026 hasta el 18 de noviembre

La carpeta `carreras/` contiene las 20 carreras disputadas, con 22 participantes por
carrera (440 resultados). Conserva los campos usados por `carrera.js` y los
identificadores del catálogo. No incluye resultados de Las Vegas, Qatar o Abu Dhabi.

Para cargarlas en Atlas, con `MONGODB_URI` configurada en la terminal, ejecutar
**desde la raíz del proyecto**:

```powershell
npm run cargar:carreras
```

El comando actualiza por `temporada` y `carreraId`, conserva el `_id` existente
y crea los documentos que faltan. Se puede repetir para actualizar los datos.
No elimina documentos. Si ya había duplicados, no los borra automáticamente.
No volver a importar con Compass los archivos de carreras que ya existen;
usar el comando anterior para evitar agregar copias.

Los archivos se nombran por temporada, fecha y GP, por ejemplo:

```text
carreras/
  2026-01-australia.json
  2026-02-china.json
  ...
  2026-20-sao-paulo.json
```

Cada archivo contiene un objeto `{ ... }` con los datos y resultados de ese GP.
Para actualizar una carrera, editar solamente su archivo. Para agregar otra,
crear su JSON en esta carpeta y ejecutar `npm run cargar:carreras`.
No se crea una colección por GP: todos se guardan en `f1_tpo.carreras`.

La página de resultados incluye un selector con las carreras que realmente
están guardadas en MongoDB. Se abre en la última fecha disponible. La colección
`sesiones` sigue conteniendo las sesiones de São Paulo; este paquete amplía las
carreras, no agrega clasificaciones ni prácticas históricas.

Las paradas son las vueltas de entrada a boxes publicadas por F1. Los neumáticos
son los compuestos de cada tanda, no una deducción a partir de las paradas:
una bandera roja también puede permitir cambiar neumáticos sin parar en boxes.
Si un piloto no tomó la salida, se conserva un arreglo vacío de neumáticos.

### Referencias del histórico

Resultados y paradas: tablas oficiales de Formula 1. Compuestos: The Field;
Miami: [tabla de estrategias de Pitpass](https://www.pitpass.com/82567/Miami-Grand-Prix-Driver-Tyre-Strategies).
Se registran aquí para mantener los JSON sin un campo `fuente`.

- Australia: [resultados](https://www.formula1.com/en/results/2026/races/1279/australia/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1279/australia/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-australian-grand-prix/race).
- China: [resultados](https://www.formula1.com/en/results/2026/races/1280/china/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1280/china/pit-stop-summary), [neumáticos](https://fah-hoststate-check.thefieldf1.com/race/2026-chinese-grand-prix/race).
- Japón: [resultados](https://www.formula1.com/en/results/2026/races/1281/japan/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1281/japan/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-japanese-grand-prix/race).
- Miami: [resultados](https://www.formula1.com/en/results/2026/races/1284/miami/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1284/miami/pit-stop-summary).
- Canadá: [resultados](https://www.formula1.com/en/results/2026/races/1285/canada/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1285/canada/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-canadian-grand-prix/race).
- Mónaco: [resultados](https://www.formula1.com/en/results/2026/races/1286/monaco/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1286/monaco/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-monaco-grand-prix/race).
- Barcelona-Catalunya: [resultados](https://www.formula1.com/en/results/2026/races/1287/barcelona-catalunya/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1287/barcelona-catalunya/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-barcelona-grand-prix/race).
- Austria: [resultados](https://www.formula1.com/en/results/2026/races/1288/austria/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1288/aa/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-austrian-grand-prix/race).
- Gran Bretaña: [resultados](https://www.formula1.com/en/results/2026/races/1289/great-britain/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1289/great-britain/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-british-grand-prix/race).
- Bélgica: [resultados](https://www.formula1.com/en/results/2026/races/1290/belgium/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1290/belgium/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-belgian-grand-prix/race).
- Hungría: [resultados](https://www.formula1.com/en/results/2026/races/1291/hungary/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1291/aa/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-hungarian-grand-prix/race).
- Países Bajos: [resultados](https://www.formula1.com/en/results/2026/races/1292/netherlands/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1292/netherlands/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-dutch-grand-prix/race).
- Italia: [resultados](https://www.formula1.com/en/results/2026/races/1293/italy/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1293/italy/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-italian-grand-prix/race).
- España: [resultados](https://www.formula1.com/en/results/2026/races/1294/spain/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1294/spain/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-spanish-grand-prix/race).
- Azerbaiyán: [resultados](https://www.formula1.com/en/results/2026/races/1295/azerbaijan/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1295/azerbaijan/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-azerbaijan-grand-prix/race).
- Baréin: [resultados](https://www.formula1.com/en/results/2026/races/1308/bahrain/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1308/bahrain/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-bahrain-grand-prix/race).
- Singapur: [resultados](https://www.formula1.com/en/results/2026/races/1296/singapore/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1296/singapore/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-singapore-grand-prix/race).
- Estados Unidos: [resultados](https://www.formula1.com/en/results/2026/races/1297/united-states/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1297/united-states/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-united-states-grand-prix/race).
- México: [resultados](https://www.formula1.com/en/results/2026/races/1298/mexico/race-result), [paradas](https://www.formula1.com/en/results/2026/races/1298/mexico/pit-stop-summary), [neumáticos](https://www.thefieldf1.com/race/2026-mexico-city-grand-prix/race).
