# F1 Telemetry - proyecto local

Una página de resultados de Fórmula 1 con JavaScript, Node.js y PostgreSQL.
El sitio consulta los datos guardados en PostgreSQL. El servidor está en la raíz y el código del navegador está en `front/js/`, separado por responsabilidad.

| Archivo | Que hace |
| --- | --- |
| `server.js` | Conecta PostgreSQL, consulta resultados, suma campeonatos y entrega la pagina. |
| `usuarios.js` | Maneja el registro, la sesión JWT y la edición del perfil. |
| `front/js/app.js` | Arranca la búsqueda y elige qué vista cargar. |
| `front/js/inicio.js` | Carga el podio, los rankings y la próxima fecha. |
| `front/js/resultados.js` | Maneja los filtros y carga la sesión elegida. |
| `front/js/campeonato.js` | Muestra la clasificación de pilotos o constructores. |
| `front/js/busqueda.js` | Busca pilotos y equipos y carga sus historiales. |
| `front/js/perfil.js` | Envía los formularios de cuenta y muestra el perfil. |
| `front/js/tablas.js` | Dibuja las tablas y genera el HTML de pilotos y equipos. |
| `front/js/comun.js` | Comparte las consultas HTTP, los parámetros y el formato básico. |

Los HTML cargan `app.js` con `type="module"`. El navegador sigue los `import`
para cargar los demás archivos.

`base.sql` define las tablas de PostgreSQL, incluida `f1.usuarios`.

| Vista | HTML |
| --- | --- |
| Inicio, con la próxima fecha, el podio y los rankings | `front/index.html` |
| Resultados de la temporada, con filtros de GP y sesión | `front/paginas/resultados.html` |
| Cada sesión de Último GP | `front/paginas/resultado-carrera.html`, `resultado-clasificacion.html`, `resultado-libres-1.html`, `resultado-libres-2.html`, `resultado-libres-3.html` y `resultado-sprint.html` |
| Campeonatos de pilotos y constructores | `front/paginas/campeonato-pilotos.html` y `campeonato-constructores.html` |
| Historial de un piloto o equipo | `front/paginas/historial.html` |
| Registro, inicio de sesión y edición de perfil | `front/paginas/perfil.html` |

Express inserta `front/paginas/navegacion.html` en cada página. `app.js` lee
`data-vista` y `data-tipo` del `<body>` para cargar los datos correspondientes.
Los enlaces anteriores a `sesion.html` y `campeonato.html` redirigen a las nuevas páginas.

`front/css/style.css` tiene los estilos de todo el sitio. Las columnas y las tandas
de neumáticos pueden ocupar más de una línea. En pantallas de hasta 760 px,
cada fila se lee como una ficha con etiquetas, sin desplazarse a los costados.

## Buscar pilotos y equipos

En cualquier pagina, abrir **🔍 Buscar**, escribir un nombre o parte del nombre
(por ejemplo, `kimi antonelli` o `mercedes`), pulsar **Buscar** y elegir una coincidencia.
La busqueda no distingue mayusculas de minusculas.

Se muestra una fila por piloto y sesion, con GP, carrera o sprint, posicion,
piloto, equipo, puntos, tiempo o estado y vueltas. Arriba se suma el total de puntos
de esos resultados. Solo aparecen los datos ya guardados de la temporada consultada.
Un equipo incluye a todos sus pilotos, tambien reemplazantes, usando el equipo
de cada resultado. Un piloto conserva sus resultados aunque haya cambiado de equipo.

1. El formulario de la lupa usa `prepararBusqueda()` de `busqueda.js`.
2. Al pulsar Buscar, `fetch` pide `/api/buscar?q=kimi+antonelli` a `server.js`.
3. PostgreSQL busca coincidencias con `ILIKE` y el servidor devuelve nombre,
   tipo (`piloto` o `equipo`) e identificador. Los valores se pasan como parametros SQL.
4. `busqueda.js` crea enlaces como `historial.html?piloto=2&temporada=2026`.
   El identificador depende de tu BD.
5. Al abrir el enlace, `cargarHistorial()` pide `/api/historial/piloto/2?temporada=2026`.
6. El servidor une grandes premios, sesiones, resultados, pilotos y equipos;
   filtra por temporada, piloto o equipo y sesiones `carrera` y `sprint`.
7. Devuelve JSON y `busqueda.js` arma las filas con ayuda de `tablas.js`.

Los enlaces conservan el año de la busqueda. Sin `temporada` se usa
`TEMPORADA_ACTUAL` del servidor o, si no esta definido, el año actual.
Si el servidor ya estaba abierto al modificar el codigo, reiniciarlo con
**Control+C** y `npm start`, y recargar el navegador.

## Usar con la base ya cargada

```sh
npm start
```

Abrir **http://localhost:3000**. Detener el servidor con **Control+C**.

## Primera instalación en otra computadora

Necesitás Node.js 22 o superior y PostgreSQL. En pgAdmin, creá una base vacía `f1_tpo` y usá **Restore** sobre ella con el respaldo de la base original.

```sh
npm install
cp -n .env.example .env
```

Completá `.env` con los datos del PostgreSQL de esa computadora y ejecutá `npm start`.

`npm run db:init` permite crear el esquema y las tablas en una base vacía. Para ver los resultados en otra computadora necesitás el respaldo con los registros.

## Recorrido de los datos

1. PostgreSQL guarda el calendario, las sesiones y los resultados en `f1_tpo`, esquema `f1`.
2. `resultados.js` o `campeonato.js` usan `pedir()` de `comun.js` para consultar al servidor con `fetch`.
3. `server.js` ejecuta SQL y responde JSON. El módulo de la vista prepara las filas y `tablas.js` las dibuja.
4. Los campeonatos usan `SUM(puntos)` sobre carreras y sprints, agrupando por
   piloto o equipo. El desempate compara primeros, segundos y sucesivos puestos.

El campeonato refleja los resultados guardados, que pueden ser una carga parcial.
No incluye ajustes exclusivos al campeonato que no aparezcan en puntos por sesion.

La tarjeta dorada y la etiqueta de campeón de pilotos usan la confirmación por
temporada de `campeonesPilotos` en `server.js`. El registro de 2026 se tomó de
`posibleAdaptacion` y se vincula con la referencia guardada del piloto.

## Mi perfil

Generá una clave secreta con el siguiente comando y guardá el resultado como
`JWT_SECRET` en tu `.env`.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm install
npm run db:init
npm start
```

`db:init` agrega la tabla de usuarios a una base existente. En Render usá una
clave propia en las variables del servicio web y `HOST=0.0.0.0`. Si ya restauraste
un respaldo anterior a esta versión, ejecutá `base.sql` desde Query Tool de pgAdmin
conectado a esa base.

| Método y ruta | Qué hace |
| --- | --- |
| `POST /api/usuarios` | Crea la cuenta con `usuario`, `nombre` y `clave`. Responde 201 e inicia sesión. |
| `POST /api/sesion` | Comprueba `usuario` y `clave` e inicia sesión. |
| `GET /api/usuarios/perfil` | Lee el perfil de la sesión actual. |
| `PUT /api/usuarios/perfil` | Guarda el `usuario` y `nombre` del perfil de la sesión actual. |
| `DELETE /api/sesion` | Quita del navegador la cookie de sesión. |

En el menú, abrí **Mi perfil**, creá una cuenta y guardá un cambio para demostrar
el `POST` y el `PUT`. Los podés ver en **Network** de las herramientas del navegador.
PostgreSQL guarda el hash de la contraseña generado con `scrypt` y una sal aleatoria.
Express firma un JWT válido durante una hora y lo envía en una cookie `HttpOnly`.
Al editar, Express toma del JWT el ID del usuario que puede actualizar.

## Archivos de ayuda

- `documentacion/Guia_F1_Telemetry.pdf`: documentación completa y recorrido para la presentación.
- `documentacion/consultas.sql`: consultas de lectura para pegar en pgAdmin.

`node_modules` se genera con npm. La contraseña de PostgreSQL y la clave JWT
se guardan en `.env`, que está excluido de Git.
