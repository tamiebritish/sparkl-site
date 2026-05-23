-- ============================================================
-- SPARKL — DATABASE SCHEMA
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================

-- ── CLEANERS ──────────────────────────────────────────────────────────────────
-- Represents a publicly listed, approved cleaner.
-- Populated manually by admin after approving an application.
-- Clients browse this table; only approved + listed rows appear publicly.

create table if not exists cleaners (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  -- Identity
  full_name        text not null,
  slug             text not null unique, -- URL-friendly: 'nadine-browne'
  bio              text,
  languages        text,
  neighbourhood    text,
  city             text not null default 'Hamilton',

  -- Pricing & services
  hourly_rate      numeric(6,2) not null,
  services         text[] not null default '{}', -- ['Regular', 'Deep Clean', ...]

  -- Availability
  available_days   text[] not null default '{}', -- ['Mon', 'Tue', ...]

  -- Visual (emoji avatar while no photo upload)
  emoji_placeholder text default '🧹',
  avatar_bg_color   text default '#E8F2EC',
  photo_url         text, -- populated when cleaner uploads a photo (Phase 2)

  -- Trust & status
  status           text not null default 'pending'
                   check (status in ('pending', 'approved', 'suspended')),
  is_listed        boolean not null default false,
  is_verified      boolean not null default false,
  is_top_rated     boolean not null default false,

  -- Computed from reviews (updated by trigger or manually)
  rating_average   numeric(3,2) default null,
  review_count     integer not null default 0,

  -- Auth link (Phase 2 — links to auth.users)
  user_id          uuid references auth.users(id) on delete set null
);

-- Cleaners are public to read (browse page works without login)
alter table cleaners enable row level security;

create policy "Public can read approved listed cleaners"
  on cleaners for select
  using (status = 'approved' and is_listed = true);

-- Only service role (admin) can insert/update/delete cleaners
create policy "Service role manages cleaners"
  on cleaners for all
  using (auth.role() = 'service_role');

-- ── REVIEWS ───────────────────────────────────────────────────────────────────
-- Verified reviews attached to a completed booking (Phase 3 full flow).
-- Phase 1: admin can insert reviews manually.

create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  cleaner_id   uuid not null references cleaners(id) on delete cascade,
  client_name  text not null,       -- display name only, no PII beyond this
  rating       integer not null check (rating between 1 and 5),
  review_text  text not null,
  is_published boolean not null default true,

  -- Links to the booking that generated this review (Phase 3)
  booking_id   uuid -- references booking_requests(id) -- enabled in Phase 3
);

alter table reviews enable row level security;

create policy "Public can read published reviews"
  on reviews for select
  using (is_published = true);

create policy "Service role manages reviews"
  on reviews for all
  using (auth.role() = 'service_role');

-- ── BOOKING REQUESTS ──────────────────────────────────────────────────────────
-- Submitted by clients via the booking modal.
-- Status flow: pending → confirmed | declined → completed | cancelled

create table if not exists booking_requests (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Parties
  cleaner_id     uuid not null references cleaners(id) on delete restrict,
  client_name    text not null,
  client_email   text not null,
  client_phone   text not null,

  -- Booking details
  service_type   text not null,
  preferred_date date not null,
  preferred_time text not null,
  home_size      text not null,
  notes          text,

  -- Status
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),

  -- Auth link (Phase 2 — links to auth.users for client)
  client_user_id uuid references auth.users(id) on delete set null,

  -- Admin notes (for dispute resolution)
  admin_notes    text
);

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger booking_requests_updated_at
  before update on booking_requests
  for each row execute function set_updated_at();

alter table booking_requests enable row level security;

-- Clients can insert their own requests (no auth required for Phase 1)
create policy "Anyone can submit a booking request"
  on booking_requests for insert
  with check (true);

-- Booking reads require auth-backed policies in Phase 2.
create policy "No anonymous booking reads"
  on booking_requests for select
  using (false);

-- Service role manages everything
create policy "Service role manages booking requests"
  on booking_requests for all
  using (auth.role() = 'service_role');

-- ── APPLICATIONS ──────────────────────────────────────────────────────────────
-- Cleaner applications submitted via the onboarding form.
-- Admin reviews these and manually creates a cleaners row on approval.

create table if not exists applications (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),

  -- Personal
  full_name               text not null,
  email                   text not null unique, -- prevent duplicate applications
  phone                   text not null,
  neighbourhood           text not null,
  languages               text,

  -- Experience & services
  years_experience        text not null,
  services                text[] not null default '{}',
  hourly_rate             text not null,
  bio                     text not null,
  available_days          text[] not null default '{}',

  -- Agreement checkboxes (must all be true to proceed)
  agreed_ic_terms         boolean not null default false,
  agreed_background_check boolean not null default false,
  agreed_platform_terms   boolean not null default false,
  agreed_no_off_platform  boolean not null default false,

  -- Admin review
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected', 'waitlisted')),
  admin_notes  text
);

alter table applications enable row level security;

-- Anyone can submit an application
create policy "Anyone can submit an application"
  on applications for insert
  with check (
    agreed_ic_terms = true
    and agreed_background_check = true
    and agreed_platform_terms = true
    and agreed_no_off_platform = true
  );

-- Only service role reads/manages applications (admin use only)
create policy "Service role manages applications"
  on applications for all
  using (auth.role() = 'service_role');

-- ── SEED: SAMPLE CLEANERS ────────────────────────────────────────────────────
-- Insert sample approved cleaners so the browse page has real data immediately.
-- Remove or modify before going live with real cleaners.

insert into cleaners (
  full_name, slug, bio, languages, neighbourhood, hourly_rate,
  services, available_days, emoji_placeholder, avatar_bg_color,
  status, is_listed, is_verified, is_top_rated, rating_average, review_count
) values
(
  'Nadine Browne',
  'nadine-browne',
  'Born in Trinidad, I''ve been cleaning homes in Hamilton for 8 years. I take pride in leaving every home spotless and I love building long-term relationships with my clients. I know some families prefer certain products and routines — just let me know!',
  'English, French Creole',
  'Westdale',
  32,
  ARRAY['Regular', 'Deep Clean', 'Move In/Out'],
  ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  '🧹', '#E8F2EC',
  'approved', true, true, true, 4.97, 63
),
(
  'Patrice Joseph',
  'patrice-joseph',
  'I''m a detail-oriented cleaner with a specialty in deep cleaning and post-renovation projects. I bring my own eco-friendly products and I love making spaces feel completely renewed. Six years serving Hamilton''s central neighbourhoods.',
  'English, French',
  'Durand',
  35,
  ARRAY['Regular', 'Deep Clean', 'Move In/Out', 'Post Reno'],
  ARRAY['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  '✨', '#FBF3E4',
  'approved', true, true, true, 4.91, 44
),
(
  'Claudette Williams',
  'claudette-williams',
  'Family home specialist. I''ve raised four children and run a tidy household my whole life. I bring that same care to my clients'' homes. Great with families, kids'' spaces, and pet-friendly homes. Reliable, warm, and very flexible.',
  'English, Patois',
  'Kirkendall',
  28,
  ARRAY['Regular', 'Move In/Out', 'Laundry (add-on)'],
  ARRAY['Mon', 'Wed', 'Fri'],
  '🏡', '#F5EAE7',
  'approved', true, true, false, 4.88, 31
),
(
  'Marie-Claire Desrosiers',
  'marie-claire-desrosiers',
  'Bilingual cleaner (English & French) originally from Martinique. I bring a Caribbean standard of clean — which means I don''t miss corners. My clients say their homes feel genuinely fresh, not just surface-level tidy.',
  'English, French, Martiniquan Creole',
  'Ancaster',
  33,
  ARRAY['Regular', 'Deep Clean', 'Oven/Fridge (add-on)'],
  ARRAY['Mon', 'Tue', 'Thu', 'Fri'],
  '🌺', '#E8F2EC',
  'approved', true, true, false, 4.95, 22
),
(
  'Sandra Osei',
  'sandra-osei',
  'Hardworking and reliable cleaner with 4 years of experience across Hamilton. I specialise in regular maintenance cleans for busy families and professionals. Punctual, communicative, and very proud of every home I care for.',
  'English, Twi',
  'Stoney Creek',
  27,
  ARRAY['Regular', 'Deep Clean'],
  ARRAY['Mon', 'Tue', 'Wed', 'Thu'],
  '🌟', '#FBF3E4',
  'approved', true, true, false, 4.82, 18
),
(
  'Ingrid Baptiste',
  'ingrid-baptiste',
  'Premium specialist cleaner for deep cleans, move situations, and post-renovation. I''ve developed a system over 9 years that gets homes truly clean — not just surface level. My clients are professionals who expect excellence, and I deliver.',
  'English, French',
  'Dundas',
  38,
  ARRAY['Regular', 'Deep Clean', 'Move In/Out', 'Post Reno'],
  ARRAY['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  '💎', '#F5EAE7',
  'approved', true, true, true, 4.93, 37
);

-- ── SEED: SAMPLE REVIEWS ──────────────────────────────────────────────────────
-- Insert sample reviews for the seeded cleaners.

insert into reviews (cleaner_id, client_name, rating, review_text)
select
  c.id,
  r.client_name,
  r.rating,
  r.review_text
from (values
  ('nadine-browne',  'Sarah T.',    5, 'Nadine is absolutely incredible. She''s been cleaning our home for 10 months and I can''t imagine anyone else. She knows exactly how we like things.'),
  ('nadine-browne',  'Marcus L.',   5, 'Trustworthy, professional, thorough. The house smells amazing after she''s done. Highly recommend to anyone who values consistency.'),
  ('patrice-joseph', 'Jennifer K.', 5, 'Patrice did our post-reno clean and the results were stunning. She got grout, dust, and construction residue out of places I didn''t even think to look.'),
  ('patrice-joseph', 'David R.',    4, 'Very professional and thorough deep clean. Would absolutely use again.'),
  ('claudette-williams', 'Amanda F.', 5, 'Claudette is like having a family member help out. She remembered that I prefer unscented products and my kids absolutely love her.'),
  ('claudette-williams', 'Tom B.',    5, 'Consistent, friendly, and great with our dog. Three months in and we''ve never had an issue.'),
  ('marie-claire-desrosiers', 'Priya N.', 5, 'Marie-Claire is exceptional. She''s meticulous, friendly, and my apartment has never looked this good. Will be rebooking every 3 weeks.'),
  ('marie-claire-desrosiers', 'Greg H.',  5, 'Moved to Hamilton recently and was so glad to find her. Culturally she understood exactly what we wanted.'),
  ('sandra-osei', 'Claire S.',  5, 'Sandra is punctual, thorough, and very professional. She''s our go-to for our biweekly clean.'),
  ('sandra-osei', 'Kevin M.',   4, 'Good work, very reliable. I appreciate that she always confirms the day before.'),
  ('ingrid-baptiste', 'Natalie W.', 5, 'Ingrid is worth every penny. She did our move-out clean and the landlord literally said it was the cleanest unit he''d seen. Got our full deposit back.'),
  ('ingrid-baptiste', 'Alex P.',    5, 'Premium cleaner with a premium mindset. She''s methodical and nothing gets missed.')
) as r(slug, client_name, rating, review_text)
join cleaners c on c.slug = r.slug;
