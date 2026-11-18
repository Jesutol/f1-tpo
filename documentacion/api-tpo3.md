# Complemento del TPO 3: gestión de pilotos

Se conservaron las páginas y rutas anteriores. Este complemento agrega una API
para crear, editar, consultar y listar pilotos, y una pantalla que la utiliza.

## 1. Conexión con la base

Se sigue usando `back/conexion.js`, la base `f1_tpo` y la variable de terminal
`MONGODB_URI`. No se agregaron dependencias ni credenciales al código.
Las escrituras requieren que el usuario de MongoDB tenga permiso de escritura.

## 2. Validaciones

`back/validaciones.js` comprueba los datos antes de consultar o modificar MongoDB.

| Campo | Regla |
| --- | --- |
| `_id` | Obligatorio al crear. Hasta 80 caracteres: minúsculas, números y guiones. No cambia al editar. |
| `nombre`, `apellido` | Textos obligatorios, no vacíos, de hasta 80 caracteres. Se quitan espacios de los extremos. |
| `numero` | Entero de 1 a 99; se admite `null` o ausencia si no se conoce. |
| `pais` | Código de una bandera disponible, como `ar` o `it`; admite `null` o ausencia. |
| `nacionalidad` | Texto opcional de hasta 80 caracteres. |
| `bandera` | La calcula el servidor a partir de `pais`; no se envía desde el formulario. |

No se admiten campos desconocidos. PUT recibe los datos completos del formulario:
nombre y apellido son obligatorios; los opcionales omitidos quedan sin confirmar.
No se exige que el número sea único: el catálogo también conserva pilotos históricos.

## 3. Endpoints nuevos

| Método | Dirección | Resultado |
| --- | --- | --- |
| GET | `/api/pilotos?cantidad=10&from=0` | Una página del catálogo, ordenada por apellido, nombre e ID. |
| GET | `/api/pilotos/:id` | Un piloto identificado por su `_id`. |
| POST | `/api/pilotos` | Crea un documento y responde 201. |
| PUT | `/api/pilotos/:id` | Actualiza el documento existente y responde 200. No crea uno ausente. |

Ejemplo de cuerpo JSON para crear:

```json
{
  "_id": "piloto-ejemplo",
  "nombre": "Nombre",
  "apellido": "Ejemplo",
  "numero": 90,
  "pais": "ar",
  "nacionalidad": "Argentina"
}
```

Para editar se puede enviar el mismo cuerpo a
`PUT /api/pilotos/piloto-ejemplo`, cambiando los valores necesarios.
El `_id` puede omitirse en PUT; si se envía, debe coincidir con el de la dirección.

## 4. Paginación real

`cantidad` es un entero de 1 a 100 (por defecto 10). `from` es un entero no
negativo (por defecto 0): indica cuántos documentos saltar.
El servidor usa `sort`, `skip` y `limit` en MongoDB, sin enviar todo el catálogo.

Primera página: `/api/pilotos?cantidad=10&from=0`.
Segunda página: `/api/pilotos?cantidad=10&from=10`.
La respuesta tiene este formato:

```json
{
  "datos": [],
  "total": 31,
  "cantidad": 10,
  "from": 0
}
```

`datos` contiene los pilotos de esa página; el arreglo vacío del ejemplo solo
ilustra la estructura. `total` refleja la cantidad real en la base.
Si el desplazamiento supera el total, se devuelve 200 con `datos: []`.

## 5. Códigos y errores

- 200: consulta o actualización correcta.
- 201: piloto creado.
- 400: datos inválidos, JSON mal formado, ID o paginación incorrectos.
- 404: piloto o dirección de la API inexistentes.
- 409: el ID que se intenta crear ya existe.
- 413: cuerpo demasiado grande para el servidor.
- 500: error del servidor o de conexión con MongoDB.

Los errores de la API usan JSON con un campo `mensaje` para que la pantalla
pueda explicar qué ocurrió. Los fallos de conexión no muestran credenciales.

## 6. Pantalla de gestión

Archivo: `front/paginas/gestion-pilotos.html`.
Script: `front/js/gestion-pilotos.js`.
Se accede desde el enlace **Gestión de pilotos** al final del inicio o desde
`http://localhost:3000/paginas/gestion-pilotos.html`.

1. Completar el formulario y pulsar **Crear piloto**: envía POST.
2. Pulsar **Editar** en una fila: consulta el piloto con GET individual.
3. Corregir los datos y pulsar **Guardar cambios**: envía PUT.
4. **Limpiar / nuevo piloto** vuelve al modo de creación.
5. **Anterior**, **Siguiente** y **Por página** consultan páginas nuevas al servidor.

Los datos se guardan en MongoDB; no se reescriben los JSON de respaldo.
La pantalla administra el catálogo, no los puntos ni los resultados históricos.
No incorpora login; la autenticación sigue siendo un desafío opcional del TPO.

## 7. Direcciones de lectura equivalentes

Estas direcciones conviven con las anteriores para mantener la compatibilidad:

| Nueva | Anterior |
| --- | --- |
| `/api/carreras/ultima` | `/carrera` |
| `/api/carreras?cantidad=5&from=0` | `/carreras` (lista completa anterior) |
| `/api/carreras/:id` | Nueva consulta por `_id` de carrera. |
| `/api/sesiones/:tipo` | `/sesiones/:tipo` |
| `/api/campeonatos/:tipo` | `/campeonato/:tipo` |
| `/api/equipos?cantidad=5&from=0` | `/equipos` (lista completa anterior) |
| `/api/resumenes/actual` | `/api/inicio` |
| `/api/pilotos?cantidad=10&from=0` | `/pilotos` (lista completa anterior) |

Las rutas antiguas no se borraron y las vistas existentes conservan su funcionamiento.
La nueva pantalla de gestión usa los GET paginados de la API.

## 8. Ejecutar y verificar

Con `MONGODB_URI` configurada, detener el servidor con Ctrl+C y ejecutar otra vez
`npm start` desde la raíz. Se necesita reiniciar porque Node no recarga los GET
automáticamente. No hace falta reinstalar dependencias.

`npm test` comprueba lectura, paginación, creación, edición, validaciones,
duplicados, errores HTTP y compatibilidad con MongoDB simulado. Las pruebas no
modifican Atlas. `npm run build` prepara el frontend para Vercel.
