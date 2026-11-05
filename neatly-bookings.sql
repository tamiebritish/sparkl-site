begin;

alter table public.booking_requests enable row level security;
alter table public.booking_requests
  alter column cleaner_id drop not null,
  alter column client_phone drop not null,
  alter column preferred_date drop not null,
  alter column preferred_time drop not null,
  add column if not exists client_user_id uuid references auth.users(id) on delete set null,
  add column if not exists admin_notes text,
  add column if not exists property_type text,
  add column if not exists frequency text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists locality text;

drop policy if exists "Anyone can submit a booking request" on public.booking_requests;
drop policy if exists "Anonymous requests are unclaimed" on public.booking_requests;
create policy "Anonymous requests are unclaimed"
  on public.booking_requests for insert to anon
  with check (client_user_id is null and status = 'pending' and admin_notes is null);

drop policy if exists "Clients submit their own requests" on public.booking_requests;
create policy "Clients submit their own requests"
  on public.booking_requests for insert to authenticated
  with check (
    client_user_id = (select auth.uid())
    and client_email = (select auth.jwt() ->> 'email')
    and status = 'pending'
    and admin_notes is null
    and (cleaner_id is null or exists (
      select 1 from public.cleaners
      where cleaners.id = booking_requests.cleaner_id
        and to_jsonb(cleaners)->>'approved' = 'true'
    ))
  );

drop policy if exists "Clients read their own requests" on public.booking_requests;
create policy "Clients read their own requests"
  on public.booking_requests for select to authenticated
  using (client_user_id = (select auth.uid()));

revoke select on public.booking_requests from public, anon, authenticated;
grant select (id, cleaner_id, created_at, preferred_date, service_type, status)
  on public.booking_requests to authenticated;
revoke insert on public.booking_requests from authenticated;
grant insert (client_user_id, client_email, client_name, client_phone, cleaner_id,
  service_type, preferred_date, property_type, frequency, country, region, locality, notes)
  on public.booking_requests to authenticated;

commit;
