-- Verifica que la base local levanta y pgTAP funciona.
-- Cada spec tendrá su archivo (01_auth_perfil.test.sql, …) con un test por criterio (-- spec01 AC-08).
begin;
select plan(1);
select has_schema('public');
select * from finish();
rollback;
