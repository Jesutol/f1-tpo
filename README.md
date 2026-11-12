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

- `front/index.html`: página de inicio. Abrir este archivo para recorrer el sitio.
- `front/paginas/`: campeonatos de pilotos y constructores, resultados de carrera y clasificación.
- `front/css/style.css`: estilos compartidos por todas las páginas.
- `front/recursos/`: banderas y logos de equipos.
- `back/`: servidor Express y conexión con MongoDB.
- `documentacion/`: apuntes del proyecto.

Desde `front/index.html`, las rutas a las páginas empiezan con `./paginas/`.
Desde las páginas interiores, `../` permite acceder al inicio, los estilos y los recursos.

## Ejecutar el proyecto

Con MongoDB local iniciado, ejecutar desde la raíz del proyecto:

```powershell
npm ci
npm start
```

Abrir `http://localhost:3000`. La página de carrera consulta la colección
`f1_tpo.carreras`. Importar `back/carrera-sao-paulo-2026.json` en esa colección
para cargar el GP de ejemplo.

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

El servicio publica el frontend y las rutas de lectura `GET /carrera` y
`GET /pilotos`. La inserción pública de pilotos está deshabilitada.

Para desplegar estos cambios, primero deben estar subidos a la rama del
repositorio que Render utiliza.
