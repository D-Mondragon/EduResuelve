-- =====================================================================
-- EduResuelve — 02_functions.sql
-- Lógica de negocio (RN-001 … RN-010), autenticación y permisos.
-- Funciones internas en el esquema "app" (no expuesto).
-- Funciones públicas (RPC) en "public": son lo único que ve la API.
--
-- Códigos de error:
--   PT401 → sesión inválida o expirada (HTTP 401)
--   PT403 → acción no permitida para el rol (HTTP 403)
--   PT404 → registro no encontrado (HTTP 404)
--   P0001 → validación de negocio (HTTP 400)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilidades internas
-- ---------------------------------------------------------------------
create or replace function app.hash_token(p_token text) returns text
language sql immutable set search_path = app, extensions, pg_temp as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function app.full_name(u app.users) returns text
language sql immutable as $$
  select u.nombres || ' ' || u.apellidos;
$$;

create or replace function app.fail(p_message text) returns void
language plpgsql as $$
begin
  raise exception '%', p_message using errcode = 'P0001';
end;
$$;

create or replace function app.forbidden(p_message text default 'No tienes permiso para realizar esta acción.')
returns void language plpgsql as $$
begin
  raise exception '%', p_message using errcode = 'PT403';
end;
$$;

create or replace function app.not_found(p_message text default 'Registro no encontrado.')
returns void language plpgsql as $$
begin
  raise exception '%', p_message using errcode = 'PT404';
end;
$$;

create or replace function app.validate_password(p_password text) returns void
language plpgsql as $$
begin
  if p_password is null or length(p_password) < 8
     or p_password !~ '[A-Za-z]' or p_password !~ '[0-9]' then
    perform app.fail('La contraseña debe tener al menos 8 caracteres e incluir letras y números.');
  end if;
end;
$$;

create or replace function app.log(
  p_user app.users, p_action text, p_module text, p_entity text, p_description text
) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
begin
  insert into app.audit_logs (user_id, user_label, dni, action, module, entity_id, description)
  values (
    p_user.id,
    coalesce(app.full_name(p_user), 'Sistema'),
    p_user.dni,
    p_action, p_module, coalesce(p_entity, ''), coalesce(p_description, '')
  );
end;
$$;

create or replace function app.notify(
  p_user_id uuid, p_incident text, p_title text, p_body text, p_except uuid default null
) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
begin
  if p_user_id is null or p_user_id is not distinct from p_except then
    return;
  end if;
  insert into app.notifications (user_id, incident_code, title, body)
  values (p_user_id, p_incident, p_title, p_body);
end;
$$;

-- Notifica a todos los gestores activos (Orientador / Administrador)
create or replace function app.notify_managers(
  p_incident text, p_title text, p_body text, p_except uuid default null
) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
declare
  r record;
begin
  for r in
    select id from app.users
    where status = 'Activo' and role in ('Orientador', 'Administrador')
  loop
    perform app.notify(r.id, p_incident, p_title, p_body, p_except);
  end loop;
end;
$$;

-- Valida el token y devuelve el usuario de la sesión (RN-010)
create or replace function app.session_user(p_token text) returns app.users
language plpgsql set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users;
  v_session app.sessions;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'Tu sesión no es válida. Inicia sesión nuevamente.' using errcode = 'PT401';
  end if;

  select * into v_session from app.sessions
  where token_hash = app.hash_token(p_token) and expires_at > now();
  if not found then
    raise exception 'Tu sesión expiró. Inicia sesión nuevamente.' using errcode = 'PT401';
  end if;

  select * into v_user from app.users where id = v_session.user_id;
  if v_user.status <> 'Activo' then
    delete from app.sessions where user_id = v_user.id;
    raise exception 'Tu cuenta está inactiva. Contacta al administrador.' using errcode = 'PT401';
  end if;

  update app.sessions set last_seen_at = now() where token_hash = v_session.token_hash;
  return v_user;
end;
$$;

create or replace function app.is_manager(u app.users) returns boolean
language sql immutable as $$
  select u.role in ('Orientador', 'Administrador');
$$;

create or replace function app.can_view(u app.users, i app.incidents) returns boolean
language sql immutable as $$
  select case
    when u.role in ('Orientador', 'Administrador') then true
    when u.role = 'Docente' then i.reported_by = u.id or i.responsible_id = u.id
    else i.reported_by = u.id
  end;
$$;

-- Acciones permitidas para el usuario sobre la incidencia (matriz de permisos)
create or replace function app.allowed_actions(u app.users, i app.incidents) returns text[]
language plpgsql stable set search_path = app, extensions, pg_temp as $$
declare
  v text[] := '{}';
  v_manager boolean := app.is_manager(u);
  v_admin boolean := u.role = 'Administrador';
  v_is_responsible boolean := i.responsible_id = u.id;
begin
  if not app.can_view(u, i) then
    return v;
  end if;

  if i.status in ('Nuevo', 'En revisión') and (v_manager or i.reported_by = u.id) then
    v := v || 'edit'::text;
  end if;
  if i.status = 'Nuevo' and v_manager then
    v := v || 'review'::text;
  end if;
  if i.status = 'En revisión' and v_manager then
    v := v || array['assign', 'discard'];
  end if;
  if i.status = 'Asignado' and (v_is_responsible or v_admin) then
    v := v || 'start'::text;
  end if;
  if i.status = 'En atención' and (v_is_responsible or v_admin) then
    v := v || 'resolve'::text;
  end if;
  if i.status in ('Asignado', 'En atención') and i.pending_reassignment and v_manager then
    v := v || 'reassign'::text;
  end if;
  if i.status = 'Resuelto' and v_manager then
    v := v || 'close'::text;
  end if;
  if i.status = 'Cerrado' and v_admin then
    v := v || 'reopen'::text;
  end if;
  if i.status not in ('Cerrado', 'Descartado') then
    v := v || array['observe', 'evidence'];
  end if;
  return v;
end;
$$;

create or replace function app.user_json(u app.users) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', u.id,
    'code', u.code,
    'dni', u.dni,
    'nombres', u.nombres,
    'apellidos', u.apellidos,
    'fullName', u.nombres || ' ' || u.apellidos,
    'email', u.email,
    'role', u.role,
    'status', u.status,
    'mustChangePassword', u.must_change_password,
    'lastLoginAt', u.last_login_at,
    'createdAt', u.created_at
  );
$$;

create or replace function app.user_ref(p_id uuid) returns jsonb
language sql stable set search_path = app, extensions, pg_temp as $$
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id, 'fullName', u.nombres || ' ' || u.apellidos,
    'role', u.role, 'email', u.email, 'status', u.status
  ) end
  from (select 1) d left join app.users u on u.id = p_id;
$$;

create or replace function app.incident_summary_json(i app.incidents) returns jsonb
language sql stable set search_path = app, extensions, pg_temp as $$
  select jsonb_build_object(
    'code', i.code,
    'title', i.title,
    'category', i.category,
    'priority', i.priority,
    'status', i.status,
    'incidentDate', i.incident_date,
    'location', i.location,
    'registeredAt', i.registered_at,
    'updatedAt', i.updated_at,
    'pendingReassignment', i.pending_reassignment,
    'reporter', app.user_ref(i.reported_by),
    'responsible', app.user_ref(i.responsible_id)
  );
$$;

create or replace function app.get_incident_for(u app.users, p_code text) returns app.incidents
language plpgsql set search_path = app, extensions, pg_temp as $$
declare
  v app.incidents;
begin
  select * into v from app.incidents where code = upper(trim(p_code)) for update;
  if not found or not app.can_view(u, v) then
    perform app.not_found('No encontramos la incidencia solicitada o no tienes acceso a ella.');
  end if;
  return v;
end;
$$;

create or replace function app.require_action(u app.users, i app.incidents, p_action text, p_message text)
returns void language plpgsql set search_path = app, extensions, pg_temp as $$
begin
  if not (p_action = any (app.allowed_actions(u, i))) then
    perform app.forbidden(p_message);
  end if;
end;
$$;

create or replace function app.add_follow_up(
  p_code text, p_kind text, p_prev text, p_new text, p_observation text,
  p_reason text, p_responsible uuid, p_user uuid
) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
begin
  insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, reason, responsible_id, user_id)
  values (p_code, p_kind, p_prev, p_new, coalesce(p_observation, ''), nullif(trim(coalesce(p_reason, '')), ''), p_responsible, p_user);
end;
$$;

create or replace function app.text_field(p_data jsonb, p_key text) returns text
language sql immutable as $$
  select trim(coalesce(p_data ->> p_key, ''));
$$;

-- =====================================================================
-- RPC: Autenticación
-- =====================================================================
create or replace function public.login(p_dni text, p_password text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users;
  v_token text;
  v_dni text := trim(coalesce(p_dni, ''));
begin
  if v_dni !~ '^[0-9]{8}$' or coalesce(p_password, '') = '' then
    perform app.fail('Ingresa un DNI de 8 dígitos y tu contraseña.');
  end if;

  select * into v_user from app.users where dni = v_dni for update;

  if not found then
    insert into app.audit_logs (user_label, dni, action, module, entity_id, description)
    values ('Desconocido', v_dni, 'Intento fallido de inicio de sesión', 'Autenticación', v_dni,
            'DNI no registrado.');
    return jsonb_build_object('error', 'DNI o contraseña incorrectos.');
  end if;

  if v_user.locked_until is not null and v_user.locked_until > now() then
    perform app.log(v_user, 'Intento fallido de inicio de sesión', 'Autenticación', v_user.code,
                    'Intento durante bloqueo temporal.');
    return jsonb_build_object('error', format(
      'Cuenta bloqueada temporalmente por intentos fallidos. Intenta nuevamente en %s minuto(s).',
      greatest(1, ceil(extract(epoch from (v_user.locked_until - now())) / 60)::int)));
  end if;

  if v_user.password_hash <> extensions.crypt(p_password, v_user.password_hash) then
    update app.users
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
    where id = v_user.id
    returning * into v_user;

    perform app.log(v_user, 'Intento fallido de inicio de sesión', 'Autenticación', v_user.code,
                    format('Contraseña incorrecta (intento %s de 5).', v_user.failed_attempts));
    if v_user.failed_attempts >= 5 then
      return jsonb_build_object('error', 'Superaste el número de intentos. Tu cuenta quedó bloqueada por 15 minutos.');
    end if;
    return jsonb_build_object('error', 'DNI o contraseña incorrectos.');
  end if;

  if v_user.status <> 'Activo' then
    perform app.log(v_user, 'Intento fallido de inicio de sesión', 'Autenticación', v_user.code,
                    'Cuenta inactiva.');
    return jsonb_build_object('error', 'Tu cuenta está inactiva. Contacta al administrador.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into app.sessions (token_hash, user_id, expires_at)
  values (app.hash_token(v_token), v_user.id, now() + interval '7 days');

  update app.users
  set failed_attempts = 0, locked_until = null, last_login_at = now()
  where id = v_user.id
  returning * into v_user;

  delete from app.sessions where expires_at < now();

  perform app.log(v_user, 'Inicio de sesión', 'Autenticación', v_user.code, 'Inicio de sesión exitoso.');
  return jsonb_build_object('token', v_token, 'user', app.user_json(v_user));
end;
$$;

create or replace function public.logout(p_token text) returns void
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users;
begin
  select u.* into v_user from app.sessions s join app.users u on u.id = s.user_id
  where s.token_hash = app.hash_token(coalesce(p_token, ''));
  if found then
    delete from app.sessions where token_hash = app.hash_token(p_token);
    perform app.log(v_user, 'Cierre de sesión', 'Autenticación', v_user.code, 'Cierre de sesión.');
  end if;
end;
$$;

create or replace function public.me(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
begin
  return app.user_json(app.session_user(p_token));
end;
$$;

create or replace function public.change_password(p_token text, p_current text, p_new text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  if v_user.password_hash <> extensions.crypt(coalesce(p_current, ''), v_user.password_hash) then
    perform app.fail('La contraseña actual no es correcta.');
  end if;
  perform app.validate_password(p_new);
  if p_new = p_current then
    perform app.fail('La nueva contraseña debe ser diferente a la actual.');
  end if;

  update app.users
  set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
      must_change_password = false, updated_at = now()
  where id = v_user.id
  returning * into v_user;

  -- Cierra las demás sesiones del usuario
  delete from app.sessions where user_id = v_user.id and token_hash <> app.hash_token(p_token);
  perform app.log(v_user, 'Cambio de contraseña', 'Autenticación', v_user.code, 'El usuario cambió su contraseña.');
  return app.user_json(v_user);
end;
$$;

-- =====================================================================
-- RPC: Incidencias
-- =====================================================================
create or replace function public.list_incidents(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  return coalesce((
    select jsonb_agg(app.incident_summary_json(i) || jsonb_build_object('allowedActions', app.allowed_actions(v_user, i))
                     order by i.updated_at desc)
    from app.incidents i
    where app.can_view(v_user, i)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_incident(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
begin
  return app.incident_summary_json(v_inc) || jsonb_build_object(
    'description', v_inc.description,
    'involvedPeople', v_inc.involved_people,
    'observations', v_inc.observations,
    'allowedActions', app.allowed_actions(v_user, v_inc),
    'followUps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'kind', f.kind,
        'previousStatus', f.previous_status, 'newStatus', f.new_status,
        'observation', f.observation, 'reason', f.reason,
        'responsible', app.user_ref(f.responsible_id),
        'user', app.user_ref(f.user_id),
        'createdAt', f.created_at
      ) order by f.created_at, f.id)
      from app.follow_ups f where f.incident_code = v_inc.code
    ), '[]'::jsonb),
    'evidences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'fileName', e.file_name, 'mimeType', e.mime_type,
        'sizeBytes', e.size_bytes, 'originalSizeBytes', e.original_size_bytes,
        'compressed', e.compressed, 'evidenceType', e.evidence_type,
        'description', e.description, 'status', e.status,
        'voidReason', e.void_reason, 'voidedAt', e.voided_at,
        'voidedBy', app.user_ref(e.voided_by),
        'uploadedBy', app.user_ref(e.uploaded_by), 'uploadedAt', e.uploaded_at,
        'chunkCount', (select count(*) from app.evidence_chunks c where c.evidence_id = e.id),
        'canVoid', e.status = 'Activa' and (
          app.is_manager(v_user)
          or (e.uploaded_by = v_user.id and v_inc.status not in ('Cerrado', 'Descartado')))
      ) order by e.uploaded_at desc)
      from app.evidences e where e.incident_code = v_inc.code and e.status <> 'Pendiente'
    ), '[]'::jsonb),
    'resolution', (
      select jsonb_build_object(
        'summary', r.summary, 'actionsTaken', r.actions_taken, 'result', r.result,
        'observations', r.observations, 'resolutionDate', r.resolution_date,
        'registeredBy', app.user_ref(r.registered_by), 'registeredAt', r.registered_at)
      from app.resolutions r
      where r.incident_code = v_inc.code and not r.superseded
      order by r.id desc limit 1
    ),
    'closure', (
      select jsonb_build_object(
        'observations', c.observations, 'closedBy', app.user_ref(c.closed_by), 'closedAt', c.closed_at)
      from app.closures c
      where c.incident_code = v_inc.code and not c.superseded
      order by c.id desc limit 1
    ),
    'actas', coalesce((
      select jsonb_agg(app.acta_meta_json(a) order by a.seq desc)
      from app.actas a where a.incident_code = v_inc.code
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function app.validate_incident_data(p_data jsonb) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
declare
  v_date date;
begin
  if app.text_field(p_data, 'title') = '' then
    perform app.fail('Ingresa el título de la incidencia.');
  end if;
  if length(app.text_field(p_data, 'title')) > 160 then
    perform app.fail('El título admite como máximo 160 caracteres.');
  end if;
  if app.text_field(p_data, 'description') = '' then
    perform app.fail('Describe lo ocurrido.');
  end if;
  if length(app.text_field(p_data, 'description')) > 2000 then
    perform app.fail('La descripción admite como máximo 2000 caracteres.');
  end if;
  if app.text_field(p_data, 'category') not in ('Convivencia', 'Académica', 'Infraestructura', 'Orientación', 'Administrativa') then
    perform app.fail('Selecciona una categoría válida.');
  end if;
  if app.text_field(p_data, 'priority') not in ('Baja', 'Media', 'Alta', 'Crítica') then
    perform app.fail('Selecciona una prioridad válida.');
  end if;
  if app.text_field(p_data, 'location') = '' then
    perform app.fail('Indica el lugar del incidente.');
  end if;
  if length(app.text_field(p_data, 'location')) > 160 then
    perform app.fail('El lugar admite como máximo 160 caracteres.');
  end if;
  if length(app.text_field(p_data, 'involvedPeople')) > 200 then
    perform app.fail('Personas involucradas admite como máximo 200 caracteres.');
  end if;
  begin
    v_date := (p_data ->> 'incidentDate')::date;
  exception when others then
    v_date := null;
  end;
  if v_date is null then
    perform app.fail('Selecciona la fecha del incidente.');
  end if;
  if v_date > (now() at time zone 'America/Lima')::date then
    perform app.fail('La fecha del incidente no puede ser futura.');
  end if;
end;
$$;

-- RN-001: toda incidencia inicia como Nuevo. El código lo genera la BD.
create or replace function public.create_incident(p_token text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_year integer := extract(year from now() at time zone 'America/Lima')::int;
  v_number integer;
  v_code text;
begin
  perform app.validate_incident_data(p_data);

  insert into app.incident_counters (year, last) values (v_year, 1)
  on conflict (year) do update set last = app.incident_counters.last + 1
  returning last into v_number;
  v_code := format('ER-%s-%s', v_year, lpad(v_number::text, 4, '0'));

  insert into app.incidents (code, title, description, category, priority, status, incident_date,
                             location, involved_people, reported_by)
  values (v_code, app.text_field(p_data, 'title'), app.text_field(p_data, 'description'),
          app.text_field(p_data, 'category'), app.text_field(p_data, 'priority'), 'Nuevo',
          (p_data ->> 'incidentDate')::date, app.text_field(p_data, 'location'),
          app.text_field(p_data, 'involvedPeople'), v_user.id);

  perform app.add_follow_up(v_code, 'Registro', null, 'Nuevo', 'Incidencia registrada.', null, null, v_user.id);
  perform app.log(v_user, 'Registro de incidencia', 'Incidencias', v_code,
                  format('Registró la incidencia "%s".', app.text_field(p_data, 'title')));
  perform app.notify_managers(v_code, 'Nueva incidencia registrada',
                              format('%s: %s', v_code, app.text_field(p_data, 'title')), v_user.id);
  return jsonb_build_object('code', v_code);
end;
$$;

-- D3: edición solo en Nuevo / En revisión, por quien registró o gestores.
create or replace function public.update_incident(p_token text, p_code text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
  v_changes text[] := '{}';
begin
  perform app.require_action(v_user, v_inc, 'edit',
    'Solo quien registró la incidencia o un gestor puede editarla, y únicamente en estado Nuevo o En revisión.');
  perform app.validate_incident_data(p_data);

  if v_inc.title <> app.text_field(p_data, 'title') then v_changes := v_changes || 'título'::text; end if;
  if v_inc.description <> app.text_field(p_data, 'description') then v_changes := v_changes || 'descripción'::text; end if;
  if v_inc.category <> app.text_field(p_data, 'category') then v_changes := v_changes || 'categoría'::text; end if;
  if v_inc.priority <> app.text_field(p_data, 'priority') then v_changes := v_changes || 'prioridad'::text; end if;
  if v_inc.incident_date <> (p_data ->> 'incidentDate')::date then v_changes := v_changes || 'fecha'::text; end if;
  if v_inc.location <> app.text_field(p_data, 'location') then v_changes := v_changes || 'lugar'::text; end if;
  if v_inc.involved_people <> app.text_field(p_data, 'involvedPeople') then v_changes := v_changes || 'personas involucradas'::text; end if;

  if cardinality(v_changes) = 0 then
    perform app.fail('No hay cambios para guardar.');
  end if;

  update app.incidents set
    title = app.text_field(p_data, 'title'),
    description = app.text_field(p_data, 'description'),
    category = app.text_field(p_data, 'category'),
    priority = app.text_field(p_data, 'priority'),
    incident_date = (p_data ->> 'incidentDate')::date,
    location = app.text_field(p_data, 'location'),
    involved_people = app.text_field(p_data, 'involvedPeople'),
    updated_at = now()
  where code = v_inc.code;

  perform app.add_follow_up(v_inc.code, 'Edición', v_inc.status, v_inc.status,
    'Campos modificados: ' || array_to_string(v_changes, ', ') || '.', null, null, v_user.id);
  perform app.log(v_user, 'Edición de incidencia', 'Incidencias', v_inc.code,
    'Campos modificados: ' || array_to_string(v_changes, ', ') || '.');
  return jsonb_build_object('code', v_inc.code);
end;
$$;

-- Transiciones: review, assign, start, discard, reopen (RN-002/003/004/007/008/010)
create or replace function public.transition_incident(
  p_token text, p_code text, p_action text,
  p_observation text default '', p_reason text default '', p_responsible uuid default null
) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
  v_next text;
  v_obs text := trim(coalesce(p_observation, ''));
  v_reason text := trim(coalesce(p_reason, ''));
  v_resp app.users;
  v_audit_action text := 'Cambio de estado';
begin
  v_next := case p_action
    when 'review' then 'En revisión'
    when 'assign' then 'Asignado'
    when 'start' then 'En atención'
    when 'discard' then 'Descartado'
    when 'reopen' then 'En revisión'
    else null end;
  if v_next is null then
    perform app.fail('Acción no reconocida.');
  end if;

  perform app.require_action(v_user, v_inc, p_action, format(
    'No puedes pasar la incidencia de "%s" a "%s" con tu rol (%s).', v_inc.status, v_next, v_user.role));

  if p_action = 'discard' and v_reason = '' then
    perform app.fail('Debe indicar el motivo del descarte.');
  end if;
  if p_action = 'reopen' and v_reason = '' then
    perform app.fail('Debe indicar el motivo de la reapertura.');
  end if;
  if p_action in ('review', 'assign', 'start') and v_obs = '' then
    perform app.fail('Ingresa una observación para el seguimiento.');
  end if;

  if p_action = 'assign' then
    select * into v_resp from app.users where id = p_responsible;
    if not found or v_resp.status <> 'Activo' or v_resp.role not in ('Docente', 'Orientador', 'Administrador') then
      perform app.fail('Selecciona un responsable válido: usuario activo con rol Docente, Orientador o Administrador.');
    end if;
    update app.incidents
    set status = v_next, responsible_id = v_resp.id, pending_reassignment = false, updated_at = now()
    where code = v_inc.code;
    v_audit_action := 'Asignación';
  elsif p_action = 'reopen' then
    update app.resolutions set superseded = true where incident_code = v_inc.code;
    update app.closures set superseded = true where incident_code = v_inc.code;
    update app.incidents set status = v_next, updated_at = now() where code = v_inc.code;
    perform app.replace_actas(v_inc.code, 'Incidencia reabierta. Motivo: ' || v_reason);
    v_audit_action := 'Reapertura';
  else
    update app.incidents set status = v_next, updated_at = now() where code = v_inc.code;
    if p_action = 'discard' then
      v_audit_action := 'Descarte';
    end if;
  end if;

  perform app.add_follow_up(v_inc.code, case when p_action = 'assign' then 'Asignación' else 'Cambio de estado' end,
    v_inc.status, v_next, v_obs, v_reason, v_resp.id, v_user.id);
  perform app.log(v_user, v_audit_action, 'Seguimiento', v_inc.code,
    format('%s → %s%s', v_inc.status, v_next,
      case when v_resp.id is not null then '. Responsable: ' || app.full_name(v_resp) else '' end ||
      case when v_reason <> '' then '. Motivo: ' || v_reason else '' end));

  perform app.notify(v_inc.reported_by, v_inc.code, format('Tu incidencia pasó a "%s"', v_next),
                     format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  if p_action = 'assign' then
    perform app.notify(v_resp.id, v_inc.code, 'Se te asignó una incidencia',
                       format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  end if;
  return jsonb_build_object('code', v_inc.code, 'status', v_next);
end;
$$;

-- C4 / D1 opción (a): reasignación solo de incidencias pendientes por desactivación
create or replace function public.reassign_incident(
  p_token text, p_code text, p_responsible uuid, p_reason text
) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
  v_resp app.users;
begin
  perform app.require_action(v_user, v_inc, 'reassign',
    'Solo un Orientador o Administrador puede reasignar incidencias pendientes de reasignación.');
  if trim(coalesce(p_reason, '')) = '' then
    perform app.fail('Debe indicar el motivo de la reasignación.');
  end if;
  select * into v_resp from app.users where id = p_responsible;
  if not found or v_resp.status <> 'Activo' or v_resp.role not in ('Docente', 'Orientador', 'Administrador') then
    perform app.fail('Selecciona un responsable válido: usuario activo con rol Docente, Orientador o Administrador.');
  end if;

  update app.incidents
  set responsible_id = v_resp.id, pending_reassignment = false, updated_at = now()
  where code = v_inc.code;

  perform app.add_follow_up(v_inc.code, 'Reasignación', v_inc.status, v_inc.status,
    'Nuevo responsable: ' || app.full_name(v_resp), p_reason, v_resp.id, v_user.id);
  perform app.log(v_user, 'Reasignación', 'Seguimiento', v_inc.code,
    format('Reasignada a %s. Motivo: %s', app.full_name(v_resp), trim(p_reason)));
  perform app.notify(v_resp.id, v_inc.code, 'Se te reasignó una incidencia',
                     format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  return jsonb_build_object('code', v_inc.code);
end;
$$;

create or replace function public.add_observation(p_token text, p_code text, p_observation text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
begin
  perform app.require_action(v_user, v_inc, 'observe',
    'No se pueden agregar observaciones a incidencias cerradas o descartadas.');
  if trim(coalesce(p_observation, '')) = '' then
    perform app.fail('Escribe la observación.');
  end if;
  if length(p_observation) > 1000 then
    perform app.fail('La observación admite como máximo 1000 caracteres.');
  end if;
  update app.incidents set updated_at = now() where code = v_inc.code;
  perform app.add_follow_up(v_inc.code, 'Observación', v_inc.status, v_inc.status, trim(p_observation), null, null, v_user.id);
  perform app.log(v_user, 'Seguimiento', 'Seguimiento', v_inc.code, 'Agregó una observación.');
  if v_inc.responsible_id is not null then
    perform app.notify(v_inc.responsible_id, v_inc.code, 'Nueva observación en una incidencia asignada',
                       format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  end if;
  perform app.notify(v_inc.reported_by, v_inc.code, 'Nueva observación en tu incidencia',
                     format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  return jsonb_build_object('code', v_inc.code);
end;
$$;

-- RN-005: resolver requiere resumen, acciones, resultado y fecha válida
create or replace function public.resolve_incident(p_token text, p_code text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
  v_date date;
begin
  perform app.require_action(v_user, v_inc, 'resolve',
    'Solo el responsable asignado o un Administrador puede resolver la incidencia, y debe estar En atención.');
  if app.text_field(p_data, 'summary') = '' then
    perform app.fail('Ingresa un resumen de la resolución.');
  end if;
  if app.text_field(p_data, 'actionsTaken') = '' then
    perform app.fail('Describe las acciones realizadas.');
  end if;
  if app.text_field(p_data, 'result') = '' then
    perform app.fail('Describe el resultado de la atención.');
  end if;
  begin
    v_date := (p_data ->> 'resolutionDate')::date;
  exception when others then
    v_date := null;
  end;
  if v_date is null then
    perform app.fail('Selecciona la fecha de resolución.');
  end if;
  if v_date < v_inc.incident_date then
    perform app.fail('La fecha de resolución no puede ser anterior a la fecha del incidente.');
  end if;
  if v_date > (now() at time zone 'America/Lima')::date then
    perform app.fail('La fecha de resolución no puede ser futura.');
  end if;

  insert into app.resolutions (incident_code, summary, actions_taken, result, observations, resolution_date, registered_by)
  values (v_inc.code, app.text_field(p_data, 'summary'), app.text_field(p_data, 'actionsTaken'),
          app.text_field(p_data, 'result'), app.text_field(p_data, 'observations'), v_date, v_user.id);
  update app.incidents set status = 'Resuelto', updated_at = now() where code = v_inc.code;

  perform app.add_follow_up(v_inc.code, 'Cambio de estado', v_inc.status, 'Resuelto',
    'Resolución registrada: ' || app.text_field(p_data, 'summary'), null, null, v_user.id);
  perform app.log(v_user, 'Resolución', 'Resolución', v_inc.code, 'En atención → Resuelto.');
  perform app.emit_acta(v_inc.code, 'Provisional', v_user.id);
  perform app.notify(v_inc.reported_by, v_inc.code, 'Tu incidencia fue resuelta',
                     format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  perform app.notify_managers(v_inc.code, 'Incidencia lista para cierre',
                              format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  return jsonb_build_object('code', v_inc.code, 'status', 'Resuelto');
end;
$$;

-- RN-006: cerrar requiere resolución registrada, confirmación y rol autorizado
create or replace function public.close_incident(
  p_token text, p_code text, p_observations text, p_confirm boolean
) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
begin
  perform app.require_action(v_user, v_inc, 'close',
    'Solo un Orientador o Administrador puede cerrar incidencias, y deben estar en estado Resuelto.');
  if not exists (select 1 from app.resolutions where incident_code = v_inc.code and not superseded) then
    perform app.fail('La incidencia no tiene una resolución registrada.');
  end if;
  if not coalesce(p_confirm, false) then
    perform app.fail('Confirma que la información es suficiente para cerrar.');
  end if;

  insert into app.closures (incident_code, observations, closed_by)
  values (v_inc.code, trim(coalesce(p_observations, '')), v_user.id);
  update app.incidents set status = 'Cerrado', updated_at = now() where code = v_inc.code;

  perform app.add_follow_up(v_inc.code, 'Cambio de estado', v_inc.status, 'Cerrado',
    coalesce(nullif(trim(coalesce(p_observations, '')), ''), 'Incidencia cerrada tras confirmar la resolución.'),
    null, null, v_user.id);
  perform app.log(v_user, 'Cierre', 'Cierre', v_inc.code, 'Resuelto → Cerrado.');
  perform app.emit_acta(v_inc.code, 'Definitiva', v_user.id, 'Reemplazada por el acta definitiva tras el cierre.');
  perform app.notify(v_inc.reported_by, v_inc.code, 'Tu incidencia fue cerrada: el acta de resolución está disponible',
                     format('%s: %s', v_inc.code, v_inc.title), v_user.id);
  return jsonb_build_object('code', v_inc.code, 'status', 'Cerrado');
end;
$$;

create or replace function public.list_assignable_users(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  if not app.is_manager(v_user) then
    perform app.forbidden();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', u.id, 'fullName', app.full_name(u), 'role', u.role, 'email', u.email)
                     order by u.role, u.apellidos)
    from app.users u
    where u.status = 'Activo' and u.role in ('Docente', 'Orientador', 'Administrador')
  ), '[]'::jsonb);
end;
$$;

-- =====================================================================
-- RPC: Evidencias (subida en partes base64 de hasta 512 KB)
-- =====================================================================
create or replace function public.evidence_begin(p_token text, p_code text, p_meta jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_inc app.incidents := app.get_incident_for(v_user, p_code);
  v_id bigint;
  v_mime text := app.text_field(p_meta, 'mimeType');
begin
  perform app.require_action(v_user, v_inc, 'evidence',
    'No se pueden agregar evidencias a incidencias cerradas o descartadas.');
  if (select count(*) from app.evidences where incident_code = v_inc.code and status = 'Activa') >= 10 then
    perform app.fail('La incidencia ya tiene el máximo de 10 evidencias activas.');
  end if;
  if v_mime not in ('application/pdf', 'image/jpeg', 'image/png',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document') then
    perform app.fail('Tipo de archivo no permitido. Usa PDF, JPG, PNG o DOCX.');
  end if;
  if app.text_field(p_meta, 'description') = '' then
    perform app.fail('Describe la evidencia.');
  end if;
  if coalesce((p_meta ->> 'sizeBytes')::bigint, 0) > 10485760 then
    perform app.fail('El archivo supera el tamaño máximo de 10 MB.');
  end if;

  insert into app.evidences (incident_code, file_name, mime_type, original_size_bytes, compressed,
                             evidence_type, description, uploaded_by)
  values (v_inc.code, left(app.text_field(p_meta, 'fileName'), 200), v_mime,
          coalesce((p_meta ->> 'originalSizeBytes')::int, 0),
          coalesce((p_meta ->> 'compressed')::boolean, false),
          app.text_field(p_meta, 'evidenceType'), app.text_field(p_meta, 'description'), v_user.id)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.evidence_chunk(p_token text, p_id bigint, p_idx integer, p_data text) returns void
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_ev app.evidences;
  v_bytes bytea;
begin
  select * into v_ev from app.evidences where id = p_id;
  if not found or v_ev.uploaded_by <> v_user.id or v_ev.status <> 'Pendiente' then
    perform app.not_found('La carga de evidencia no existe o ya finalizó.');
  end if;
  if length(coalesce(p_data, '')) = 0 or length(p_data) > 700000 then
    perform app.fail('Parte de archivo inválida.');
  end if;
  begin
    v_bytes := decode(p_data, 'base64');
  exception when others then
    perform app.fail('Parte de archivo con codificación inválida.');
  end;
  insert into app.evidence_chunks (evidence_id, idx, data, byte_length)
  values (p_id, p_idx, p_data, octet_length(v_bytes))
  on conflict (evidence_id, idx) do update set data = excluded.data, byte_length = excluded.byte_length;
end;
$$;

create or replace function public.evidence_finish(p_token text, p_id bigint) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_ev app.evidences;
  v_size bigint;
  v_head bytea;
  v_ok boolean;
begin
  select * into v_ev from app.evidences where id = p_id for update;
  if not found or v_ev.uploaded_by <> v_user.id or v_ev.status <> 'Pendiente' then
    perform app.not_found('La carga de evidencia no existe o ya finalizó.');
  end if;

  select coalesce(sum(byte_length), 0) into v_size from app.evidence_chunks where evidence_id = p_id;
  if v_size = 0 then
    perform app.fail('El archivo está vacío.');
  end if;
  if v_size > 10485760 then
    delete from app.evidences where id = p_id;
    perform app.fail('El archivo supera el tamaño máximo de 10 MB.');
  end if;
  if (select count(*) from app.evidence_chunks where evidence_id = p_id)
     <> (select max(idx) + 1 from app.evidence_chunks where evidence_id = p_id) then
    perform app.fail('La carga del archivo está incompleta. Intenta nuevamente.');
  end if;

  -- Verifica la firma real del archivo (no solo la extensión)
  select substring(decode(data, 'base64') from 1 for 8) into v_head
  from app.evidence_chunks where evidence_id = p_id and idx = 0;
  v_ok := case v_ev.mime_type
    when 'application/pdf' then substring(v_head from 1 for 4) = '\x25504446'::bytea
    when 'image/png' then substring(v_head from 1 for 8) = '\x89504e470d0a1a0a'::bytea
    when 'image/jpeg' then substring(v_head from 1 for 3) = '\xffd8ff'::bytea
    else substring(v_head from 1 for 4) = '\x504b0304'::bytea
  end;
  if not v_ok then
    delete from app.evidences where id = p_id;
    perform app.fail('El contenido del archivo no coincide con su tipo. Verifica que no esté dañado.');
  end if;

  update app.evidences set status = 'Activa', size_bytes = v_size where id = p_id;
  update app.incidents set updated_at = now() where code = v_ev.incident_code;
  perform app.add_follow_up(v_ev.incident_code, 'Evidencia',
    (select status from app.incidents where code = v_ev.incident_code),
    (select status from app.incidents where code = v_ev.incident_code),
    'Evidencia agregada: ' || v_ev.file_name, null, null, v_user.id);
  perform app.log(v_user, 'Registro de evidencia', 'Evidencias', v_ev.incident_code,
    format('Agregó "%s" (%s bytes%s).', v_ev.file_name, v_size,
           case when v_ev.compressed then ', comprimida' else '' end));
  return jsonb_build_object('id', p_id, 'sizeBytes', v_size);
end;
$$;

create or replace function public.evidence_chunk_get(p_token text, p_id bigint, p_idx integer) returns text
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_ev app.evidences;
  v_data text;
begin
  select * into v_ev from app.evidences where id = p_id and status <> 'Pendiente';
  if not found then
    perform app.not_found('Evidencia no encontrada.');
  end if;
  perform app.get_incident_for(v_user, v_ev.incident_code);
  select data into v_data from app.evidence_chunks where evidence_id = p_id and idx = p_idx;
  if v_data is null then
    perform app.not_found('Parte de archivo no encontrada.');
  end if;
  return v_data;
end;
$$;

-- E3: las evidencias no se borran; se anulan con motivo (RN-009)
create or replace function public.evidence_void(p_token text, p_id bigint, p_reason text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_ev app.evidences;
  v_inc app.incidents;
begin
  select * into v_ev from app.evidences where id = p_id and status = 'Activa' for update;
  if not found then
    perform app.not_found('Evidencia no encontrada o ya anulada.');
  end if;
  v_inc := app.get_incident_for(v_user, v_ev.incident_code);
  if not (app.is_manager(v_user)
          or (v_ev.uploaded_by = v_user.id and v_inc.status not in ('Cerrado', 'Descartado'))) then
    perform app.forbidden('Solo quien subió la evidencia o un gestor puede anularla.');
  end if;
  if trim(coalesce(p_reason, '')) = '' then
    perform app.fail('Debe indicar el motivo de la anulación.');
  end if;

  update app.evidences
  set status = 'Anulada', void_reason = trim(p_reason), voided_by = v_user.id, voided_at = now()
  where id = p_id;
  perform app.add_follow_up(v_inc.code, 'Evidencia', v_inc.status, v_inc.status,
    'Evidencia anulada: ' || v_ev.file_name, p_reason, null, v_user.id);
  perform app.log(v_user, 'Anulación de evidencia', 'Evidencias', v_inc.code,
    format('Anuló "%s". Motivo: %s', v_ev.file_name, trim(p_reason)));
  return jsonb_build_object('id', p_id);
end;
$$;

-- =====================================================================
-- RPC: Usuarios (solo Administrador)
-- =====================================================================
create or replace function app.require_admin(u app.users) returns void
language plpgsql as $$
begin
  if u.role <> 'Administrador' then
    perform app.forbidden('Solo un Administrador puede gestionar usuarios.');
  end if;
end;
$$;

create or replace function app.validate_user_data(p_data jsonb) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
begin
  if app.text_field(p_data, 'dni') !~ '^[0-9]{8}$' then
    perform app.fail('El DNI debe tener 8 dígitos.');
  end if;
  if app.text_field(p_data, 'nombres') = '' then
    perform app.fail('Ingresa los nombres.');
  end if;
  if app.text_field(p_data, 'apellidos') = '' then
    perform app.fail('Ingresa los apellidos.');
  end if;
  if app.text_field(p_data, 'email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    perform app.fail('Ingresa un correo electrónico válido.');
  end if;
  if app.text_field(p_data, 'role') not in ('Estudiante', 'Docente', 'Orientador', 'Administrador') then
    perform app.fail('Selecciona un rol válido.');
  end if;
end;
$$;

create or replace function public.list_users(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  perform app.require_admin(v_user);
  return coalesce((
    select jsonb_agg(app.user_json(u) || jsonb_build_object(
      'activeAssignments', (select count(*) from app.incidents i
                            where i.responsible_id = u.id and i.status in ('Asignado', 'En atención')),
      'isLocked', coalesce(u.locked_until > now(), false))
      order by u.created_at)
    from app.users u
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_user(p_token text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_admin app.users := app.session_user(p_token);
  v_new app.users;
begin
  perform app.require_admin(v_admin);
  perform app.validate_user_data(p_data);
  perform app.validate_password(p_data ->> 'password');
  if exists (select 1 from app.users where dni = app.text_field(p_data, 'dni')) then
    perform app.fail('Ya existe un usuario con ese DNI.');
  end if;

  insert into app.users (dni, nombres, apellidos, email, role, password_hash, must_change_password)
  values (app.text_field(p_data, 'dni'), app.text_field(p_data, 'nombres'), app.text_field(p_data, 'apellidos'),
          lower(app.text_field(p_data, 'email')), app.text_field(p_data, 'role'),
          extensions.crypt(p_data ->> 'password', extensions.gen_salt('bf')), true)
  returning * into v_new;

  perform app.log(v_admin, 'Creación de usuario', 'Usuarios', v_new.code,
    format('Creó a %s (%s) con rol %s.', app.full_name(v_new), v_new.dni, v_new.role));
  return app.user_json(v_new);
end;
$$;

create or replace function public.update_user(p_token text, p_id uuid, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_admin app.users := app.session_user(p_token);
  v_old app.users;
  v_new app.users;
begin
  perform app.require_admin(v_admin);
  select * into v_old from app.users where id = p_id for update;
  if not found then
    perform app.not_found('Usuario no encontrado.');
  end if;
  perform app.validate_user_data(p_data);
  if exists (select 1 from app.users where dni = app.text_field(p_data, 'dni') and id <> p_id) then
    perform app.fail('Ya existe un usuario con ese DNI.');
  end if;
  if v_old.id = v_admin.id and app.text_field(p_data, 'role') <> v_old.role then
    perform app.fail('No puedes cambiar tu propio rol.');
  end if;
  if v_old.role = 'Administrador' and app.text_field(p_data, 'role') <> 'Administrador'
     and v_old.status = 'Activo'
     and (select count(*) from app.users where role = 'Administrador' and status = 'Activo') <= 1 then
    perform app.fail('Debe existir al menos un Administrador activo.');
  end if;

  update app.users set
    dni = app.text_field(p_data, 'dni'),
    nombres = app.text_field(p_data, 'nombres'),
    apellidos = app.text_field(p_data, 'apellidos'),
    email = lower(app.text_field(p_data, 'email')),
    role = app.text_field(p_data, 'role'),
    updated_at = now()
  where id = p_id
  returning * into v_new;

  if v_new.role <> v_old.role then
    perform app.log(v_admin, 'Cambio de rol', 'Usuarios', v_new.code,
      format('%s: %s → %s.', app.full_name(v_new), v_old.role, v_new.role));
    -- Si deja de ser elegible como responsable, sus casos quedan pendientes de reasignación
    if v_new.role = 'Estudiante' then
      update app.incidents set pending_reassignment = true, updated_at = now()
      where responsible_id = v_new.id and status in ('Asignado', 'En atención');
    end if;
  end if;
  perform app.log(v_admin, 'Actualización de usuario', 'Usuarios', v_new.code,
    format('Actualizó los datos de %s.', app.full_name(v_new)));
  return app.user_json(v_new);
end;
$$;

-- C4: al desactivar, sus incidencias activas quedan "pendientes de reasignación"
create or replace function public.set_user_status(p_token text, p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_admin app.users := app.session_user(p_token);
  v_user app.users;
  v_pending integer := 0;
  r record;
begin
  perform app.require_admin(v_admin);
  if p_status not in ('Activo', 'Inactivo') then
    perform app.fail('Estado no válido.');
  end if;
  select * into v_user from app.users where id = p_id for update;
  if not found then
    perform app.not_found('Usuario no encontrado.');
  end if;
  if v_user.status = p_status then
    perform app.fail(format('El usuario ya está %s.', lower(p_status)));
  end if;
  if p_status = 'Inactivo' and v_user.id = v_admin.id then
    perform app.fail('No puedes desactivar tu propia cuenta.');
  end if;
  if p_status = 'Inactivo' and v_user.role = 'Administrador'
     and (select count(*) from app.users where role = 'Administrador' and status = 'Activo') <= 1 then
    perform app.fail('Debe existir al menos un Administrador activo.');
  end if;

  update app.users set status = p_status, failed_attempts = 0, locked_until = null, updated_at = now()
  where id = p_id returning * into v_user;

  if p_status = 'Inactivo' then
    delete from app.sessions where user_id = v_user.id;
    for r in
      update app.incidents set pending_reassignment = true, updated_at = now()
      where responsible_id = v_user.id and status in ('Asignado', 'En atención')
      returning code, title
    loop
      v_pending := v_pending + 1;
      perform app.notify_managers(r.code, 'Incidencia pendiente de reasignación',
        format('%s: %s (responsable desactivado)', r.code, r.title), null);
    end loop;
    perform app.log(v_admin, 'Desactivación de usuario', 'Usuarios', v_user.code,
      format('Desactivó a %s. Incidencias pendientes de reasignación: %s.', app.full_name(v_user), v_pending));
  else
    perform app.log(v_admin, 'Activación de usuario', 'Usuarios', v_user.code,
      format('Activó a %s.', app.full_name(v_user)));
  end if;
  return app.user_json(v_user) || jsonb_build_object('pendingReassignments', v_pending);
end;
$$;

-- B4: sin recuperación por correo; el Administrador restablece la clave
create or replace function public.reset_user_password(p_token text, p_id uuid, p_new_password text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_admin app.users := app.session_user(p_token);
  v_user app.users;
begin
  perform app.require_admin(v_admin);
  perform app.validate_password(p_new_password);
  update app.users
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      must_change_password = true, failed_attempts = 0, locked_until = null, updated_at = now()
  where id = p_id returning * into v_user;
  if v_user.id is null then
    perform app.not_found('Usuario no encontrado.');
  end if;
  delete from app.sessions where user_id = v_user.id;
  perform app.log(v_admin, 'Restablecimiento de contraseña', 'Usuarios', v_user.code,
    format('Restableció la contraseña de %s.', app.full_name(v_user)));
  return app.user_json(v_user);
end;
$$;

-- =====================================================================
-- RPC: Auditoría (solo Administrador)
-- =====================================================================
create or replace function public.list_audit(p_token text, p_limit integer default 2000) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  if v_user.role <> 'Administrador' then
    perform app.forbidden('Solo un Administrador puede consultar la auditoría.');
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'timestamp', a.created_at, 'userId', a.user_id, 'userName', a.user_label,
      'dni', a.dni, 'action', a.action, 'module', a.module,
      'entityId', a.entity_id, 'description', a.description) order by a.created_at desc, a.id desc)
    from (select * from app.audit_logs order by created_at desc, id desc
          limit least(greatest(coalesce(p_limit, 2000), 1), 5000)) a
  ), '[]'::jsonb);
end;
$$;

-- =====================================================================
-- RPC: Notificaciones
-- =====================================================================
create or replace function public.list_notifications(p_token text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  return jsonb_build_object(
    'unread', (select count(*) from app.notifications where user_id = v_user.id and read_at is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'incidentCode', n.incident_code, 'title', n.title, 'body', n.body,
        'read', n.read_at is not null, 'createdAt', n.created_at) order by n.created_at desc, n.id desc)
      from (select * from app.notifications where user_id = v_user.id
            order by created_at desc, id desc limit 30) n
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.mark_notifications_read(p_token text, p_ids bigint[] default null) returns void
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
begin
  update app.notifications set read_at = now()
  where user_id = v_user.id and read_at is null and (p_ids is null or id = any (p_ids));
end;
$$;

-- =====================================================================
-- Actas de resolución (RN-011)
-- =====================================================================

-- DNI parcialmente oculto para documentos impresos: 70****07
create or replace function app.mask_dni(p_dni text) returns text
language sql immutable as $$
  select case when p_dni is null then null else left(p_dni, 2) || '****' || right(p_dni, 2) end;
$$;

create or replace function app.person_json(p_id uuid) returns jsonb
language sql stable set search_path = app, extensions, pg_temp as $$
  select case when u.id is null then null else jsonb_build_object(
    'fullName', u.nombres || ' ' || u.apellidos, 'role', u.role, 'dni', app.mask_dni(u.dni)
  ) end
  from (select 1) d left join app.users u on u.id = p_id;
$$;

-- Contenido completo del acta: todo lo documentado sobre la incidencia
create or replace function app.acta_content(p_code text, p_kind text) returns jsonb
language plpgsql stable set search_path = app, extensions, pg_temp as $$
declare
  i app.incidents;
  v_res app.resolutions;
  v_clo app.closures;
begin
  select * into i from app.incidents where code = p_code;
  select * into v_res from app.resolutions where incident_code = p_code and not superseded order by id desc limit 1;
  select * into v_clo from app.closures where incident_code = p_code and not superseded order by id desc limit 1;

  return jsonb_build_object(
    'kind', p_kind,
    'incident', jsonb_build_object(
      'code', i.code, 'title', i.title, 'description', i.description,
      'category', i.category, 'priority', i.priority, 'status', i.status,
      'incidentDate', i.incident_date, 'location', i.location,
      'involvedPeople', i.involved_people, 'observations', i.observations,
      'registeredAt', i.registered_at),
    'reporter', app.person_json(i.reported_by),
    'responsible', app.person_json(i.responsible_id),
    'followUps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', f.kind, 'previousStatus', f.previous_status, 'newStatus', f.new_status,
        'observation', f.observation, 'reason', f.reason,
        'responsible', app.person_json(f.responsible_id),
        'user', app.person_json(f.user_id), 'createdAt', f.created_at
      ) order by f.created_at, f.id)
      from app.follow_ups f where f.incident_code = p_code), '[]'::jsonb),
    'evidences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fileName', e.file_name, 'mimeType', e.mime_type, 'sizeBytes', e.size_bytes,
        'evidenceType', e.evidence_type, 'description', e.description, 'status', e.status,
        'voidReason', e.void_reason, 'voidedAt', e.voided_at,
        'uploadedBy', app.person_json(e.uploaded_by), 'uploadedAt', e.uploaded_at
      ) order by e.uploaded_at, e.id)
      from app.evidences e where e.incident_code = p_code and e.status <> 'Pendiente'), '[]'::jsonb),
    'resolution', case when v_res.id is null then null else jsonb_build_object(
      'summary', v_res.summary, 'actionsTaken', v_res.actions_taken, 'result', v_res.result,
      'observations', v_res.observations, 'resolutionDate', v_res.resolution_date,
      'registeredBy', app.person_json(v_res.registered_by), 'registeredAt', v_res.registered_at) end,
    'closure', case when v_clo.id is null then null else jsonb_build_object(
      'observations', v_clo.observations, 'closedBy', app.person_json(v_clo.closed_by),
      'closedAt', v_clo.closed_at) end,
    'metrics', jsonb_build_object(
      'hoursToResolve', case when v_res.id is null then null
        else round(extract(epoch from (v_res.registered_at - i.registered_at)) / 3600.0, 1) end,
      'hoursToClose', case when v_clo.id is null then null
        else round(extract(epoch from (v_clo.closed_at - i.registered_at)) / 3600.0, 1) end)
  );
end;
$$;

-- Emite una nueva acta y marca como reemplazadas las anteriores vigentes
create or replace function app.emit_acta(
  p_code text, p_kind text, p_user uuid, p_reason text default null, p_at timestamptz default now()
) returns app.actas
language plpgsql set search_path = app, extensions, pg_temp as $$
declare
  v_seq integer;
  v_content jsonb := app.acta_content(p_code, p_kind);
  v_hash text;
  v_acta app.actas;
  v_user app.users;
begin
  update app.actas
  set status = 'Reemplazada', replaced_at = p_at,
      replaced_reason = coalesce(p_reason, 'Reemplazada por una nueva versión del acta.')
  where incident_code = p_code and status = 'Vigente';

  select coalesce(max(seq), 0) + 1 into v_seq from app.actas where incident_code = p_code;
  v_hash := encode(extensions.digest(v_content::text, 'sha256'), 'hex');

  insert into app.actas (number, incident_code, seq, kind, content, content_hash, verification_code, issued_by, issued_at)
  values (
    'ACT-' || substr(p_code, 4) || '-' || lpad(v_seq::text, 2, '0'),
    p_code, v_seq, p_kind, v_content, v_hash,
    -- Código de verificación: 16 caracteres derivados de la huella + aleatorio (no adivinable)
    upper(regexp_replace(substr(encode(extensions.digest(v_hash || encode(extensions.gen_random_bytes(16), 'hex'), 'sha256'), 'hex'), 1, 16),
                         '(.{4})(?!$)', '\1-', 'g')),
    p_user, p_at)
  returning * into v_acta;

  select * into v_user from app.users where id = p_user;
  perform app.log(v_user, 'Emisión de acta', 'Actas', p_code,
    format('Acta %s (%s) emitida. Huella SHA-256: %s…', v_acta.number, p_kind, left(v_hash, 16)));
  return v_acta;
end;
$$;

-- Marca las actas vigentes como reemplazadas (reapertura)
create or replace function app.replace_actas(p_code text, p_reason text) returns void
language plpgsql set search_path = app, extensions, pg_temp as $$
begin
  update app.actas set status = 'Reemplazada', replaced_at = now(), replaced_reason = p_reason
  where incident_code = p_code and status = 'Vigente';
end;
$$;

create or replace function app.acta_meta_json(a app.actas) returns jsonb
language sql stable set search_path = app, extensions, pg_temp as $$
  select jsonb_build_object(
    'number', a.number, 'seq', a.seq, 'kind', a.kind, 'status', a.status,
    'issuedAt', a.issued_at, 'issuedBy', app.person_json(a.issued_by),
    'replacedAt', a.replaced_at, 'replacedReason', a.replaced_reason,
    'verificationCode', a.verification_code);
$$;

-- Versión resumida para el Estudiante: sin observaciones internas ni nombres de terceros
create or replace function app.acta_summary_content(c jsonb) returns jsonb
language sql immutable as $$
  select c
    || jsonb_build_object('incident', (c -> 'incident') - 'involvedPeople' - 'observations')
    || jsonb_build_object('followUps', coalesce((
         select jsonb_agg(jsonb_build_object(
           'kind', f -> 'kind', 'previousStatus', f -> 'previousStatus', 'newStatus', f -> 'newStatus',
           'createdAt', f -> 'createdAt', 'user', jsonb_build_object('role', f -> 'user' -> 'role')))
         from jsonb_array_elements(c -> 'followUps') f), '[]'::jsonb))
    || jsonb_build_object('evidences', coalesce((
         select jsonb_agg(jsonb_build_object(
           'fileName', e -> 'fileName', 'evidenceType', e -> 'evidenceType', 'status', e -> 'status',
           'uploadedAt', e -> 'uploadedAt'))
         from jsonb_array_elements(c -> 'evidences') e), '[]'::jsonb))
    || jsonb_build_object('resolution', case when c -> 'resolution' = 'null'::jsonb then 'null'::jsonb
         else (c -> 'resolution') - 'observations' end)
    || jsonb_build_object('closure', case when c -> 'closure' = 'null'::jsonb then 'null'::jsonb
         else (c -> 'closure') - 'observations' end);
$$;

create or replace function public.get_acta(p_token text, p_number text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_user app.users := app.session_user(p_token);
  v_acta app.actas;
  v_summary boolean;
begin
  select * into v_acta from app.actas where number = upper(trim(coalesce(p_number, '')));
  if not found then
    perform app.not_found('No encontramos el acta solicitada o no tienes acceso a ella.');
  end if;
  perform app.get_incident_for(v_user, v_acta.incident_code); -- valida acceso (RN-010)

  v_summary := v_user.role = 'Estudiante';
  perform app.log(v_user, 'Consulta de acta', 'Actas', v_acta.incident_code,
    format('Consultó el acta %s (%s).', v_acta.number, case when v_summary then 'versión resumida' else 'versión completa' end));

  return app.acta_meta_json(v_acta) || jsonb_build_object(
    'incidentCode', v_acta.incident_code,
    'contentHash', v_acta.content_hash,
    'version', case when v_summary then 'Resumida' else 'Completa' end,
    'content', case when v_summary then app.acta_summary_content(v_acta.content) else v_acta.content end);
end;
$$;

-- Verificación pública (sin sesión): confirma que un acta impresa es auténtica, sin exponer datos personales
create or replace function public.verify_acta(p_code text) returns jsonb
language plpgsql security definer set search_path = app, extensions, pg_temp as $$
declare
  v_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g'));
  v_acta app.actas;
  v_newer text;
begin
  if length(v_norm) <> 16 then
    return jsonb_build_object('valid', false, 'message', 'El código debe tener 16 caracteres (por ejemplo 1A2B-3C4D-5E6F-7A8B).');
  end if;
  select * into v_acta from app.actas
  where verification_code = regexp_replace(v_norm, '(.{4})(?!$)', '\1-', 'g');
  if not found then
    return jsonb_build_object('valid', false, 'message', 'No existe un acta con ese código de verificación.');
  end if;
  select number into v_newer from app.actas
  where incident_code = v_acta.incident_code and status = 'Vigente' and number <> v_acta.number;

  insert into app.audit_logs (user_label, action, module, entity_id, description)
  values ('Verificación pública', 'Verificación de acta', 'Actas', v_acta.incident_code,
          format('Se verificó el acta %s.', v_acta.number));

  return jsonb_build_object(
    'valid', true,
    'number', v_acta.number,
    'incidentCode', v_acta.incident_code,
    'kind', v_acta.kind,
    'status', v_acta.status,
    'issuedAt', v_acta.issued_at,
    'category', v_acta.content -> 'incident' ->> 'category',
    'resolutionDate', v_acta.content -> 'resolution' ->> 'resolutionDate',
    'closedAt', v_acta.content -> 'closure' ->> 'closedAt',
    'replacedAt', v_acta.replaced_at,
    'replacedReason', v_acta.replaced_reason,
    'currentNumber', v_newer,
    'hashPrefix', left(v_acta.content_hash, 16));
end;
$$;

-- Genera las actas que falten para incidencias ya resueltas o cerradas (instalaciones existentes y datos demo)
create or replace function app.backfill_actas() returns integer
language plpgsql set search_path = app, extensions, pg_temp as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select i.code, i.status, res.registered_by, res.registered_at, clo.closed_by, clo.closed_at
    from app.incidents i
    join lateral (select * from app.resolutions x where x.incident_code = i.code and not x.superseded
                  order by x.id desc limit 1) res on true
    left join lateral (select * from app.closures x where x.incident_code = i.code and not x.superseded
                       order by x.id desc limit 1) clo on true
    where i.status in ('Resuelto', 'Cerrado')
      and not exists (select 1 from app.actas a where a.incident_code = i.code)
    order by i.code
  loop
    perform app.emit_acta(r.code, 'Provisional', r.registered_by, null, r.registered_at);
    v_count := v_count + 1;
    if r.status = 'Cerrado' and r.closed_by is not null then
      perform app.emit_acta(r.code, 'Definitiva', r.closed_by, 'Reemplazada por el acta definitiva tras el cierre.', r.closed_at);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- =====================================================================
-- Permisos de ejecución: solo las RPC públicas son invocables
-- =====================================================================
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
  loop
    execute format('revoke all on function %s from public', r.sig);
  end loop;
end;
$$;

do $$
declare
  fn text;
  r record;
begin
  foreach fn in array array[
    'login', 'logout', 'me', 'change_password',
    'list_incidents', 'get_incident', 'create_incident', 'update_incident',
    'transition_incident', 'reassign_incident', 'add_observation',
    'resolve_incident', 'close_incident', 'list_assignable_users',
    'evidence_begin', 'evidence_chunk', 'evidence_finish', 'evidence_chunk_get', 'evidence_void',
    'list_users', 'create_user', 'update_user', 'set_user_status', 'reset_user_password',
    'list_audit', 'list_notifications', 'mark_notifications_read',
    'get_acta', 'verify_acta'
  ] loop
    for r in
      select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = fn
    loop
      execute format('revoke all on function %s from public', r.sig);
      if exists (select 1 from pg_roles where rolname = 'anon') then
        execute format('grant execute on function %s to anon', r.sig);
      end if;
      if exists (select 1 from pg_roles where rolname = 'authenticated') then
        execute format('grant execute on function %s to authenticated', r.sig);
      end if;
    end loop;
  end loop;
end;
$$;

-- Actas faltantes de incidencias ya resueltas o cerradas (idempotente)
select app.backfill_actas();
