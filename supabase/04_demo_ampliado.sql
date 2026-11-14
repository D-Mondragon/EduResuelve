-- =====================================================================
-- EduResuelve — 04_demo_ampliado.sql  (OPCIONAL)
-- Agrega 40 incidencias SIMULADAS con el modelo de registro formal y
-- convivencia escolar (D.S. 021-2026-MINEDU, R.M. 383-2025-MINEDU):
-- historial completo, registro formal, estudiantes y su versión de los
-- hechos, calificación de la falta y comunicación a Dirección, medidas,
-- reuniones con la familia, protocolo de violencia, derivaciones,
-- resoluciones, cierres, actas, encuestas y auditoría.
-- NO borra ni modifica datos existentes.
--
-- · Se ejecuta una sola vez: si ya se cargó, no hace nada.
-- · Requiere 01, 02 y 03 (usa los usuarios demo).
-- · Los códigos se toman del contador normal (continúan después de los
--   existentes). El rango cargado queda registrado en la auditoría como
--   "Carga de datos de demostración" para declararlo en el informe.
-- · No genera mediciones de tiempos de respuesta: esas deben ser reales.
-- · Es determinista (misma semilla → mismos datos). Nombres ficticios.
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
  u_greta   constant uuid := '00000000-0000-4000-a000-000000000007'; -- Administradora (Dirección)

  -- Estado final de cada una de las 40 incidencias (orden fijo)
  plan text[] := array[
    'Cerrado','Cerrado','Resuelto','Cerrado','En atención','Cerrado','Asignado','Cerrado','Cerrado','En revisión',
    'Cerrado','Resuelto','Cerrado','Descartado','Cerrado','En atención','Cerrado','Cerrado','Nuevo','Cerrado',
    'Resuelto','Cerrado','Asignado','Cerrado','Cerrado','En atención','Cerrado','Resuelto','Cerrado','En revisión',
    'Cerrado','Cerrado','Descartado','Resuelto','Cerrado','En atención','Asignado','Cerrado','Resuelto','En atención'];
  priorities text[] := array['Media','Alta','Baja','Media','Crítica','Alta','Media','Baja','Alta','Media'];
  -- 12 de 40 son de convivencia (k = 1, 3, 6, 11, 13, 16, 21, 23, 26, 31, 33, 36)
  cat_cycle text[] := array['Convivencia','Académica','Convivencia','Infraestructura','Orientación',
                            'Convivencia','Administrativa','Académica','Infraestructura','Orientación'];
  categories text[] := array['Convivencia','Académica','Infraestructura','Orientación','Administrativa'];

  -- Convivencia: un título, una descripción objetiva y un régimen por caso
  conv_titles text[] := array[
    'Discusión con empujones durante el recreo', 'Uso de lenguaje ofensivo en el aula',
    'Pelea entre estudiantes a la salida', 'Agresión con un objeto durante la clase de educación física',
    'Mensajes ofensivos en el grupo del salón', 'Daño a útiles de un compañero',
    'Golpes en el baño del segundo piso', 'Interrupción reiterada de la clase con burlas',
    'Burlas reiteradas a un compañero por su apariencia', 'Apropiación de la lonchera de un compañero',
    'Discusión verbal en la fila de ingreso', 'Empujón por las escaleras al cambio de hora'];
  conv_descriptions text[] := array[
    'Durante el recreo, junto a los bebederos, dos estudiantes discutieron y uno empujó al otro, que cayó al piso. La auxiliar los separó.',
    'Mientras un estudiante exponía, otro dijo en voz alta palabras ofensivas dirigidas a él. Varios estudiantes se rieron y la docente detuvo la exposición.',
    'A la salida, frente a la puerta principal, dos estudiantes intercambiaron golpes de puño. El personal de portería intervino.',
    'En la clase de educación física, un estudiante lanzó un cono de plástico contra un compañero y le golpeó la cabeza. El docente suspendió la actividad.',
    'La familia de un estudiante mostró capturas de un grupo de mensajería del salón con burlas y apodos dirigidos a su hijo, enviadas durante el fin de semana.',
    'Al regresar del recreo, un estudiante encontró su cuaderno y su cartuchera rotos. Dos compañeros indicaron quién lo había hecho.',
    'En el baño del segundo piso, un estudiante golpeó en el estómago a un compañero. Otro estudiante avisó al auxiliar.',
    'Durante tres clases seguidas, un estudiante interrumpió con comentarios y burlas hacia el docente y sus compañeros.',
    'Un estudiante refiere que, desde hace dos semanas, un grupo de compañeros se burla de su apariencia en el aula y en el patio.',
    'En el recreo, un estudiante tomó la lonchera de un compañero y se negó a devolverla hasta que intervino la auxiliar.',
    'En la fila de ingreso, dos estudiantes discutieron en voz alta por el orden de llegada, sin contacto físico.',
    'En las escaleras, durante el cambio de hora, un estudiante empujó a un compañero, que se golpeó la rodilla. Se le atendió en tópico.'];
  conv_regimes text[] := array['Disciplina','Disciplina','Disciplina y violencia','Disciplina y violencia','Violencia','Disciplina',
                               'Disciplina y violencia','Disciplina','Violencia','Disciplina','Disciplina','Disciplina y violencia'];
  conv_severity text[] := array['Leve','Leve','Grave','Muy grave',null,'Leve','Grave','Leve',null,'Leve',null,'Grave'];
  conv_violence text[] := array[null,null,'Física','Física','Psicológica',null,'Física',null,'Psicológica',null,null,'Física'];
  conv_referral text[] := array[null,null,'UGEL','PNP','DEMUNA',null,'Fiscalía',null,'UPE',null,null,'DEMUNA'];

  other_titles text[] := array[
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
  other_descriptions text[] := array[
    'El docente del curso informa la situación con el detalle de las fechas y evaluaciones en que se observó.',
    'Se observó la falla durante la jornada; se indica el lugar exacto y desde cuándo ocurre.',
    'La familia o el tutor solicitan el acompañamiento y describen la situación observada en las últimas semanas.',
    'Se presenta el pedido con los datos del estudiante afectado y los documentos que lo sustentan.'];
  immediate text[] := array[
    'Se separó a los estudiantes, se verificó su estado de salud y se comunicó a las familias.',
    'Se informó al tutor del aula y se citó a la familia para una entrevista.',
    'Se aisló el área para evitar accidentes y se avisó al personal de mantenimiento.',
    'Se conversó con el estudiante y se coordinó una cita con Orientación.',
    'Se verificó la información en el sistema y se informó al interesado el plazo de atención.'];
  locations text[] := array['Aula 1A','Aula 2B','Aula 3C','Patio central','Laboratorio','Biblioteca','Aula de cómputo',
                            'Oficina de orientación','Secretaría','Pasillo del segundo piso'];
  involved text[] := array['Estudiantes de 1.° A','Estudiantes de 2.° B','Estudiante de 3.° C y su familia',
                           'Docente del curso y estudiantes','Personal de mantenimiento','Apoderado del estudiante',
                           'Grupo de trabajo de 4.° A','Estudiantes de 5.° B'];
  -- Estudiantes ficticios (pares: estudiante involucrado, estudiante afectado)
  students text[] := array[
    'Diego Ramírez Soto','Mateo Quispe Huamán','Bruno Salazar Peña','Valeria Torres Lima','Joaquín Medina Ríos','Lucía Paredes Chávez',
    'Thiago Flores Aguilar','Camila Rojas Vega','Sebastián Vargas Castro','Ana Sofía Díaz León','Adrián Mendoza Cruz','Fernanda Ruiz Ortega',
    'Gael Herrera Campos','Isabella Gómez Silva','Leonardo Castillo Ramos','Valentina Navarro Ponce','Samuel Ortiz Zapata','Mía Delgado Rivas',
    'Daniel Espinoza Guzmán','Renata Cárdenas Lozano','Matías Romero Vera','Antonella Sánchez Pinto','Nicolás Reyes Mora','Luana Fuentes Arias'];
  witnesses text[] := array['Sofía Mendoza Ruiz','Carlos Benítez Tello','Daniela Prado Núñez','Rodrigo Valdivia Soto'];
  grades text[] := array['1.° A','2.° B','3.° C','4.° A','5.° B','2.° A'];

  resp_summary text[] := array[
    'Se aplicó el procedimiento de convivencia y se acordaron compromisos con las familias.',
    'Se aplicó un plan de reforzamiento académico.',
    'Se realizó la reparación y se verificó el funcionamiento.',
    'Se brindó acompañamiento y orientación personalizada.',
    'Se corrigió el registro y se entregó la documentación.'];
  resp_actions text[] := array[
    'Entrevistas individuales, registro de la versión de los estudiantes, reunión con las familias y medidas formativas.',
    'Reunión con el docente, horario de reforzamiento y seguimiento semanal.',
    'Inspección, compra de repuestos y reparación por el equipo de mantenimiento.',
    'Sesiones con orientación, coordinación con la familia y plan de seguimiento.',
    'Revisión de documentos, corrección en el sistema y entrega al interesado.'];
  resp_result text[] := array[
    'Los estudiantes cumplen los compromisos; no se reportaron nuevos hechos.',
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

  k integer; n integer := 0; cat_idx integer; other_n integer[] := array[0, 0, 0, 0, 0];
  v_status text; v_priority text; v_category text; stage integer;
  v_code text; v_number integer; v_title text; v_description text;
  v_reporter uuid; v_responsible uuid; v_manager uuid; v_closer uuid; v_formal_by uuid; v_decider uuid;
  v_reg timestamptz; t_review timestamptz; t_assign timestamptz; t_start timestamptz; t_res timestamptz;
  t_clo timestamptz; t_cap timestamptz; t_formal timestamptz; t_sev timestamptz; t timestamptz;
  v_target integer; v_factor numeric; v_hours numeric;
  v_closure_id bigint; v_rating integer; v_resolved text;
  v_regime text; v_severity text; v_staff_reporter boolean; v_has_formal boolean;
  v_involved_id bigint; v_stmt_status text; v_stmt_by text;
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

  -- El historial se arma aquí y se inserta al final en orden cronológico (RN-003)
  create temp table demo_fu (
    incident_code text, kind text, previous_status text, new_status text, observation text,
    reason text, responsible_id uuid, user_id uuid, created_at timestamptz
  ) on commit drop;

  perform setseed(0.2026);
  managers := array[u_estela, u_fabian, u_greta];
  reporters := array[u_alicia, u_bruno, u_camila, u_alicia, u_bruno, u_estela];
  responsibles := array[u_camila, u_estela, u_fabian, u_camila, u_greta];

  for k in 1..40 loop
    v_status := plan[k];
    stage := case v_status when 'Nuevo' then 0 when 'En revisión' then 1 when 'Descartado' then 1
                           when 'Asignado' then 2 when 'En atención' then 3 when 'Resuelto' then 4 else 5 end;
    v_priority := priorities[1 + (k - 1) % 10];
    v_category := cat_cycle[1 + (k - 1) % 10];
    cat_idx := array_position(categories, v_category);
    v_target := targets[array_position(array['Crítica','Alta','Media','Baja'], v_priority)];
    v_reporter := reporters[1 + (k - 1) % 6];
    v_staff_reporter := v_reporter in (u_camila, u_estela);
    v_manager := managers[1 + (k - 1) % 3];
    v_responsible := responsibles[1 + (k * 7) % 5];
    if v_responsible = v_reporter then v_responsible := u_fabian; end if;
    -- Un caso con responsable desactivado, pendiente de reasignación (regla C4)
    if k = 37 then v_responsible := u_damian; end if;

    if v_category = 'Convivencia' then
      n := n + 1;
      v_title := conv_titles[n];
      v_description := conv_descriptions[n];
      v_regime := conv_regimes[n];
      v_severity := conv_severity[n];
    else
      other_n[cat_idx] := other_n[cat_idx] + 1;
      v_title := other_titles[(cat_idx - 2) * 8 + 1 + (other_n[cat_idx] - 1) % 8];
      v_description := other_descriptions[cat_idx - 1];
      v_regime := 'Ninguno';
      v_severity := null;
    end if;

    -- Fecha de registro: los cerrados son más antiguos; los abiertos, recientes
    if v_status in ('Cerrado', 'Descartado') then
      v_reg := timestamptz '2026-08-03 08:00-05' + (k * interval '1 day 18 hours') + (random() * interval '9 hours');
    elsif v_status = 'Resuelto' then
      v_reg := timestamptz '2026-10-05 08:00-05' + (k * interval '13 hours') + (random() * interval '8 hours');
    else
      v_reg := least(timestamptz '2026-11-03 08:00-05' + (k * interval '4 hours') + (random() * interval '6 hours'),
                     now() - interval '3 days');
    end if;

    -- Tiempos de cada etapa (la mayoría dentro de la meta, algunos fuera)
    v_factor := case when random() < 0.75 then 0.15 + random() * 0.8 else 1.05 + random() * 0.9 end;
    v_hours := greatest(4, v_target * v_factor);
    t_review := v_reg + (1 + random() * 10) * interval '1 hour';
    t_assign := t_review + (case when stage in (2, 3) then 2 + random() * 20 else v_hours * 0.15 end) * interval '1 hour';
    t_start := t_assign + (case when stage = 3 then 2 + random() * 20 else v_hours * 0.15 end) * interval '1 hour';
    t_res := greatest(t_start + interval '1 hour', least(v_reg + v_hours * interval '1 hour', now() - interval '6 hours'));
    t_clo := greatest(t_res + interval '1 hour', least(t_res + (2 + random() * 70) * interval '1 hour', now() - interval '3 hours'));
    -- Límite para los datos del caso: antes de resolver o, si sigue abierto, antes de ahora
    t_cap := case when stage >= 4 then t_res - interval '10 minutes' else now() - interval '30 minutes' end;

    insert into app.incident_counters (year, last) values (extract(year from v_reg at time zone 'America/Lima')::int, 1)
    on conflict (year) do update set last = app.incident_counters.last + 1
    returning last into v_number;
    v_code := format('ER-%s-%s', extract(year from v_reg at time zone 'America/Lima')::int, lpad(v_number::text, 4, '0'));
    if v_first is null then v_first := v_code; end if;
    v_last := v_code;

    insert into app.incidents (code, title, description, category, priority, status, incident_date, location,
                               involved_people, observations, reported_by, responsible_id, pending_reassignment,
                               registered_at, updated_at)
    values (v_code, v_title, v_description, v_category, v_priority, v_status,
            ((v_reg at time zone 'America/Lima') - (floor(random() * 3) * interval '1 day'))::date,
            locations[1 + (k * 3) % 10],
            case when k % 9 = 0 then '' else involved[1 + (k - 1) % 8] end,
            case when k % 4 = 0 then 'Se solicitó información adicional a las personas involucradas.' else '' end,
            v_reporter,
            case when stage < 2 then null else v_responsible end,
            k = 37, v_reg, v_reg);

    insert into demo_fu values (v_code, 'Registro', null, 'Nuevo', 'Incidencia registrada.', null, null, v_reporter, v_reg);

    -- Registro formal (8.2): el personal que reporta lo hace al registrar; si reportó un estudiante, Orientación al revisar.
    -- Dos reportes de estudiantes siguen pendientes de registro formal (en Nuevo y en revisión).
    v_has_formal := v_staff_reporter or (stage >= 1 and not (v_status = 'En revisión' and k = 10));
    if v_has_formal then
      v_formal_by := case when v_staff_reporter then v_reporter else v_manager end;
      t_formal := case when v_staff_reporter then v_reg + interval '2 minutes' else t_review - interval '5 minutes' end;
      update app.incidents set
        regime = v_regime,
        incident_time = time '07:30' + floor(random() * 16) * interval '30 minutes',
        immediate_actions = immediate[cat_idx],
        formal_registered_by = v_formal_by,
        formal_registered_at = t_formal
      where code = v_code;
      insert into demo_fu values (v_code, 'Registro formal', 'Nuevo', 'Nuevo',
        'Registro formal del incidente. Régimen: ' || v_regime || '.', null, null, v_formal_by, t_formal);
    end if;

    -- Estados (RN-003)
    if stage >= 1 then
      insert into demo_fu values (v_code, 'Cambio de estado', 'Nuevo', 'En revisión', 'Se revisaron los antecedentes del caso.',
                                  null, null, v_manager, t_review);
    end if;
    if v_status = 'Descartado' then
      insert into demo_fu values (v_code, 'Cambio de estado', 'En revisión', 'Descartado', 'Se descarta tras la revisión.',
        'La situación no corresponde a una incidencia educativa; se derivó al área correspondiente.', null, v_manager,
        t_review + (2 + random() * 20) * interval '1 hour');
    end if;
    if stage >= 2 then
      insert into demo_fu values (v_code, 'Asignación', 'En revisión', 'Asignado', 'Caso asignado para su atención.', null,
                                  v_responsible, v_manager, t_assign);
    end if;
    if stage >= 3 then
      insert into demo_fu values (v_code, 'Cambio de estado', 'Asignado', 'En atención', 'Se inició la atención del caso.',
                                  null, null, v_responsible, t_start);
      if stage = 3 and k % 2 = 0 then
        insert into demo_fu values (v_code, 'Observación', 'En atención', 'En atención', 'Se coordinó una reunión de seguimiento.',
                                    null, null, v_responsible, least(t_start + (2 + random() * 24) * interval '1 hour', t_cap));
      end if;
    end if;

    -- Caso de convivencia (D.S. 021-2026-MINEDU; R.M. 383-2025-MINEDU)
    if v_category = 'Convivencia' and v_has_formal and stage >= 1 and v_status <> 'Descartado' then
      -- Versión del estudiante involucrado: una pendiente, una en la que se abstuvo; el resto registrada
      v_stmt_status := case when n = 6 then 'Pendiente' when n = 3 then 'Se abstuvo' else 'Registrada' end;
      v_stmt_by := case when v_stmt_status <> 'Registrada' then null when n % 2 = 1 then 'Estudiante' else 'Padre, madre o apoderado' end;
      t := least(t_review + interval '30 minutes', t_cap);
      insert into app.case_participants (incident_code, role, full_name, dni, grade_section, statement, statement_status,
                                         statement_by, statement_at, created_by, created_at)
      values (v_code, 'Estudiante involucrado', students[2 * n - 1], '714' || lpad((n * 37)::text, 5, '0'), grades[1 + n % 6],
              case when v_stmt_status = 'Registrada' then 'Señala que hubo un malentendido previo con su compañero y reconoce lo ocurrido.' else '' end,
              v_stmt_status, v_stmt_by, case when v_stmt_status <> 'Pendiente' then t + interval '1 hour' end, v_manager, t)
      returning id into v_involved_id;
      insert into app.case_participants (incident_code, role, full_name, grade_section, statement, statement_status,
                                         statement_by, statement_at, created_by, created_at)
      values (v_code, 'Estudiante afectado', students[2 * n], grades[1 + n % 6],
              'Refiere que no es la primera vez que ocurre y que se sintió afectado frente a sus compañeros.',
              'Registrada', 'Padre, madre o apoderado', t + interval '90 minutes', v_manager, t + interval '5 minutes');
      insert into demo_fu values (v_code, 'Convivencia', null, null, 'Agregó a una persona (estudiante involucrado).', null, null, v_manager, t);
      insert into demo_fu values (v_code, 'Convivencia', null, null, 'Agregó a una persona (estudiante afectado).', null, null,
                                  v_manager, t + interval '5 minutes');
      if v_stmt_status <> 'Pendiente' then
        insert into demo_fu values (v_code, 'Convivencia', null, null, 'Consignó la versión de los hechos (estudiante involucrado).',
                                    null, null, v_manager, t + interval '1 hour');
      end if;
      if n % 3 = 0 then
        insert into app.case_participants (incident_code, role, full_name, grade_section, statement_status, created_by, created_at)
        values (v_code, 'Testigo', witnesses[1 + (n / 3) % 4], grades[1 + n % 6], 'Pendiente', v_manager, t + interval '10 minutes');
        insert into demo_fu values (v_code, 'Convivencia', null, null, 'Agregó a una persona (testigo).', null, null,
                                    v_manager, t + interval '10 minutes');
      end if;

      -- Calificación y comunicación a Dirección (una comunicada fuera de las 24 h)
      if v_severity is not null then
        t_sev := least(case when n = 3 then v_reg + interval '30 hours' else t_review + interval '2 hours' end, t_cap);
        update app.incidents set severity = v_severity,
          director_notified_at = case when v_severity <> 'Leve' then t_sev end
        where code = v_code;
        insert into demo_fu values (v_code, 'Convivencia', null, null, 'Actualizó gravedad: ' || v_severity || '.', null, null, v_manager, t_sev);
        if v_severity <> 'Leve' then
          if n = 7 then
            -- Caso abierto pendiente de que Dirección tome conocimiento
            insert into app.notifications (user_id, incident_code, title, body, created_at)
            values (u_greta, v_code, 'Falta grave: comunicación a Dirección',
                    v_code || ': ' || v_title || '. Confirma que tomaste conocimiento.', t_sev);
          else
            t := least(t_sev + (1 + random() * 5) * interval '1 hour', t_cap);
            update app.incidents set director_ack_by = u_greta, director_ack_at = t where code = v_code;
            insert into demo_fu values (v_code, 'Convivencia', null, null,
              'Dirección tomó conocimiento de la falta ' || lower(v_severity) || '.', null, null, u_greta, t);
          end if;
        end if;
      end if;

      -- Protocolo de violencia: tipo, código SíseVe y folio del Libro de Registro de Incidencias
      if conv_violence[n] is not null then
        t := least(t_review + interval '3 hours', t_cap);
        update app.incidents set violence_type = conv_violence[n], violence_modality = 'Entre estudiantes',
          siseve_code = 'SV-2026-' || lpad((4100 + k * 7)::text, 6, '0'), book_folio = lpad((n + 4)::text, 3, '0')
        where code = v_code;
        insert into demo_fu values (v_code, 'Convivencia', null, null,
          'Actualizó tipo de violencia: ' || conv_violence[n] || '; modalidad: Entre estudiantes; código SíseVe; folio del Libro de Registro.',
          null, null, v_manager, t);
      end if;
      if conv_referral[n] is not null then
        t := least(t_review + interval '6 hours', t_cap);
        insert into app.case_referrals (incident_code, entity, office_number, referral_date, notes, created_by, created_at)
        values (v_code, conv_referral[n], 'Oficio N.° ' || lpad((10 + n)::text, 3, '0') || '-2026-IE/D',
                (t at time zone 'America/Lima')::date, 'Comunicación del caso según el protocolo.', v_manager, t);
        insert into demo_fu values (v_code, 'Convivencia', null, null,
          'Derivó el caso a ' || conv_referral[n] || ' (oficio N.° ' || lpad((10 + n)::text, 3, '0') || '-2026-IE/D).', null, null, v_manager, t);
      end if;

      -- Medida (después de consignar la versión): leve, el responsable; grave o muy grave, Dirección
      if stage >= 3 and v_severity is not null and v_stmt_status <> 'Pendiente' then
        v_decider := case when v_severity = 'Leve' then v_responsible else u_greta end;
        t := least(t_start + interval '2 hours', t_cap);
        insert into app.case_measures (incident_code, participant_id, kind, description, is_separation, decided_by, decided_at)
        values (v_code, v_involved_id,
                case v_severity when 'Leve' then 'Formativa' when 'Grave' then 'Correctiva' else 'Disciplinaria' end,
                case v_severity
                  when 'Leve' then 'Diálogo reflexivo con Orientación y compromiso escrito de respeto hacia sus compañeros.'
                  when 'Grave' then 'Reparación del daño y acompañamiento semanal de Orientación durante un mes.'
                  else 'Separación temporal de las actividades extracurriculares por el resto del bimestre, con plan de acompañamiento.' end,
                v_severity = 'Muy grave', v_decider, t);
        insert into demo_fu values (v_code, 'Convivencia', null, null,
          'Registró una medida ' || case v_severity when 'Leve' then 'formativa' when 'Grave' then 'correctiva' else 'disciplinaria' end || '.',
          null, null, v_decider, t);
      end if;

      -- Reunión con la familia (una familia se negó a firmar)
      if stage >= 4 then
        t := least(t_start + interval '4 hours', t_cap);
        insert into app.case_meetings (incident_code, meeting_date, attendees, agreements, signature_status, created_by, created_at)
        values (v_code, (t at time zone 'America/Lima')::date,
                'Madre o padre de los estudiantes, tutor del aula y orientadora',
                '1) La familia acompañará los compromisos en casa. 2) El tutor informará el avance cada semana durante un mes. 3) Nueva reunión si se repiten los hechos.',
                case when n = 3 then 'Se negó a firmar' else 'Firmada' end, v_responsible, t);
        insert into demo_fu values (v_code, 'Convivencia', null, null,
          'Registró la reunión con la familia del ' || to_char(t at time zone 'America/Lima', 'DD/MM/YYYY') || '.', null, null, v_responsible, t);
      end if;
    end if;

    -- Resolución (RN-005)
    if stage >= 4 then
      insert into app.resolutions (incident_code, summary, actions_taken, result, observations, resolution_date, registered_by, registered_at)
      values (v_code, resp_summary[cat_idx], resp_actions[cat_idx], resp_result[cat_idx],
              case when k % 3 = 0 then 'Se recomienda seguimiento en el próximo bimestre.' else '' end,
              (t_res at time zone 'America/Lima')::date, v_responsible, t_res);
      insert into demo_fu values (v_code, 'Cambio de estado', 'En atención', 'Resuelto',
                                  'Resolución registrada: ' || resp_summary[cat_idx], null, null, v_responsible, t_res);
    end if;

    -- Cierre (RN-006) por un gestor distinto de quien registró, y encuesta (RN-012)
    if stage = 5 then
      v_closer := case when managers[1 + k % 3] = v_reporter then managers[1 + (k + 1) % 3] else managers[1 + k % 3] end;
      insert into app.closures (incident_code, observations, closed_by, closed_at)
      values (v_code, case when k % 2 = 0 then 'Se verificó la resolución con las personas involucradas.' else '' end, v_closer, t_clo)
      returning id into v_closure_id;
      insert into demo_fu values (v_code, 'Cambio de estado', 'Resuelto', 'Cerrado', 'Incidencia cerrada tras confirmar la resolución.',
                                  null, null, v_closer, t_clo);

      if v_reporter <> v_responsible and v_reporter <> v_closer and random() < 0.75 then
        v_rating := case
          when v_factor > 1 then 1 + floor(random() * 4)::int
          else (array[5, 5, 5, 5, 5, 4, 4, 4, 3, 2])[1 + floor(random() * 10)::int]
        end;
        v_resolved := case when v_rating >= 4 then 'Sí' when v_rating = 3 then 'Parcialmente' else
                        case when random() < 0.5 then 'No' else 'Parcialmente' end end;
        insert into app.surveys (incident_code, closure_id, user_id, rating, resolved, speed_rating, comment, created_at)
        values (v_code, v_closure_id, v_reporter, v_rating, v_resolved,
                greatest(1, least(5, v_rating + case when v_factor > 1 then -1 else 0 end)),
                comments[1 + (k * 3) % 10], least(t_clo + (3 + random() * 48) * interval '1 hour', now() - interval '1 hour'));
      end if;
    end if;
  end loop;

  -- Historial en orden cronológico; los movimientos del caso conservan el estado vigente en ese momento
  insert into app.follow_ups (incident_code, kind, previous_status, new_status, observation, reason, responsible_id, user_id, created_at)
  select d.incident_code, d.kind,
         coalesce(d.previous_status, s.status), coalesce(d.new_status, s.status),
         d.observation, d.reason, d.responsible_id, d.user_id, d.created_at
  from demo_fu d
  cross join lateral (
    select coalesce((select x.new_status from demo_fu x
                     where x.incident_code = d.incident_code and x.kind in ('Registro', 'Cambio de estado', 'Asignación')
                       and x.created_at <= d.created_at
                     order by x.created_at desc limit 1), 'Nuevo') status
  ) s
  order by d.created_at, d.incident_code;

  update app.incidents i set updated_at = f.last
  from (select incident_code, max(created_at) last from app.follow_ups group by incident_code) f
  where f.incident_code = i.code and i.code between v_first and v_last;

  -- Auditoría coherente con el historial cargado
  insert into app.audit_logs (created_at, user_id, user_label, dni, action, module, entity_id, description)
  select f.created_at, u.id, u.nombres || ' ' || u.apellidos, u.dni,
         case when f.kind = 'Registro' then 'Registro de incidencia'
              when f.kind = 'Registro formal' then 'Registro formal'
              when f.kind = 'Convivencia' then 'Datos del caso'
              when f.kind = 'Asignación' then 'Asignación'
              when f.kind = 'Observación' then 'Seguimiento'
              when f.new_status = 'Resuelto' then 'Resolución'
              when f.new_status = 'Cerrado' then 'Cierre'
              when f.new_status = 'Descartado' then 'Descarte'
              else 'Cambio de estado' end,
         case when f.kind = 'Registro' then 'Incidencias'
              when f.kind in ('Registro formal', 'Convivencia') then 'Convivencia'
              when f.new_status = 'Resuelto' and f.kind = 'Cambio de estado' then 'Resolución'
              when f.new_status = 'Cerrado' and f.kind = 'Cambio de estado' then 'Cierre'
              else 'Seguimiento' end,
         f.incident_code,
         case when f.previous_status is null then 'Registró la incidencia.'
              when f.kind = 'Observación' then 'Agregó una observación.'
              when f.kind in ('Registro formal', 'Convivencia') then f.observation
              else f.previous_status || ' → ' || f.new_status || '.' end
  from app.follow_ups f join app.users u on u.id = f.user_id
  where f.incident_code between v_first and v_last;

  insert into app.audit_logs (created_at, user_id, user_label, dni, action, module, entity_id, description)
  select s2.created_at, u.id, u.nombres || ' ' || u.apellidos, u.dni, 'Respuesta de encuesta', 'Encuestas', s2.incident_code,
         format('Satisfacción %s/5, rapidez %s/5, ¿resuelto?: %s.', s2.rating, s2.speed_rating, s2.resolved)
  from app.surveys s2 join app.users u on u.id = s2.user_id
  where s2.incident_code between v_first and v_last;

  -- Actas de las incidencias resueltas y cerradas (RN-011), con el registro formal y el caso
  v_count := app.backfill_actas();

  insert into app.audit_logs (user_label, action, module, entity_id, description)
  values ('Sistema', 'Carga de datos de demostración', 'Sistema', v_first || ' … ' || v_last,
          format('Se cargaron 40 incidencias SIMULADAS (%s a %s; 12 de convivencia) con registro formal, datos del caso, historial, resoluciones, cierres, encuestas y %s actas. Script 04_demo_ampliado.sql.',
                 v_first, v_last, v_count));
  raise notice 'Datos de demostración cargados: % a % (% actas).', v_first, v_last, v_count;
end;
$$;
