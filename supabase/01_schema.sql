-- =====================================================================
-- EduResuelve — 01_schema.sql
-- Esquema privado "app": tablas, restricciones e índices.
-- Las tablas NO se exponen por la API: todo acceso pasa por las
-- funciones RPC de 02_functions.sql, que validan sesión y permisos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
revoke all on schema app from public;

-- ---------------------------------------------------------------------
-- Usuarios (autenticación propia por DNI + contraseña)
-- ---------------------------------------------------------------------
create sequence if not exists app.user_code_seq;

create table if not exists app.users (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique
                       default ('USR-' || lpad(nextval('app.user_code_seq')::text, 4, '0')),
  dni                  text not null unique check (dni ~ '^[0-9]{8}$'),
  nombres              text not null check (length(trim(nombres)) between 1 and 80),
  apellidos            text not null check (length(trim(apellidos)) between 1 and 80),
  email                text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role                 text not null check (role in ('Estudiante', 'Docente', 'Orientador', 'Administrador')),
  status               text not null default 'Activo' check (status in ('Activo', 'Inactivo')),
  password_hash        text not null,
  must_change_password boolean not null default true,
  failed_attempts      integer not null default 0,
  locked_until         timestamptz,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists app.sessions (
  token_hash   text primary key,
  user_id      uuid not null references app.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on app.sessions (user_id);

-- ---------------------------------------------------------------------
-- Incidencias
-- ---------------------------------------------------------------------
create table if not exists app.incident_counters (
  year integer primary key,
  last integer not null default 0
);

create table if not exists app.incidents (
  code                 text primary key check (code ~ '^ER-[0-9]{4}-[0-9]{4,}$'),
  title                text not null check (length(trim(title)) between 1 and 160),
  description          text not null check (length(trim(description)) between 1 and 2000),
  category             text not null check (category in ('Convivencia', 'Académica', 'Infraestructura', 'Orientación', 'Administrativa')),
  priority             text not null check (priority in ('Baja', 'Media', 'Alta', 'Crítica')),
  status               text not null default 'Nuevo'
                       check (status in ('Nuevo', 'En revisión', 'Asignado', 'En atención', 'Resuelto', 'Cerrado', 'Descartado')),
  incident_date        date not null,
  location             text not null check (length(trim(location)) between 1 and 160),
  involved_people      text not null default '' check (length(involved_people) <= 200),
  observations         text not null default '' check (length(observations) <= 1000),
  reported_by          uuid not null references app.users (id),
  responsible_id       uuid references app.users (id),
  pending_reassignment boolean not null default false,
  registered_at        timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists incidents_reported_idx on app.incidents (reported_by);
create index if not exists incidents_responsible_idx on app.incidents (responsible_id);

-- Historial inmutable (RN-003 / RN-009)
create table if not exists app.follow_ups (
  id              bigserial primary key,
  incident_code   text not null references app.incidents (code),
  kind            text not null check (kind in ('Registro', 'Cambio de estado', 'Asignación', 'Reasignación', 'Edición', 'Observación', 'Evidencia')),
  previous_status text,
  new_status      text,
  observation     text not null default '',
  reason          text,
  responsible_id  uuid references app.users (id),
  user_id         uuid not null references app.users (id),
  created_at      timestamptz not null default now()
);
create index if not exists follow_ups_incident_idx on app.follow_ups (incident_code, created_at);

create table if not exists app.resolutions (
  id              bigserial primary key,
  incident_code   text not null references app.incidents (code),
  summary         text not null,
  actions_taken   text not null,
  result          text not null,
  observations    text not null default '',
  resolution_date date not null,
  registered_by   uuid not null references app.users (id),
  registered_at   timestamptz not null default now(),
  superseded      boolean not null default false
);

create table if not exists app.closures (
  id            bigserial primary key,
  incident_code text not null references app.incidents (code),
  observations  text not null default '',
  closed_by     uuid not null references app.users (id),
  closed_at     timestamptz not null default now(),
  superseded    boolean not null default false
);

-- ---------------------------------------------------------------------
-- Evidencias (archivo guardado en partes base64 dentro de la BD)
-- ---------------------------------------------------------------------
create table if not exists app.evidences (
  id                  bigserial primary key,
  incident_code       text not null references app.incidents (code),
  file_name           text not null check (length(file_name) between 1 and 200),
  mime_type           text not null check (mime_type in (
                        'application/pdf', 'image/jpeg', 'image/png',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes          integer not null default 0,
  original_size_bytes integer not null default 0,
  compressed          boolean not null default false,
  evidence_type       text not null check (evidence_type in ('Documento', 'Imagen', 'Captura de pantalla', 'Informe', 'Otro')),
  description         text not null check (length(trim(description)) between 1 and 500),
  status              text not null default 'Pendiente' check (status in ('Pendiente', 'Activa', 'Anulada')),
  void_reason         text,
  voided_by           uuid references app.users (id),
  voided_at           timestamptz,
  uploaded_by         uuid not null references app.users (id),
  uploaded_at         timestamptz not null default now()
);
create index if not exists evidences_incident_idx on app.evidences (incident_code);

create table if not exists app.evidence_chunks (
  evidence_id bigint not null references app.evidences (id) on delete cascade,
  idx         integer not null check (idx >= 0),
  data        text not null,
  byte_length integer not null,
  primary key (evidence_id, idx)
);

-- ---------------------------------------------------------------------
-- Notificaciones (campanita)
-- ---------------------------------------------------------------------
create table if not exists app.notifications (
  id            bigserial primary key,
  user_id       uuid not null references app.users (id) on delete cascade,
  incident_code text references app.incidents (code),
  title         text not null,
  body          text not null default '',
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_user_idx on app.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------
create table if not exists app.audit_logs (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references app.users (id),
  user_label  text not null,
  dni         text,
  action      text not null,
  module      text not null,
  entity_id   text not null default '',
  description text not null default ''
);
create index if not exists audit_created_idx on app.audit_logs (created_at desc);

-- La auditoría y el historial no se modifican ni se borran (RN-009)
create or replace function app.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'El registro % es inmutable (RN-009).', tg_table_name
    using errcode = 'PT403';
end;
$$;

drop trigger if exists audit_logs_immutable on app.audit_logs;
create trigger audit_logs_immutable before update or delete on app.audit_logs
  for each row execute function app.forbid_mutation();

drop trigger if exists follow_ups_immutable on app.follow_ups;
create trigger follow_ups_immutable before update or delete on app.follow_ups
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------
-- Actas de resolución (RN-011)
-- Copia fija de todo lo documentado al resolver (Provisional) y al cerrar
-- (Definitiva). El contenido y su huella SHA-256 no se pueden modificar;
-- solo se permite marcar un acta como "Reemplazada" (reapertura o nueva versión).
-- ---------------------------------------------------------------------
create table if not exists app.actas (
  number            text primary key check (number ~ '^ACT-[0-9]{4}-[0-9]{4,}-[0-9]{2}$'),
  incident_code     text not null references app.incidents (code),
  seq               integer not null check (seq > 0),
  kind              text not null check (kind in ('Provisional', 'Definitiva')),
  status            text not null default 'Vigente' check (status in ('Vigente', 'Reemplazada')),
  content           jsonb not null,
  content_hash      text not null,
  verification_code text not null unique,
  issued_by         uuid not null references app.users (id),
  issued_at         timestamptz not null default now(),
  replaced_at       timestamptz,
  replaced_reason   text,
  unique (incident_code, seq)
);
create index if not exists actas_incident_idx on app.actas (incident_code, seq);

create or replace function app.actas_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE'
     or old.status <> 'Vigente' or new.status <> 'Reemplazada'
     or (new.number, new.incident_code, new.seq, new.kind, new.content, new.content_hash,
         new.verification_code, new.issued_by, new.issued_at)
        is distinct from
        (old.number, old.incident_code, old.seq, old.kind, old.content, old.content_hash,
         old.verification_code, old.issued_by, old.issued_at) then
    raise exception 'El acta % es inmutable (RN-011). Solo puede marcarse como reemplazada.', old.number
      using errcode = 'PT403';
  end if;
  return new;
end;
$$;

drop trigger if exists actas_immutable on app.actas;
create trigger actas_immutable before update or delete on app.actas
  for each row execute function app.actas_guard();

-- ---------------------------------------------------------------------
-- Encuesta de satisfacción (RN-012)
-- La responde quien registró la incidencia tras su cierre; una por cierre.
-- Las respuestas no se modifican ni se borran.
-- ---------------------------------------------------------------------
create table if not exists app.surveys (
  id            bigserial primary key,
  incident_code text not null references app.incidents (code),
  closure_id    bigint not null unique references app.closures (id),
  user_id       uuid not null references app.users (id),
  rating        smallint not null check (rating between 1 and 5),
  resolved      text not null check (resolved in ('Sí', 'Parcialmente', 'No')),
  speed_rating  smallint not null check (speed_rating between 1 and 5),
  comment       text not null default '' check (length(comment) <= 500),
  created_at    timestamptz not null default now()
);
create index if not exists surveys_incident_idx on app.surveys (incident_code);

drop trigger if exists surveys_immutable on app.surveys;
create trigger surveys_immutable before update or delete on app.surveys
  for each row execute function app.forbid_mutation();

-- Defensa en profundidad: RLS activo y sin políticas en todas las tablas.
alter table app.users enable row level security;
alter table app.sessions enable row level security;
alter table app.incident_counters enable row level security;
alter table app.incidents enable row level security;
alter table app.follow_ups enable row level security;
alter table app.resolutions enable row level security;
alter table app.closures enable row level security;
alter table app.evidences enable row level security;
alter table app.evidence_chunks enable row level security;
alter table app.notifications enable row level security;
alter table app.audit_logs enable row level security;
alter table app.actas enable row level security;
alter table app.surveys enable row level security;
