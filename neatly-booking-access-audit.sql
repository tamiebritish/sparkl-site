-- Read-only. Inspect metadata only. This query returns no customer records.
select c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'booking_requests';

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'booking_requests'
order by cmd, policyname;

select c.column_name,
  has_column_privilege('anon', 'public.booking_requests', c.column_name::text, 'SELECT') as anon_can_select,
  has_column_privilege('authenticated', 'public.booking_requests', c.column_name::text, 'SELECT') as signed_in_can_select
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'booking_requests'
order by c.ordinal_position;
