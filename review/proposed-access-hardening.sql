-- PROPOSED ONLY. Review live audit results and approve before running.
-- The active application sends email. These restrictions make application rows
-- staff-only; a future database-backed applicant flow needs its own policy.
begin;

alter table public.applications enable row level security;

revoke all on public.applications from public, anon, authenticated;
do $application_grants$
declare application_columns text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
  into application_columns
  from pg_attribute
  where attrelid = 'public.applications'::regclass and attnum > 0 and not attisdropped;

  execute format(
    'revoke select (%s), insert (%s), update (%s), references (%s) on public.applications from public, anon, authenticated',
    application_columns, application_columns, application_columns, application_columns);
end $application_grants$;

drop policy if exists "Neatly applications staff only" on public.applications;
create policy "Neatly applications staff only"
  on public.applications as restrictive for all to anon, authenticated
  using (false) with check (false);

grant select, insert, update, delete on public.applications to service_role;

-- The active booking form uses authenticated RPCs. This closes the older
-- anonymous direct-insert path. Authenticated booking RPCs remain available.
revoke insert on public.booking_requests from public, anon;
do $anonymous_booking_grants$
declare booking_columns text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
  into booking_columns
  from pg_attribute
  where attrelid = 'public.booking_requests'::regclass and attnum > 0 and not attisdropped;

  execute format('revoke insert (%s) on public.booking_requests from public, anon', booking_columns);
end $anonymous_booking_grants$;

drop policy if exists "Neatly block anonymous bookings" on public.booking_requests;
create policy "Neatly block anonymous bookings"
  on public.booking_requests as restrictive for insert to anon with check (false);

commit;

-- This proposal does not revoke unreviewed security-definer functions. Inspect
-- their live definitions and grants using the read-only audit before approving it.
