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
- `back/`: carpeta reservada para el backend, todavía sin implementar.
- `documentacion/`: apuntes del proyecto.

Desde `front/index.html`, las rutas a las páginas empiezan con `./paginas/`.
Desde las páginas interiores, `../` permite acceder al inicio, los estilos y los recursos.
