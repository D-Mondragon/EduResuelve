-- =====================================================================
-- EduResuelve — 03_seed.sql
-- Datos de demostración: 8 usuarios y 5 incidencias (ER-2026-0001 … 0005).
-- Contraseña de todos los usuarios demo: EduResuelve2026
-- =====================================================================

insert into app.users (id, code, dni, nombres, apellidos, email, role, status, password_hash, must_change_password, created_at)
values
  ('00000000-0000-4000-a000-000000000001', 'USR-0001', '70000001', 'Alicia',  'Ejemplo',      'alicia.ejemplo@example.com',      'Estudiante',    'Activo',   extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-08-12T14:20:00Z'),
  ('00000000-0000-4000-a000-000000000002', 'USR-0002', '70000002', 'Bruno',   'Muestra',      'bruno.muestra@example.com',       'Estudiante',    'Activo',   extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-08-18T09:10:00Z'),
  ('00000000-0000-4000-a000-000000000003', 'USR-0003', '70000003', 'Camila',  'Ficticia',     'camila.ficticia@example.com',     'Docente',       'Activo',   extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-07-21T11:45:00Z'),
  ('00000000-0000-4000-a000-000000000004', 'USR-0004', '70000004', 'Damián',  'Simulado',     'damian.simulado@example.com',     'Docente',       'Inactivo', extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-06-09T16:00:00Z'),
  ('00000000-0000-4000-a000-000000000005', 'USR-0005', '70000005', 'Estela',  'Inventada',    'estela.inventada@example.com',    'Orientador',    'Activo',   extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-05-27T08:30:00Z'),
  ('00000000-0000-4000-a000-000000000006', 'USR-0006', '70000006', 'Fabián',  'Imaginario',   'fabian.imaginario@example.com',   'Orientador',    'Activo',   extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-05-14T13:05:00Z'),
  ('00000000-0000-4000-a000-000000000007', 'USR-0007', '70000007', 'Greta',   'Demostración', 'greta.demostracion@example.com',  'Administrador', 'Activo',   extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-04-03T10:15:00Z'),
  ('00000000-0000-4000-a000-000000000008', 'USR-0008', '70000008', 'Hugo',    'Prototipo',    'hugo.prototipo@example.com',      'Administrador', 'Inactivo', extensions.crypt('EduResuelve2026', extensions.gen_salt('bf')), false, '2026-03-19T15:40:00Z')
on conflict (id) do nothing;

select setval('app.user_code_seq', greatest((select count(*) from app.users), 8));

insert into app.incidents (code, title, description, category, priority, status, incident_date, location,
                           involved_people, observations, reported_by, responsible_id, registered_at, updated_at)
values
  ('ER-2026-0001', 'Conflicto durante el recreo',
   'Se reportó un desacuerdo entre estudiantes durante el recreo. El equipo escolar está revisando lo ocurrido y recopilando antecedentes.',
   'Convivencia', 'Alta', 'En revisión', '2026-09-24', 'Patio central', 'Estudiantes del grupo 2B',
   'Pendiente de conversar con las personas involucradas.',
   '00000000-0000-4000-a000-000000000001', null, '2026-09-24T13:30:00Z', '2026-09-24T15:15:00Z'),
  ('ER-2026-0002', 'Dificultad de aprendizaje en matemáticas',
   'Se solicita acompañamiento por dificultades persistentes en la comprensión de contenidos matemáticos.',
   'Académica', 'Media', 'Asignado', '2026-09-22', 'Aula 5', 'Estudiante y docente de matemáticas',
   'Se revisarán los apoyos pedagógicos disponibles.',
   '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', '2026-09-22T14:00:00Z', '2026-09-23T16:20:00Z'),
  ('ER-2026-0003', 'Filtración de agua en el aula 4',
   'Se observa filtración de agua cerca de una ventana del aula, lo que requiere revisión para mantener el espacio en condiciones adecuadas.',
   'Infraestructura', 'Crítica', 'En atención', '2026-09-20', 'Aula 4, edificio principal', 'Personal docente del aula 4',
   'Se notificó al equipo de mantenimiento para una inspección.',
   '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000007', '2026-09-20T12:45:00Z', '2026-09-20T17:10:00Z'),
  ('ER-2026-0004', 'Solicitud de orientación familiar',
   'La familia solicitó orientación para acompañar el proceso de adaptación escolar del estudiante.',
   'Orientación', 'Baja', 'Cerrado', '2026-09-18', 'Oficina de orientación', 'Familia y estudiante',
   'La familia recibió las orientaciones acordadas.',
   '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000006', '2026-09-18T19:00:00Z', '2026-09-22T15:30:00Z'),
  ('ER-2026-0005', 'Actualización de datos de matrícula',
   'Se solicitó actualizar información de matrícula para mantener el expediente escolar al día.',
   'Administrativa', 'Media', 'Resuelto', '2026-09-16', 'Secretaría escolar', 'Persona tutora del estudiante',
   'La información de matrícula fue revisada y actualizada.',
   '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000007', '2026-09-16T15:10:00Z', '2026-09-17T20:40:00Z')
on conflict (code) do nothing;

insert into app.incident_counters (year, last) values (2026, 5)
on conflict (year) do update set last = greatest(app.incident_counters.last, 5);

-- Historial (horas en hora de Lima convertidas a UTC: +5h)
insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, reason, responsible_id, user_id, created_at)
select * from (values
  ('ER-2026-0001', 'Registro',         null,          'Nuevo',       'Incidencia registrada por el equipo educativo.',          null::text, null::uuid, '00000000-0000-4000-a000-000000000001'::uuid, '2026-09-24T13:30:00Z'::timestamptz),
  ('ER-2026-0001', 'Cambio de estado', 'Nuevo',       'En revisión', 'La orientación inició la revisión.',                     null, null, '00000000-0000-4000-a000-000000000005', '2026-09-24T15:15:00Z'),
  ('ER-2026-0002', 'Registro',         null,          'Nuevo',       'Solicitud recibida por coordinación académica.',         null, null, '00000000-0000-4000-a000-000000000003', '2026-09-22T14:00:00Z'),
  ('ER-2026-0002', 'Cambio de estado', 'Nuevo',       'En revisión', 'Se revisaron los antecedentes académicos disponibles.',  null, null, '00000000-0000-4000-a000-000000000007', '2026-09-22T18:30:00Z'),
  ('ER-2026-0002', 'Asignación',       'En revisión', 'Asignado',    'Caso asignado a coordinación académica.',                null, '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000007', '2026-09-23T16:20:00Z'),
  ('ER-2026-0003', 'Registro',         null,          'Nuevo',       'Reporte recibido antes del inicio de la jornada.',       null, null, '00000000-0000-4000-a000-000000000003', '2026-09-20T12:45:00Z'),
  ('ER-2026-0003', 'Cambio de estado', 'Nuevo',       'En revisión', 'Se verificó la ubicación y el alcance reportado.',       null, null, '00000000-0000-4000-a000-000000000005', '2026-09-20T13:20:00Z'),
  ('ER-2026-0003', 'Asignación',       'En revisión', 'Asignado',    'Revisión asignada a administración escolar.',            null, '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000005', '2026-09-20T14:05:00Z'),
  ('ER-2026-0003', 'Cambio de estado', 'Asignado',    'En atención', 'Mantenimiento coordina una inspección del espacio.',     null, null, '00000000-0000-4000-a000-000000000007', '2026-09-20T17:10:00Z'),
  ('ER-2026-0004', 'Registro',         null,          'Nuevo',       'Solicitud registrada para revisión del equipo.',         null, null, '00000000-0000-4000-a000-000000000002', '2026-09-18T19:00:00Z'),
  ('ER-2026-0004', 'Cambio de estado', 'Nuevo',       'En revisión', 'Se coordinaron entrevistas de orientación.',             null, null, '00000000-0000-4000-a000-000000000005', '2026-09-19T14:15:00Z'),
  ('ER-2026-0004', 'Asignación',       'En revisión', 'Asignado',    'Caso asignado al equipo de orientación.',                null, '00000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000005', '2026-09-19T16:00:00Z'),
  ('ER-2026-0004', 'Cambio de estado', 'Asignado',    'En atención', 'Se inició el acompañamiento familiar.',                  null, null, '00000000-0000-4000-a000-000000000006', '2026-09-20T15:00:00Z'),
  ('ER-2026-0004', 'Cambio de estado', 'En atención', 'Resuelto',    'Resolución registrada: Se completó el acompañamiento solicitado por la familia.', null, null, '00000000-0000-4000-a000-000000000006', '2026-09-21T20:10:00Z'),
  ('ER-2026-0004', 'Cambio de estado', 'Resuelto',    'Cerrado',     'La familia recibió las orientaciones acordadas.',        null, null, '00000000-0000-4000-a000-000000000005', '2026-09-22T15:30:00Z'),
  ('ER-2026-0005', 'Registro',         null,          'Nuevo',       'Solicitud recibida en secretaría escolar.',              null, null, '00000000-0000-4000-a000-000000000007', '2026-09-16T15:10:00Z'),
  ('ER-2026-0005', 'Cambio de estado', 'Nuevo',       'En revisión', 'Se verificaron los datos entregados.',                   null, null, '00000000-0000-4000-a000-000000000005', '2026-09-16T16:25:00Z'),
  ('ER-2026-0005', 'Asignación',       'En revisión', 'Asignado',    'Solicitud asignada a secretaría escolar.',               null, '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000005', '2026-09-16T18:00:00Z'),
  ('ER-2026-0005', 'Cambio de estado', 'Asignado',    'En atención', 'Se realizó la actualización solicitada.',                null, null, '00000000-0000-4000-a000-000000000007', '2026-09-17T14:10:00Z'),
  ('ER-2026-0005', 'Cambio de estado', 'En atención', 'Resuelto',    'Resolución registrada: Datos de matrícula actualizados.', null, null, '00000000-0000-4000-a000-000000000007', '2026-09-17T20:40:00Z')
) as v(incident_code, kind, previous_status, new_status, observation, reason, responsible_id, user_id, created_at)
where not exists (select 1 from app.follow_ups);

insert into app.resolutions (incident_code, summary, actions_taken, result, observations, resolution_date, registered_by, registered_at)
select * from (values
  ('ER-2026-0004', 'Se completó el acompañamiento solicitado por la familia.',
   'Se realizaron entrevistas y se compartieron pautas de apoyo.',
   'La familia cuenta con orientaciones para continuar el proceso.',
   'Se acordó mantener comunicación con el equipo escolar.', '2026-09-21'::date,
   '00000000-0000-4000-a000-000000000006'::uuid, '2026-09-21T20:10:00Z'::timestamptz),
  ('ER-2026-0005', 'Datos de matrícula actualizados.',
   'Se revisó la documentación y se actualizó el expediente.',
   'La información quedó completa y verificada.',
   'La persona tutora confirmó los datos actualizados.', '2026-09-17'::date,
   '00000000-0000-4000-a000-000000000007'::uuid, '2026-09-17T20:40:00Z'::timestamptz)
) as v(incident_code, summary, actions_taken, result, observations, resolution_date, registered_by, registered_at)
where not exists (select 1 from app.resolutions);

insert into app.closures (incident_code, observations, closed_by, closed_at)
select 'ER-2026-0004', 'La familia recibió las orientaciones acordadas.',
       '00000000-0000-4000-a000-000000000005', '2026-09-22T15:30:00Z'
where not exists (select 1 from app.closures);

-- Auditoría coherente con el historial sembrado
insert into app.audit_logs (created_at, user_id, user_label, dni, action, module, entity_id, description)
select f.created_at, u.id, u.nombres || ' ' || u.apellidos, u.dni,
       case
         when f.kind = 'Registro' then 'Registro de incidencia'
         when f.kind = 'Asignación' then 'Asignación'
         when f.new_status = 'Resuelto' then 'Resolución'
         when f.new_status = 'Cerrado' then 'Cierre'
         else 'Cambio de estado'
       end,
       case
         when f.kind = 'Registro' then 'Incidencias'
         when f.new_status = 'Resuelto' then 'Resolución'
         when f.new_status = 'Cerrado' then 'Cierre'
         else 'Seguimiento'
       end,
       f.incident_code,
       case when f.previous_status is null then 'Registró la incidencia.'
            else f.previous_status || ' → ' || f.new_status || '.' end
from app.follow_ups f
join app.users u on u.id = f.user_id
where not exists (select 1 from app.audit_logs);

-- Actas de resolución de las incidencias demo resueltas o cerradas (RN-011)
select app.backfill_actas();
