BEGIN;
CREATE SCHEMA IF NOT EXISTS f1;

CREATE TABLE IF NOT EXISTS f1.usuarios (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario varchar(24) NOT NULL UNIQUE,
  nombre varchar(80) NOT NULL,
  clave_hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS f1.temporadas (
  anio integer PRIMARY KEY,
  sincronizada_en timestamptz,
  calendario_completo boolean NOT NULL DEFAULT false,
  incidencias jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS f1.grandes_premios (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  temporada integer NOT NULL REFERENCES f1.temporadas(anio),
  ronda integer NOT NULL CHECK (ronda>0),
  nombre text NOT NULL,
  circuito text NOT NULL,
  fecha_carrera timestamptz NOT NULL,
  agenda jsonb NOT NULL DEFAULT '{}',
  UNIQUE (temporada, ronda)
);
CREATE TABLE IF NOT EXISTS f1.pilotos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  temporada integer NOT NULL REFERENCES f1.temporadas(anio),
  referencia text,
  nombre text NOT NULL,
  apellido text NOT NULL,
  nacionalidad text,
  UNIQUE (temporada, referencia)
);
CREATE TABLE IF NOT EXISTS f1.inscripciones (
  temporada integer NOT NULL REFERENCES f1.temporadas(anio),
  numero integer NOT NULL,
  piloto_id integer NOT NULL REFERENCES f1.pilotos(id),
  PRIMARY KEY (temporada, numero)
);
CREATE TABLE IF NOT EXISTS f1.equipos (
  id text PRIMARY KEY,
  nombre text NOT NULL
);
CREATE TABLE IF NOT EXISTS f1.sesiones (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gran_premio_id integer NOT NULL REFERENCES f1.grandes_premios(id),
  tipo text NOT NULL CHECK (tipo IN ('carrera','clasificacion','libres-1','libres-2','libres-3','sprint','clasificacion-sprint')),
  fecha timestamptz NOT NULL,
  fuente text NOT NULL,
  actualizada_en timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (gran_premio_id, tipo)
);
CREATE TABLE IF NOT EXISTS f1.resultados (
  sesion_id integer NOT NULL REFERENCES f1.sesiones(id),
  piloto_id integer NOT NULL REFERENCES f1.pilotos(id),
  equipo_id text REFERENCES f1.equipos(id),
  numero integer NOT NULL,
  orden integer NOT NULL,
  posicion integer,
  puntos numeric NOT NULL DEFAULT 0 CHECK (puntos>=0),
  tiempo text,
  gap text,
  q1 text,
  q2 text,
  q3 text,
  vueltas integer,
  estado text,
  neumaticos jsonb,
  paradas jsonb,
  PRIMARY KEY (sesion_id, piloto_id),
  UNIQUE (sesion_id, numero)
);
CREATE INDEX IF NOT EXISTS sesiones_gp_idx ON f1.sesiones(gran_premio_id);
CREATE INDEX IF NOT EXISTS resultados_piloto_idx ON f1.resultados(piloto_id);
COMMIT;
