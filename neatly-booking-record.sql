begin;

-- Apply neatly-bookings.sql first. Keep client reads owner-scoped even if an
-- older permissive policy is present.
alter table public.booking_requests enable row level security;
drop policy if exists "Neatly booking ownership boundary" on public.booking_requests;
create policy "Neatly booking ownership boundary"
  on public.booking_requests as restrictive for select to anon, authenticated
  using ((select auth.uid()) is not null and client_user_id = (select auth.uid()));

alter table public.booking_requests
  add column if not exists parish text,
  add column if not exists neighbourhood text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists specialist_response text not null default 'pending',
  add column if not exists specialist_responded_at timestamptz,
  add column if not exists currency text not null default 'JMD',
  add column if not exists service_subtotal_minor bigint,
  add column if not exists neatly_fee_minor bigint,
  add column if not exists customer_total_minor bigint,
  add column if not exists specialist_payout_minor bigint,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists payout_status text not null default 'pending',
  add column if not exists payout_reference text,
  add column if not exists payout_sent_at timestamptz;

alter table public.booking_requests
  drop constraint if exists neatly_currency_valid,
  drop constraint if exists neatly_response_valid,
  drop constraint if exists neatly_payment_valid,
  drop constraint if exists neatly_payout_valid,
  drop constraint if exists neatly_quote_valid;

alter table public.booking_requests
  add constraint neatly_currency_valid check (currency in ('JMD', 'USD', 'CAD')),
  add constraint neatly_response_valid check (
    (specialist_response = 'pending' and specialist_responded_at is null) or
    (specialist_response in ('accepted', 'declined') and specialist_responded_at is not null and cleaner_id is not null)
  ),
  add constraint neatly_payment_valid check (
    payment_status in ('unpaid', 'paid', 'refunded') and
    (payment_status = 'unpaid' or (paid_at is not null and nullif(btrim(payment_reference), '') is not null))
  ),
  add constraint neatly_payout_valid check (
    payout_status in ('pending', 'on_hold', 'sent') and
    (payout_status <> 'sent' or
      (payout_sent_at is not null and nullif(btrim(payout_reference), '') is not null))
  ),
  add constraint neatly_quote_valid check (
    (num_nonnulls(service_subtotal_minor, neatly_fee_minor, customer_total_minor, specialist_payout_minor) = 0
      and payment_status = 'unpaid' and payout_status <> 'sent')
    or
    (num_nonnulls(service_subtotal_minor, neatly_fee_minor, customer_total_minor, specialist_payout_minor) = 4
      and service_subtotal_minor >= 0 and neatly_fee_minor >= 0
      and customer_total_minor::numeric = service_subtotal_minor::numeric + neatly_fee_minor
      and specialist_payout_minor between 0 and customer_total_minor)
  );

-- The exact address is separate from booking history and staff-only for now.
create table if not exists public.booking_service_addresses (
  booking_id uuid primary key references public.booking_requests(id) on delete cascade,
  service_address text not null check (nullif(btrim(service_address), '') is not null)
);
alter table public.booking_service_addresses enable row level security;
revoke all on public.booking_service_addresses from public, anon, authenticated;
grant select, insert, update, delete on public.booking_service_addresses to service_role;

revoke select, update on public.booking_requests from public, anon, authenticated;
grant select (id, cleaner_id, created_at, preferred_date, service_type, status,
  parish, neighbourhood, scheduled_at, specialist_response, currency,
  service_subtotal_minor, neatly_fee_minor, customer_total_minor, payment_status, paid_at)
  on public.booking_requests to authenticated;

-- Keep both existing request paths. Reject browser attempts to submit a
-- prepriced, accepted, paid or paid-out request, even with an older policy.
drop policy if exists "Neatly booking intake boundary" on public.booking_requests;
create policy "Neatly booking intake boundary"
  on public.booking_requests as restrictive for insert to anon, authenticated
  with check (
    status = 'pending' and admin_notes is null
    and ((select auth.uid()) is not distinct from client_user_id)
    and scheduled_at is null
    and specialist_response = 'pending' and specialist_responded_at is null
    and currency = 'JMD' and num_nonnulls(service_subtotal_minor, neatly_fee_minor,
      customer_total_minor, specialist_payout_minor) = 0
    and payment_status = 'unpaid' and payment_reference is null and paid_at is null
    and payout_status = 'pending' and payout_reference is null and payout_sent_at is null
  );

-- Existing deployments may have old mutation grants or policies.
drop policy if exists "Neatly booking client update boundary" on public.booking_requests;
create policy "Neatly booking client update boundary"
  on public.booking_requests as restrictive for update to anon, authenticated
  using (false) with check (false);

drop policy if exists "Neatly booking client delete boundary" on public.booking_requests;
create policy "Neatly booking client delete boundary"
  on public.booking_requests as restrictive for delete to anon, authenticated using (false);

commit;
