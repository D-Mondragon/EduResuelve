-- =====================================================================
-- EduResuelve — 00_reset.sql  ⚠️ BORRA TODOS LOS DATOS
-- Úsalo solo si quieres reinstalar desde cero. Luego ejecuta
-- 01_schema.sql, 02_functions.sql y 03_seed.sql en ese orden.
-- =====================================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'login', 'logout', 'me', 'change_password',
      'list_incidents', 'get_incident', 'create_incident', 'update_incident',
      'transition_incident', 'reassign_incident', 'add_observation',
      'resolve_incident', 'close_incident', 'list_assignable_users',
      'evidence_begin', 'evidence_chunk', 'evidence_finish', 'evidence_chunk_get', 'evidence_void',
      'list_users', 'create_user', 'update_user', 'set_user_status', 'reset_user_password',
      'list_audit', 'list_notifications', 'mark_notifications_read',
      'get_acta', 'verify_acta', 'submit_survey', 'log_perf', 'perf_stats', 'quality_stats')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end;
$$;

drop schema if exists app cascade;
