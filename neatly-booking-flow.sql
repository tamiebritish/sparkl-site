begin;

-- Requires neatly-booking-record.sql. Configuration and payment evidence are staff-only.
create table if not exists public.neatly_specialist_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cleaner_id uuid not null unique references public.cleaners(id) on delete cascade
);
create table if not exists public.neatly_service_rates (
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  service_type text not null,
  currency text not null default 'JMD' check (currency in ('JMD','USD','CAD')),
  hourly_minor integer not null check (hourly_minor between 1 and 100000000),
  fee_bps integer not null check (fee_bps between 0 and 10000),
  primary key (cleaner_id, service_type)
);
create table if not exists public.neatly_booking_payment_links (
  booking_id uuid primary key references public.booking_requests(id) on delete cascade,
  payment_url text not null check (payment_url ~ '^https://[^[:space:]]+$')
);
alter table public.neatly_specialist_accounts enable row level security;
alter table public.neatly_service_rates enable row level security;
alter table public.neatly_booking_payment_links enable row level security;
revoke all on public.neatly_specialist_accounts, public.neatly_service_rates,
  public.neatly_booking_payment_links from public, anon, authenticated;
grant select, insert, update, delete on public.neatly_specialist_accounts,
  public.neatly_service_rates, public.neatly_booking_payment_links to service_role;

alter table public.booking_requests
  add column if not exists requested_hours integer check (requested_hours between 1 and 12),
  add column if not exists clean_confirmed_at timestamptz,
  add column if not exists problem_reported_at timestamptz,
  add column if not exists problem_details text;

create or replace function public.neatly_quote(p_cleaner uuid, p_service text, p_hours integer)
returns jsonb language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object('currency', r.currency, 'subtotal', q.subtotal,
    'fee', q.fee, 'total', q.subtotal + q.fee)
  from public.neatly_service_rates r
  join public.cleaners c on c.id = r.cleaner_id
  cross join lateral (
    select r.hourly_minor::bigint * p_hours as subtotal,
      round(r.hourly_minor::numeric * p_hours * r.fee_bps / 10000)::bigint as fee
  ) q
  where auth.uid() is not null and p_hours between 1 and 12
    and r.cleaner_id = p_cleaner and r.service_type = p_service
    and to_jsonb(c)->>'approved' = 'true';
$fn$;

create or replace function public.neatly_request(p_details jsonb, p_quote jsonb)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  owner_id uuid := auth.uid();
  owner_email text := auth.jwt()->>'email';
  specialist uuid := nullif(p_details->>'specialist','')::uuid;
  hours integer := (p_details->>'hours')::integer;
  quote jsonb;
  booking uuid;
begin
  if owner_id is null or owner_email is null then raise exception 'Sign in required'; end if;
  if hours is null or hours not between 1 and 12
     or nullif(btrim(p_details->>'address'), '') is null or length(p_details->>'address') > 300
     or nullif(btrim(p_details->>'name'), '') is null or length(p_details->>'name') > 100
     or nullif(btrim(p_details->>'service'), '') is null or length(p_details->>'service') > 100
     or nullif(btrim(p_details->>'region'), '') is null or length(p_details->>'region') > 80
     or nullif(btrim(p_details->>'locality'), '') is null or length(p_details->>'locality') > 80
     or (p_details->>'date') is null or (p_details->>'time') is null
     or (p_details->>'date')::date < (now() at time zone 'America/Jamaica')::date
     or length(p_details->>'notes') > 350 then
    raise exception 'Invalid request details';
  end if;
  if specialist is not null then
    quote := public.neatly_quote(specialist, p_details->>'service', hours);
    if quote is null or quote is distinct from p_quote then
      raise exception 'The quote is unavailable or changed';
    end if;
  end if;
  insert into public.booking_requests (
    client_user_id, client_email, client_name, client_phone, cleaner_id, service_type,
    preferred_date, preferred_time, property_type, frequency, country, region, locality,
    parish, neighbourhood, notes, requested_hours, currency, service_subtotal_minor,
    neatly_fee_minor, customer_total_minor, specialist_payout_minor
  ) values (
    owner_id, owner_email, btrim(p_details->>'name'), left(p_details->>'phone',30), specialist, p_details->>'service',
    (p_details->>'date')::date, ((p_details->>'time')::time)::text, left(p_details->>'property',100),
    left(p_details->>'frequency',100), left(p_details->>'country',80), p_details->>'region',
    p_details->>'locality', p_details->>'region', p_details->>'locality', p_details->>'notes', hours,
    coalesce(quote->>'currency','JMD'), (quote->>'subtotal')::bigint, (quote->>'fee')::bigint,
    (quote->>'total')::bigint, (quote->>'subtotal')::bigint
  ) returning id into booking;
  insert into public.booking_service_addresses (booking_id, service_address)
  values (booking, btrim(p_details->>'address'));
  return booking;
end;
$fn$;

create or replace function public.neatly_specialist_requests()
returns setof jsonb language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object('id', b.id, 'service', b.service_type, 'date', b.preferred_date,
    'time', b.preferred_time, 'area', concat_ws(', ', b.neighbourhood, b.parish),
    'property', b.property_type, 'hours', b.requested_hours, 'response', b.specialist_response,
    'currency', b.currency, 'payout', b.specialist_payout_minor, 'status', b.status,
    'address', case when b.payment_status = 'paid' and b.status = 'confirmed' then a.service_address end)
  from public.booking_requests b
  join public.neatly_specialist_accounts s on s.cleaner_id = b.cleaner_id
  join public.cleaners c on c.id = s.cleaner_id
  left join public.booking_service_addresses a on a.booking_id = b.id
  where s.user_id = auth.uid() and to_jsonb(c)->>'approved' = 'true'
    and b.customer_total_minor is not null
  order by b.created_at desc;
$fn$;

create or replace function public.neatly_specialist_respond(p_booking uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if p_accept is null then raise exception 'Response required'; end if;
  update public.booking_requests b
  set specialist_response = case when p_accept then 'accepted' else 'declined' end,
      specialist_responded_at = now(),
      status = case when p_accept then b.status else 'declined' end
  where b.id = p_booking and b.status = 'pending' and b.specialist_response = 'pending'
    and b.payment_status = 'unpaid' and b.customer_total_minor is not null
    and exists (select 1 from public.neatly_specialist_accounts s join public.cleaners c on c.id = s.cleaner_id
      where s.user_id = auth.uid() and s.cleaner_id = b.cleaner_id and to_jsonb(c)->>'approved' = 'true');
  if not found then raise exception 'Request is unavailable'; end if;
end;
$fn$;

create or replace function public.neatly_booking_progress()
returns setof jsonb language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object('id', b.id, 'cleaner_id', b.cleaner_id, 'status', b.status,
    'service', b.service_type, 'date', b.preferred_date, 'time', b.preferred_time,
    'response', b.specialist_response, 'currency', b.currency, 'subtotal', b.service_subtotal_minor,
    'fee', b.neatly_fee_minor, 'total', b.customer_total_minor, 'payment', b.payment_status,
    'payout', b.payout_status, 'reported', b.problem_reported_at is not null,
    'payment_url', case when b.status = 'pending' and b.specialist_response = 'accepted'
      and b.payment_status = 'unpaid' then l.payment_url end)
  from public.booking_requests b
  left join public.neatly_booking_payment_links l on l.booking_id = b.id
  where b.client_user_id = auth.uid()
  order by b.created_at desc;
$fn$;

create or replace function public.neatly_client_action(p_booking uuid, p_problem text default null)
returns void language plpgsql security definer set search_path = '' as $fn$
begin
  if p_problem is not null and (nullif(btrim(p_problem),'') is null or length(p_problem) > 1000) then
    raise exception 'Provide a short description';
  end if;
  update public.booking_requests
  set status = case when p_problem is null then 'completed' else status end,
    clean_confirmed_at = case when p_problem is null then now() else clean_confirmed_at end,
    problem_reported_at = case when p_problem is not null then now() else problem_reported_at end,
    problem_details = coalesce(p_problem, problem_details),
    payout_status = case when p_problem is not null then 'on_hold' else payout_status end
  where id = p_booking and client_user_id = auth.uid() and payment_status = 'paid'
    and payout_status = 'pending' and problem_reported_at is null
    and ((p_problem is null and status = 'confirmed'
          and preferred_date <= (now() at time zone 'America/Jamaica')::date)
      or (p_problem is not null and status in ('confirmed','completed')));
  if not found then raise exception 'Action is unavailable'; end if;
end;
$fn$;

-- Staff record evidence after verifying externally; these functions never move funds.
create or replace function public.neatly_staff_record_payment(p_booking uuid, p_reference text)
returns void language plpgsql security invoker set search_path = '' as $fn$
begin
  update public.booking_requests
  set payment_status = 'paid', paid_at = now(), payment_reference = nullif(btrim(p_reference),''),
      status = 'confirmed'
  where id = p_booking and status = 'pending' and specialist_response = 'accepted'
    and payment_status = 'unpaid' and customer_total_minor is not null;
  if not found then raise exception 'Booking is not awaiting payment'; end if;
end;
$fn$;

create or replace function public.neatly_staff_record_payout(p_booking uuid, p_reference text)
returns void language plpgsql security invoker set search_path = '' as $fn$
begin
  update public.booking_requests
  set payout_status = 'sent', payout_sent_at = now(), payout_reference = nullif(btrim(p_reference),'')
  where id = p_booking and status = 'completed' and payment_status = 'paid'
    and payout_status = 'pending' and problem_reported_at is null;
  if not found then raise exception 'Booking is not eligible for payout'; end if;
end;
$fn$;

revoke execute on function public.neatly_quote(uuid,text,integer), public.neatly_request(jsonb,jsonb),
  public.neatly_specialist_requests(), public.neatly_specialist_respond(uuid,boolean),
  public.neatly_booking_progress(), public.neatly_client_action(uuid,text),
  public.neatly_staff_record_payment(uuid,text), public.neatly_staff_record_payout(uuid,text)
  from public, anon, authenticated;
grant execute on function public.neatly_quote(uuid,text,integer), public.neatly_request(jsonb,jsonb),
  public.neatly_specialist_requests(), public.neatly_specialist_respond(uuid,boolean),
  public.neatly_booking_progress(), public.neatly_client_action(uuid,text) to authenticated;
grant execute on function public.neatly_staff_record_payment(uuid,text),
  public.neatly_staff_record_payout(uuid,text) to service_role;

commit;
