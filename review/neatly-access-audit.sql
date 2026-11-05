-- READ ONLY. Run in Supabase SQL Editor and review the results before changes.
-- This returns schema/security metadata, not customer records.
with requested(name) as (values
 ('applications'),('booking_requests'),('booking_service_addresses'),
 ('neatly_booking_payment_links'),('neatly_service_rates'),('neatly_specialist_accounts'))
select r.name, c.oid is not null as table_exists,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from requested r
left join pg_class c on c.oid = to_regclass('public.' || r.name);

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in (
 'applications','booking_requests','booking_service_addresses',
 'neatly_booking_payment_links','neatly_service_rates','neatly_specialist_accounts')
order by tablename, cmd, policyname;

select c.relname as table_name, r.role_name, p.privilege,
       has_table_privilege(r.role_name, c.oid, p.privilege) as table_privilege
from pg_class c join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'),('authenticated'),('service_role')) r(role_name)
cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege)
where n.nspname = 'public' and c.relname in (
 'applications','booking_requests','booking_service_addresses',
 'neatly_booking_payment_links','neatly_service_rates','neatly_specialist_accounts')
order by c.relname, r.role_name, p.privilege;

-- Column privileges can survive removal of a table-level grant.
select c.relname as table_name, a.attname as column_name, r.role_name,
       has_column_privilege(r.role_name, c.oid, a.attnum, 'SELECT') as can_select,
       has_column_privilege(r.role_name, c.oid, a.attnum, 'INSERT') as can_insert,
       has_column_privilege(r.role_name, c.oid, a.attnum, 'UPDATE') as can_update
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
cross join (values ('anon'),('authenticated'),('service_role')) r(role_name)
where n.nspname = 'public' and c.relname in (
 'applications','booking_requests','booking_service_addresses',
 'neatly_booking_payment_links','neatly_service_rates','neatly_specialist_accounts')
order by c.relname, a.attnum, r.role_name;

-- Inspect privileged routines as well as tables: definer routines can bypass RLS.
select p.oid::regprocedure as routine, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and (p.proname like 'neatly_%' or p.prosecdef)
order by p.proname;
