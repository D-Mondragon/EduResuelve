-- =====================================================================
-- EduResuelve — 05_demo_convivencia.sql  (OPCIONAL)
-- Tres casos SIMULADOS de convivencia escolar para la demostración del
-- registro formal (D.S. 021-2026-MINEDU) y de los protocolos de violencia
-- (R.M. 383-2025-MINEDU). NO borra ni modifica datos existentes.
--
-- · Se ejecuta una sola vez: si ya se cargó, no hace nada.
-- · Requiere 01, 02 y 03 (usa los usuarios demo).
-- · Usa las mismas funciones RPC que la aplicación (con sesiones
--   temporales que se eliminan al final): cada paso pasa por las
--   validaciones y deja su historial, auditoría y notificaciones.
-- · Nombres de estudiantes ficticios.
--
--   A. Disciplina (falta leve) → cerrada, con acta definitiva completa.
--   B. Disciplina y violencia (falta grave) → en atención, pendiente de
--      que Dirección tome conocimiento y decida la medida.
--   C. Violencia (psicológica, por redes) → resuelta, derivada a DEMUNA.
-- =====================================================================

do $$
declare
  u_alicia constant uuid := '00000000-0000-4000-a000-000000000001'; -- Estudiante
  u_camila constant uuid := '00000000-0000-4000-a000-000000000003'; -- Docente
  u_estela constant uuid := '00000000-0000-4000-a000-000000000005'; -- Orientadora
  u_greta  constant uuid := '00000000-0000-4000-a000-000000000007'; -- Administradora (Dirección)
  t_alicia text := encode(extensions.gen_random_bytes(32), 'hex');
  t_camila text := encode(extensions.gen_random_bytes(32), 'hex');
  t_estela text := encode(extensions.gen_random_bytes(32), 'hex');
  t_greta  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_today date := (now() at time zone 'America/Lima')::date;
  a text;
  b text;
  c text;
  p_a bigint;
  p_b1 bigint;
  p_b2 bigint;
begin
  if exists (select 1 from app.audit_logs where action = 'Carga de casos de convivencia') then
    raise notice 'Los casos de convivencia de demostración ya estaban cargados.';
    return;
  end if;
  if (select count(*) from app.users where id in (u_alicia, u_camila, u_estela, u_greta) and status = 'Activo') < 4 then
    raise notice 'Faltan los usuarios demo activos (03_seed.sql): no se cargaron los casos.';
    return;
  end if;

  insert into app.sessions (token_hash, user_id, expires_at) values
    (app.hash_token(t_alicia), u_alicia, now() + interval '10 minutes'),
    (app.hash_token(t_camila), u_camila, now() + interval '10 minutes'),
    (app.hash_token(t_estela), u_estela, now() + interval '10 minutes'),
    (app.hash_token(t_greta),  u_greta,  now() + interval '10 minutes');

  -- ------------------------------------------------------------------
  -- A. Falta leve: lo reporta y registra formalmente la docente
  -- ------------------------------------------------------------------
  a := public.create_incident(t_camila, jsonb_build_object(
    'title', 'Lenguaje ofensivo hacia un compañero durante la clase',
    'description', 'Durante la clase de Comunicación, a las 9:40, un estudiante dijo en voz alta palabras ofensivas dirigidas a un compañero cuando este leía su trabajo. Varios estudiantes se rieron. La docente detuvo la lectura y habló con ambos al terminar la clase.',
    'category', 'Convivencia', 'priority', 'Media',
    'incidentDate', v_today - 6, 'location', 'Aula 2B', 'involvedPeople', '',
    'formal', jsonb_build_object(
      'regime', 'Disciplina', 'incidentTime', '09:40', 'objective', true,
      'immediateActions', 'Se detuvo la actividad, se pidió respeto al grupo y se conversó por separado con ambos estudiantes al final de la clase.'))) ->> 'code';
  p_a := public.case_save(t_camila, a, 'participant', jsonb_build_object(
    'role', 'Estudiante involucrado', 'fullName', 'Diego Ramírez Soto', 'dni', '71400021', 'gradeSection', '2.º B',
    'statementStatus', 'Registrada', 'statementBy', 'Estudiante',
    'statement', 'Dice que lo dijo en broma y que no pensó que su compañero se sentiría mal. Reconoce que no estuvo bien.')) ->> 'id';
  perform public.case_save(t_camila, a, 'participant', jsonb_build_object(
    'role', 'Estudiante afectado', 'fullName', 'Mateo Quispe Huamán', 'gradeSection', '2.º B',
    'statementStatus', 'Registrada', 'statementBy', 'Estudiante',
    'statement', 'Cuenta que se sintió avergonzado frente al salón y que no es la primera vez que le hablan así.'));
  perform public.transition_incident(t_estela, a, 'review', 'Se revisa el registro formal de la docente.');
  perform public.transition_incident(t_estela, a, 'assign', 'La docente acompañará el caso.', '', u_camila);
  perform public.transition_incident(t_camila, a, 'start', 'Se inicia el acompañamiento con ambos estudiantes.');
  perform public.update_case(t_camila, a, '{"severity": "Leve"}');
  perform public.case_save(t_camila, a, 'measure', jsonb_build_object(
    'participantId', p_a, 'kind', 'Formativa',
    'description', 'Diálogo reflexivo con la docente y la orientadora; el estudiante preparará una exposición breve sobre el respeto en el aula.'));
  perform public.case_save(t_camila, a, 'meeting', jsonb_build_object(
    'meetingDate', v_today - 4, 'attendees', 'Madre del estudiante involucrado, docente de Comunicación y orientadora',
    'agreements', '1) La familia conversará con el estudiante sobre lo ocurrido. 2) La docente informará a la familia del avance cada viernes durante tres semanas. 3) Nueva reunión si se repite la conducta.',
    'signatureStatus', 'Firmada'));
  perform public.resolve_incident(t_camila, a, jsonb_build_object(
    'summary', 'Se aplicó una medida formativa y se acordó seguimiento con la familia.',
    'actionsTaken', 'Diálogo con ambos estudiantes, reunión con la familia y exposición sobre el respeto en el aula.',
    'result', 'El estudiante ofreció disculpas a su compañero; no se repitieron los hechos en tres semanas.',
    'observations', '', 'resolutionDate', v_today - 1));
  perform public.close_incident(t_estela, a, 'Se verificó el cumplimiento de los acuerdos con la familia.', true);

  -- ------------------------------------------------------------------
  -- B. Falta grave con violencia física: lo reporta una estudiante
  -- ------------------------------------------------------------------
  b := public.create_incident(t_alicia, jsonb_build_object(
    'title', 'Empujones y golpes en el patio durante el recreo',
    'description', 'En el recreo, cerca de los bebederos, un estudiante empujó a otro contra la pared y le dio un golpe en el brazo. Otros estudiantes miraban. Una auxiliar los separó.',
    'category', 'Convivencia', 'priority', 'Alta',
    'incidentDate', v_today - 1, 'location', 'Patio central', 'involvedPeople', 'Dos estudiantes de 4.º A')) ->> 'code';
  perform public.register_formal(t_estela, b, jsonb_build_object(
    'regime', 'Disciplina y violencia', 'incidentTime', '10:15', 'objective', true,
    'immediateActions', 'La auxiliar separó a los estudiantes. En tópico se revisó el brazo del estudiante afectado (sin lesión visible) y se llamó a ambas familias.'));
  perform public.transition_incident(t_estela, b, 'review', 'Registro formal completado por Orientación.');
  p_b1 := public.case_save(t_estela, b, 'participant', jsonb_build_object(
    'role', 'Estudiante involucrado', 'fullName', 'Bruno Salazar Peña', 'dni', '71400035', 'gradeSection', '4.º A',
    'statementStatus', 'Registrada', 'statementBy', 'Estudiante',
    'statement', 'Señala que su compañero lo empujó primero en la fila y que reaccionó. Acepta que lo golpeó.')) ->> 'id';
  p_b2 := public.case_save(t_estela, b, 'participant', jsonb_build_object(
    'role', 'Estudiante afectado', 'fullName', 'Valeria Torres Lima', 'dni', '71400047', 'gradeSection', '4.º A',
    'statementStatus', 'Registrada', 'statementBy', 'Padre, madre o apoderado',
    'statement', 'El padre refiere que su hija le contó que el compañero la molesta desde hace dos semanas y que hoy la empujó sin motivo.')) ->> 'id';
  perform public.case_save(t_estela, b, 'participant', jsonb_build_object(
    'role', 'Testigo', 'fullName', 'Sofía Mendoza Ruiz', 'gradeSection', '4.º A', 'statementStatus', 'Pendiente'));
  perform public.update_case(t_estela, b, jsonb_build_object(
    'violenceType', 'Física', 'violenceModality', 'Entre estudiantes', 'siseveCode', 'SV-2026-004512', 'bookFolio', '018'));
  perform public.transition_incident(t_estela, b, 'assign', 'Orientación conduce el protocolo de violencia.', '', u_estela);
  perform public.transition_incident(t_estela, b, 'start', 'Se activa el protocolo de atención.');
  -- Falta grave: se comunica a Dirección (queda pendiente de que tome conocimiento)
  perform public.update_case(t_estela, b, '{"severity": "Grave"}');

  -- ------------------------------------------------------------------
  -- C. Violencia psicológica por redes sociales, derivada a DEMUNA
  -- ------------------------------------------------------------------
  c := public.create_incident(t_estela, jsonb_build_object(
    'title', 'Mensajes de hostigamiento en un grupo de mensajería del salón',
    'description', 'La familia de una estudiante presentó capturas de un grupo de mensajería del salón donde se publicaron burlas y una foto suya editada. Los mensajes se enviaron durante el fin de semana.',
    'category', 'Convivencia', 'priority', 'Alta',
    'incidentDate', v_today - 9, 'location', 'Fuera de la institución (medios digitales)', 'involvedPeople', '',
    'formal', jsonb_build_object(
      'regime', 'Violencia', 'incidentTime', '20:30', 'objective', true,
      'immediateActions', 'Se recibió a la familia, se guardaron las capturas como evidencia y se ofreció acompañamiento psicológico a la estudiante.'))) ->> 'code';
  perform public.case_save(t_estela, c, 'participant', jsonb_build_object(
    'role', 'Estudiante afectado', 'fullName', 'Camila Rojas Vega', 'gradeSection', '3.º C',
    'statementStatus', 'Registrada', 'statementBy', 'Padre, madre o apoderado',
    'statement', 'La madre refiere que su hija no quiere venir al colegio desde que vio los mensajes.'));
  perform public.update_case(t_estela, c, jsonb_build_object(
    'violenceType', 'Psicológica', 'violenceModality', 'Entre estudiantes', 'siseveCode', 'SV-2026-004377', 'bookFolio', '016'));
  perform public.case_save(t_estela, c, 'referral', jsonb_build_object(
    'entity', 'DEMUNA', 'officeNumber', 'Oficio N.° 041-2026-IE/D', 'referralDate', v_today - 7,
    'notes', 'Para el acompañamiento de la familia.'));
  perform public.case_save(t_estela, c, 'meeting', jsonb_build_object(
    'meetingDate', v_today - 7, 'attendees', 'Madre de la estudiante, tutor de 3.º C y orientadora',
    'agreements', '1) Acompañamiento psicológico semanal por un mes. 2) Taller de convivencia digital para el salón. 3) Informe a la familia en 15 días.',
    'signatureStatus', 'Firmada'));
  perform public.transition_incident(t_estela, c, 'review', 'Revisión del caso.');
  perform public.transition_incident(t_estela, c, 'assign', 'Orientación conduce el protocolo.', '', u_estela);
  perform public.transition_incident(t_estela, c, 'start', 'Se activa el protocolo de violencia psicológica.');
  perform public.resolve_incident(t_estela, c, jsonb_build_object(
    'summary', 'Se aplicó el protocolo de violencia psicológica y se derivó el caso a la DEMUNA.',
    'actionsTaken', 'Acompañamiento psicológico, taller de convivencia digital con el salón y derivación a la DEMUNA.',
    'result', 'La estudiante retomó sus clases con normalidad; se eliminaron los mensajes del grupo.',
    'observations', '', 'resolutionDate', v_today - 2));

  delete from app.sessions
  where token_hash in (app.hash_token(t_alicia), app.hash_token(t_camila), app.hash_token(t_estela), app.hash_token(t_greta));

  insert into app.audit_logs (user_label, action, module, entity_id, description)
  values ('Sistema', 'Carga de casos de convivencia', 'Sistema', a || ', ' || b || ', ' || c,
          format('Se cargaron 3 casos SIMULADOS de convivencia escolar (%s, %s y %s). Script 05_demo_convivencia.sql.', a, b, c));
  raise notice 'Casos de convivencia cargados: %, %, %.', a, b, c;
end;
$$;
