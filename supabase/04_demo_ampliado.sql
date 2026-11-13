-- =====================================================================
-- EduResuelve — 04_demo_ampliado.sql  (OPCIONAL)
-- Agrega 40 incidencias SIMULADAS para que el panel de calidad tenga
-- resultados representativos: historial completo, resoluciones, cierres,
-- actas, encuestas y auditoría. NO borra ni modifica datos existentes.
--
-- · Se ejecuta una sola vez: si ya se cargó, no hace nada.
-- · Requiere 01, 02 y 03 (usa los usuarios demo).
-- · Los códigos se toman del contador normal (continúan después de los
--   existentes). El rango cargado queda registrado en la auditoría como
--   "Carga de datos de demostración" para declararlo en el informe.
-- · No genera mediciones de tiempos de respuesta: esas deben ser reales.
-- · Es determinista (misma semilla → mismos datos).
-- =====================================================================

do $$
declare
  -- Usuarios demo (03_seed.sql)
  u_alicia  constant uuid := '00000000-0000-4000-a000-000000000001'; -- Estudiante
  u_bruno   constant uuid := '00000000-0000-4000-a000-000000000002'; -- Estudiante
  u_camila  constant uuid := '00000000-0000-4000-a000-000000000003'; -- Docente
  u_damian  constant uuid := '00000000-0000-4000-a000-000000000004'; -- Docente (inactivo)
  u_estela  constant uuid := '00000000-0000-4000-a000-000000000005'; -- Orientadora
  u_fabian  constant uuid := '00000000-0000-4000-a000-000000000006'; -- Orientador
  u_greta   constant uuid := '00000000-0000-4000-a000-000000000007'; -- Administradora

  -- Estado final de cada una de las 40 incidencias (orden fijo)
  plan text[] := array[
    'Cerrado','Cerrado','Resuelto','Cerrado','En atención','Cerrado','Asignado','Cerrado','Cerrado','En revisión',
    'Cerrado','Resuelto','Cerrado','Descartado','Cerrado','En atención','Cerrado','Cerrado','Nuevo','Cerrado',
    'Resuelto','Cerrado','Asignado','Cerrado','Cerrado','En atención','Cerrado','Resuelto','Cerrado','En revisión',
    'Cerrado','Cerrado','Descartado','Resuelto','Cerrado','En atención','Asignado','Cerrado','Resuelto','En atención'];
  priorities text[] := array['Media','Alta','Baja','Media','Crítica','Alta','Media','Baja','Alta','Media'];
  categories text[] := array['Convivencia','Académica','Infraestructura','Orientación','Administrativa'];

  titles text[] := array[
    -- Convivencia
    'Discusión entre estudiantes en el recreo', 'Uso de lenguaje ofensivo en el aula', 'Conflicto en el grupo de trabajo',
    'Burlas reiteradas a un compañero', 'Daño a útiles de un compañero', 'Exclusión en actividades de grupo',
    'Empujones en la fila de ingreso', 'Mensajes ofensivos en el grupo del salón',
    -- Académica
    'Bajo rendimiento en matemáticas', 'Inasistencias reiteradas a clases', 'Dificultad para entregar tareas',
    'Solicitud de reforzamiento en lectura', 'Copia en evaluación parcial', 'Desmotivación en el curso de ciencias',
    'Necesidad de adaptación curricular', 'Retraso en notas del bimestre',
    -- Infraestructura
    'Luminaria averiada en el pasillo', 'Puerta del baño sin seguro', 'Proyector del aula sin funcionar',
    'Filtración en el techo del laboratorio', 'Carpetas rotas en el salón', 'Falla eléctrica en el aula de cómputo',
    'Caño con fuga en el patio', 'Ventana con vidrio rajado',
    -- Orientación
    'Solicitud de orientación vocacional', 'Estudiante con ansiedad antes de exámenes', 'Acompañamiento por duelo familiar',
    'Dificultades de adaptación al colegio', 'Orientación a la familia sobre hábitos de estudio', 'Estudiante aislado en el recreo',
    'Seguimiento por cambios de conducta', 'Solicitud de taller de autoestima',
    -- Administrativa
    'Corrección de datos en la matrícula', 'Constancia de estudios pendiente', 'Error en el registro de asistencia',
    'Solicitud de cambio de sección', 'Actualización de contacto de apoderado', 'Pago registrado dos veces',
    'Certificado con nombre mal escrito', 'Traslado de expediente pendiente'];
  locations text[] := array['Aula 1A','Aula 2B','Aula 3C','Patio central','Laboratorio','Biblioteca','Aula de cómputo',
                            'Oficina de orientación','Secretaría','Pasillo del segundo piso'];
  involved text[] := array['Estudiantes de 1.° A','Estudiantes de 2.° B','Estudiante de 3.° C y su familia',
                           'Docente del curso y estudiantes','Personal de mantenimiento','Apoderado del estudiante',
                           'Grupo de trabajo de 4.° A','Estudiantes de 5.° B'];

  resp_summary text[] := array[
    'Se realizó una mediación y se acordaron normas de convivencia.',
    'Se aplicó un plan de reforzamiento académico.',
    'Se realizó la reparación y se verificó el funcionamiento.',
    'Se brindó acompañamiento y orientación personalizada.',
    'Se corrigió el registro y se entregó la documentación.'];
  resp_actions text[] := array[
    'Entrevistas individuales, sesión de mediación y comunicación con las familias.',
    'Reunión con el docente, horario de reforzamiento y seguimiento semanal.',
    'Inspección, compra de repuestos y reparación por el equipo de mantenimiento.',
    'Sesiones con orientación, coordinación con la familia y plan de seguimiento.',
    'Revisión de documentos, corrección en el sistema y entrega al interesado.'];
  resp_result text[] := array[
    'Las partes cumplen los acuerdos; no se reportaron nuevos incidentes.',
    'El estudiante mejoró su participación y entrega de tareas.',
    'El espacio quedó operativo y seguro.',
    'El estudiante y su familia cuentan con pautas de apoyo.',
    'La información quedó corregida y verificada.'];
  comments text[] := array['', 'Me atendieron con amabilidad.', '', 'Todo bien, gracias.', 'Pudo ser más rápido.',
                           '', 'Explicaron claramente los pasos.', '', 'Hubo que insistir varias veces.', ''];

  targets constant integer[] := array[24, 72, 168, 360]; -- Crítica, Alta, Media, Baja
  managers uuid[];
  reporters uuid[];
  responsibles uuid[];

  k integer;
  v_status text; v_priority text; v_category text; cat_idx integer;
  v_code text; v_number integer;
  v_reporter uuid; v_responsible uuid; v_manager uuid; v_closer uuid;
  v_reg timestamptz; t timestamptz; t_res timestamptz; t_clo timestamptz;
  v_target integer; v_factor numeric; v_hours numeric;
  v_closure_id bigint; v_rating integer; v_resolved text;
  v_first text; v_last text;
  v_count integer := 0;
begin
  if exists (select 1 from app.audit_logs where action = 'Carga de datos de demostración') then
    raise notice 'Los datos de demostración ampliados ya estaban cargados. No se hizo nada.';
    return;
  end if;
  if (select count(*) from app.users where id in (u_alicia, u_bruno, u_camila, u_estela, u_fabian, u_greta)) < 6 then
    raise exception 'Faltan los usuarios demo: ejecuta antes 03_seed.sql.';
  end if;

  perform setseed(0.2026);
  managers := array[u_estela, u_fabian, u_greta];
  reporters := array[u_alicia, u_bruno, u_camila, u_alicia, u_bruno, u_estela];
  responsibles := array[u_camila, u_estela, u_fabian, u_camila, u_greta];

  for k in 1..40 loop
    v_status := plan[k];
    v_priority := priorities[1 + (k - 1) % 10];
    cat_idx := 1 + (k - 1) % 5;
    v_category := categories[cat_idx];
    v_target := targets[array_position(array['Crítica','Alta','Media','Baja'], v_priority)];
    v_reporter := reporters[1 + (k - 1) % 6];
    v_manager := managers[1 + (k - 1) % 3];
    v_responsible := responsibles[1 + (k * 7) % 5];
    if v_responsible = v_reporter then v_responsible := u_fabian; end if;
    -- Un caso con responsable desactivado, pendiente de reasignación (regla C4)
    if k = 37 then v_responsible := u_damian; end if;

    -- Fecha de registro: los cerrados son más antiguos; los abiertos, recientes
    if v_status in ('Cerrado', 'Descartado') then
      v_reg := timestamptz '2026-08-03 08:00-05' + (k * interval '1 day 18 hours') + (random() * interval '9 hours');
    elsif v_status = 'Resuelto' then
      v_reg := timestamptz '2026-10-05 08:00-05' + (k * interval '13 hours') + (random() * interval '8 hours');
    else
      -- Abiertos: registrados en los últimos días (unos dentro de su meta y otros vencidos)
      v_reg := least(timestamptz '2026-11-03 08:00-05' + (k * interval '4 hours') + (random() * interval '6 hours'),
                     now() - interval '2 days');
    end if;

    -- Código con el contador normal (ER-AAAA-XXXX)
    insert into app.incident_counters (year, last) values (extract(year from v_reg at time zone 'America/Lima')::int, 1)
    on conflict (year) do update set last = app.incident_counters.last + 1
    returning last into v_number;
    v_code := format('ER-%s-%s', extract(year from v_reg at time zone 'America/Lima')::int, lpad(v_number::text, 4, '0'));
    if v_first is null then v_first := v_code; end if;
    v_last := v_code;

    insert into app.incidents (code, title, description, category, priority, status, incident_date, location,
                               involved_people, observations, reported_by, responsible_id, pending_reassignment,
                               registered_at, updated_at)
    values (v_code,
            titles[(cat_idx - 1) * 8 + 1 + ((k - 1) / 5) % 8],
            'Se reporta la situación para su atención. ' ||
              'Se describen los hechos observados, las personas presentes y el contexto en que ocurrió.',
            v_category, v_priority, v_status,
            ((v_reg at time zone 'America/Lima') - (floor(random() * 3) * interval '1 day'))::date,
            locations[1 + (k * 3) % 10],
            case when k % 9 = 0 then '' else involved[1 + (k - 1) % 8] end,
            case when k % 4 = 0 then 'Se solicitó información adicional a las personas involucradas.' else '' end,
            v_reporter,
            case when v_status in ('Nuevo', 'En revisión', 'Descartado') then null else v_responsible end,
            k = 37,
            v_reg, v_reg);

    -- Historial (RN-003) según el estado final
    t := v_reg;
    insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, user_id, created_at)
    values (v_code, 'Registro', null, 'Nuevo', 'Incidencia registrada.', v_reporter, t);

    if v_status = 'Nuevo' then
      update app.incidents set updated_at = t where code = v_code;
      continue;
    end if;

    t := t + (1 + random() * 10) * interval '1 hour';
    insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, user_id, created_at)
    values (v_code, 'Cambio de estado', 'Nuevo', 'En revisión', 'Se revisaron los antecedentes del caso.', v_manager, t);

    if v_status = 'Descartado' then
      t := t + (2 + random() * 20) * interval '1 hour';
      insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, reason, user_id, created_at)
      values (v_code, 'Cambio de estado', 'En revisión', 'Descartado', 'Se descarta tras la revisión.',
              'La situación no corresponde a una incidencia educativa; se derivó al área correspondiente.', v_manager, t);
      update app.incidents set updated_at = t where code = v_code;
      continue;
    end if;
    if v_status = 'En revisión' then
      update app.incidents set updated_at = t where code = v_code;
      continue;
    end if;

    -- Tiempo total de atención: la mayoría dentro de la meta, algunos fuera
    v_factor := case when random() < 0.75 then 0.15 + random() * 0.8 else 1.05 + random() * 0.9 end;
    v_hours := greatest(4, v_target * v_factor);

    -- Los casos aún abiertos avanzan en pocas horas; los demás, en proporción al tiempo total
    t := t + (case when v_status in ('Asignado', 'En atención') then 2 + random() * 30 else v_hours * 0.15 end) * interval '1 hour';
    insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, responsible_id, user_id, created_at)
    values (v_code, 'Asignación', 'En revisión', 'Asignado', 'Caso asignado para su atención.',
            coalesce(case when k = 37 then u_damian end, v_responsible), v_manager, t);
    if v_status = 'Asignado' then
      update app.incidents set updated_at = t where code = v_code;
      continue;
    end if;

    t := t + (case when v_status = 'En atención' then 2 + random() * 30 else v_hours * 0.15 end) * interval '1 hour';
    insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, user_id, created_at)
    values (v_code, 'Cambio de estado', 'Asignado', 'En atención', 'Se inició la atención del caso.', v_responsible, t);
    if v_status = 'En atención' then
      if k % 2 = 0 then
        t := t + (2 + random() * 24) * interval '1 hour';
        insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, user_id, created_at)
        values (v_code, 'Observación', 'En atención', 'En atención', 'Se coordinó una reunión de seguimiento.', v_responsible, t);
      end if;
      update app.incidents set updated_at = t where code = v_code;
      continue;
    end if;

    -- Resolución (RN-005)
    -- Nunca en el futuro
    t_res := greatest(t + interval '1 hour', least(v_reg + v_hours * interval '1 hour', now() - interval '6 hours'));
    insert into app.resolutions (incident_code, summary, actions_taken, result, observations, resolution_date, registered_by, registered_at)
    values (v_code, resp_summary[cat_idx], resp_actions[cat_idx], resp_result[cat_idx],
            case when k % 3 = 0 then 'Se recomienda seguimiento en el próximo bimestre.' else '' end,
            (t_res at time zone 'America/Lima')::date, v_responsible, t_res);
    insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, user_id, created_at)
    values (v_code, 'Cambio de estado', 'En atención', 'Resuelto', 'Resolución registrada: ' || resp_summary[cat_idx], v_responsible, t_res);
    if v_status = 'Resuelto' then
      update app.incidents set updated_at = t_res where code = v_code;
      continue;
    end if;

    -- Cierre (RN-006) por un gestor distinto de quien registró
    v_closer := case when managers[1 + k % 3] = v_reporter then managers[1 + (k + 1) % 3] else managers[1 + k % 3] end;
    t_clo := greatest(t_res + interval '1 hour', least(t_res + (2 + random() * 70) * interval '1 hour', now() - interval '3 hours'));
    insert into app.closures (incident_code, observations, closed_by, closed_at)
    values (v_code, case when k % 2 = 0 then 'Se verificó la resolución con las personas involucradas.' else '' end, v_closer, t_clo)
    returning id into v_closure_id;
    insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, user_id, created_at)
    values (v_code, 'Cambio de estado', 'Resuelto', 'Cerrado', 'Incidencia cerrada tras confirmar la resolución.', v_closer, t_clo);
    update app.incidents set updated_at = t_clo where code = v_code;

    -- Encuesta (RN-012): ~75 % de quienes registraron responde; peor nota si la atención fue fuera de meta
    if v_reporter <> v_responsible and v_reporter <> v_closer and random() < 0.75 then
      v_rating := case
        when v_factor > 1 then 1 + floor(random() * 4)::int        -- fuera de meta: 1..4
        else (array[5, 5, 5, 5, 5, 4, 4, 4, 3, 2])[1 + floor(random() * 10)::int]  -- en meta: mayormente 4..5
      end;
      v_resolved := case when v_rating >= 4 then 'Sí' when v_rating = 3 then 'Parcialmente' else
                      case when random() < 0.5 then 'No' else 'Parcialmente' end end;
      insert into app.surveys (incident_code, closure_id, user_id, rating, resolved, speed_rating, comment, created_at)
      values (v_code, v_closure_id, v_reporter, v_rating, v_resolved,
              greatest(1, least(5, v_rating + case when v_factor > 1 then -1 else 0 end)),
              comments[1 + (k * 3) % 10], least(t_clo + (3 + random() * 48) * interval '1 hour', now() - interval '1 hour'));
    end if;
  end loop;

  -- Auditoría coherente con el historial cargado
  insert into app.audit_logs (created_at, user_id, user_label, dni, action, module, entity_id, description)
  select f.created_at, u.id, u.nombres || ' ' || u.apellidos, u.dni,
         case when f.kind = 'Registro' then 'Registro de incidencia'
              when f.kind = 'Asignación' then 'Asignación'
              when f.kind = 'Observación' then 'Seguimiento'
              when f.new_status = 'Resuelto' then 'Resolución'
              when f.new_status = 'Cerrado' then 'Cierre'
              when f.new_status = 'Descartado' then 'Descarte'
              else 'Cambio de estado' end,
         case when f.kind = 'Registro' then 'Incidencias'
              when f.new_status = 'Resuelto' then 'Resolución'
              when f.new_status = 'Cerrado' then 'Cierre'
              else 'Seguimiento' end,
         f.incident_code,
         case when f.previous_status is null then 'Registró la incidencia.'
              when f.kind = 'Observación' then 'Agregó una observación.'
              else f.previous_status || ' → ' || f.new_status || '.' end
  from app.follow_ups f join app.users u on u.id = f.user_id
  where f.incident_code between v_first and v_last;

  insert into app.audit_logs (created_at, user_id, user_label, dni, action, module, entity_id, description)
  select s2.created_at, u.id, u.nombres || ' ' || u.apellidos, u.dni, 'Respuesta de encuesta', 'Encuestas', s2.incident_code,
         format('Satisfacción %s/5, rapidez %s/5, ¿resuelto?: %s.', s2.rating, s2.speed_rating, s2.resolved)
  from app.surveys s2 join app.users u on u.id = s2.user_id
  where s2.incident_code between v_first and v_last;

  -- Actas de las incidencias resueltas y cerradas (RN-011)
  v_count := app.backfill_actas();

  insert into app.audit_logs (user_label, action, module, entity_id, description)
  values ('Sistema', 'Carga de datos de demostración', 'Sistema', v_first || ' … ' || v_last,
          format('Se cargaron 40 incidencias SIMULADAS (%s a %s) con su historial, resoluciones, cierres, encuestas y %s actas. Script 04_demo_ampliado.sql.',
                 v_first, v_last, v_count));
  raise notice 'Datos de demostración cargados: % a % (% actas).', v_first, v_last, v_count;
end;
$$;
