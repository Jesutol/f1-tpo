# F1 Telemetry Web

Web de telemetría de Fórmula 1 para visualizar informacion del campeonato.

## Características

- Posiciones
- Campeonato
- Neumaticos
- Pit Stops

## Objetivo

El objetivo del proyecto es mostrar datos de telemetría de Fórmula 1 de forma visual e interactiva.

## Estado del proyecto

En desarrollo.

## Organización de archivos

- `front/index.html`: página de inicio, disponible al ejecutar el servidor.
- `front/paginas/`: campeonatos de pilotos y constructores, resultados de carrera y clasificación.
- `front/css/style.css`: estilos compartidos por todas las páginas.
- `front/recursos/`: banderas y logos de equipos.
- `back/`: servidor Express y conexión con MongoDB.
- `documentacion/`: apuntes del proyecto.

Desde `front/index.html`, las rutas a las páginas empiezan con `./paginas/`.
Desde las páginas interiores, `../` permite acceder al inicio, los estilos y los recursos.

### Organización del backend

`back/server.js` prepara Express, publica el frontend y conecta los archivos de
rutas. `back/conexion.js` contiene `conectarBase()` y reutiliza el cliente de
MongoDB. `back/ayudas.js` reúne las imágenes, validaciones, mensajes de error y
búsquedas compartidas. Los GET se mantienen escritos paso a paso en:

| Archivo en `back/rutas/` | Consultas |
| --- | --- |
| `carreras.js` | `/carrera` y `/carreras` |
| `sesiones.js` | `/sesiones/:tipo` |
| `campeonatos.js` | `/campeonato/:tipo` |
| `inicio.js` | `/api/inicio` |
| `catalogos.js` | `/pilotos` y `/equipos` |

Cada archivo usa `express.Router()` para agrupar sus GET y los entrega a
`server.js` con `module.exports`. Las direcciones del frontend siguen iguales.

## Ejecutar el proyecto

Con `MONGODB_URI` configurada en la terminal (o en Vercel), ejecutar desde la raíz del proyecto:

```powershell
npm ci
npm start
```

Abrir `http://localhost:3000`. La página de carrera consulta la colección
`f1_tpo.carreras`. Los JSON de importación están en `datos/mongodb`.
Importar cada archivo en la colección del mismo nombre sin duplicar los documentos
existentes. Las páginas consultan MongoDB; no contienen resultados fijos.

## Consultas y scripts

| Ruta | Datos |
| --- | --- |
| `/carrera` | Última carrera disputada, con imágenes de los catálogos |
| `/carrera?temporada=2026&carreraId=1` | Resultados de una carrera concreta |
| `/carreras` | Lista de carreras disputadas para el selector |
| `/pilotos` y `/equipos` | Catálogos de pilotos y equipos |
| `/campeonato/pilotos` | Última tabla de pilotos guardada |
| `/campeonato/constructores` | Última tabla de constructores guardada |
| `/sesiones/clasificacion` | Clasificación del último GP |
| `/sesiones/practica1`, `/sesiones/practica2`, `/sesiones/practica3` | Prácticas del último GP |
| `/api/inicio` | Podio, ambos campeonatos y próximo evento del calendario |

Las consultas admiten `?temporada=2026`. Para una sesión histórica se puede
agregar `&carreraId=20`. Sin parámetros se elige la última carrera disputada;
si falta una sesión, no se muestra una de otro GP por error.

`datos.js` contiene funciones comunes. `carrera.js`, `inicio.js`,
`campeonato.js` y `sesiones.js` completan sus respectivas páginas. Las imágenes
se obtienen de `pilotos` y `equipos`; los horarios, de `calendario`.
El inicio deriva el podio desde `carreras` y los rankings desde `campeonatos`;
no usa las copias antiguas de esos valores guardadas en `inicio`.

Si no hay una próxima carrera programada o faltan documentos, la página muestra
un mensaje. No se incluyen datos de ejemplo como reemplazo silencioso de MongoDB.
Sin `MONGODB_URI`, el servidor entrega el HTML pero las consultas muestran error.
No escribir credenciales en los archivos del proyecto.

Ejecutar `npm test` para comprobar las consultas con MongoDB simulado, sin tocar Atlas.

La carpeta `datos/mongodb/carreras/` incluye un JSON por cada una de las 20 carreras de 2026
disputadas hasta São Paulo. Con `MONGODB_URI` configurada, ejecutar
`npm run cargar:carreras` para guardarlas en `f1_tpo.carreras`. Actualiza por
temporada y número de carrera, conservando los identificadores existentes.
El selector de la página de carrera muestra las fechas guardadas en MongoDB.
La elección se conserva en la dirección (`?temporada=2026&carreraId=20`) y
en los enlaces de Carrera, Clasificación y Prácticas del menú del GP.
Al abrir una sesión se consulta ese mismo año y número de carrera. Si falta,
se muestra un mensaje, sin sustituirla por la sesión de otro GP.

## Publicar en Vercel y MongoDB Atlas

El archivo `server.js` de la raíz conecta Vercel con `back/server.js`.
El comando `npm run build` copia `front` a `public`, la carpeta que Vercel
publica. Editar siempre `front`. `public` es una copia generada que se puede
borrar en la computadora; Vercel la vuelve a crear al publicar. Las dependencias
se administran únicamente desde el `package.json` de la raíz.

En Vercel, importar el repositorio con estos valores:

| Campo | Valor |
| --- | --- |
| Framework Preset | Express |
| Root Directory | Raíz del repositorio |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Valor predeterminado |
| Variable `MONGODB_URI` | Dirección de conexión de Atlas |

La base debe llamarse `f1_tpo` y la colección de carreras `carreras`.
Autorizar en Atlas las conexiones de Vercel. Con las IP dinámicas habituales,
esto requiere permitir `0.0.0.0/0`; usar credenciales de solo lectura para la web.
Guardar la dirección con contraseña únicamente en las variables de entorno.

Después del deploy, comprobar `/`, `/carrera` y
`/paginas/resultado-carrera.html`. Los cambios deben estar subidos al repositorio
antes de desplegar desde GitHub.

## Publicar en Render y MongoDB Atlas

Crear un cluster Free en Atlas, importar el JSON en `f1_tpo.carreras` y autorizar
las direcciones de salida del servicio de Render en Network Access.

Crear un Web Service en Render conectado al repositorio con estos valores:

| Campo | Valor |
| --- | --- |
| Runtime | Node |
| Root Directory | Vacío |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Instance Type | Free |
| Variable `MONGODB_URI` | Dirección de conexión de Atlas |

Guardar la dirección y contraseña de Atlas únicamente en las variables de
entorno de Render. No publicarlas en el repositorio. Render proporciona `PORT`;
si no está definido, el servidor usa el puerto 3000.

El servicio publica el frontend y todas las rutas de lectura de la tabla
«Consultas y scripts». La inserción pública de pilotos está deshabilitada.

Para desplegar estos cambios, primero deben estar subidos a la rama del
repositorio que Render utiliza.
