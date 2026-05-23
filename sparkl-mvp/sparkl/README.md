# Sparkl — Hamilton's Curated Cleaning Marketplace

A relationship-based cleaning marketplace. Clients browse verified independent cleaners, choose their person, and rebook the same cleaner every time.

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS + Vite | Preserves existing design, no framework overhead |
| Database + Auth | Supabase (PostgreSQL) | Hosted, free tier generous, built-in RLS |
| Email (Phase 2) | Resend | Simple transactional email, works with Supabase Edge Functions |
| Hosting | Netlify | Free tier, auto-deploys from Git, works perfectly with Vite |

---

## Phase 1 Setup (local dev)

### 1. Clone and install

```bash
git clone <your-repo>
cd sparkl
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a name (e.g. `sparkl-mvp`), set a strong DB password, region: **Canada (Central)**
3. Wait for the project to provision (~1 min)

### 3. Run the schema

1. In Supabase: **SQL Editor → New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**

This creates all tables, sets up Row Level Security policies, and seeds 6 sample cleaners with reviews.

### 4. Get your API keys

In Supabase: **Project Settings → API**

Copy:
- **Project URL** (looks like `https://xxxx.supabase.co`)
- **anon public key** (safe to expose in frontend)

### 5. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

The browse page will load cleaners from Supabase. Booking requests and applications submit to real database tables.

---

## Project structure

```
sparkl/
├── index.html              # App shell — all page sections live here
├── src/
│   ├── main.js             # Entry point — router + page wiring
│   ├── css/
│   │   ├── base.css        # Tokens, reset, utility
│   │   ├── components.css  # Nav, cards, forms, modal, toast
│   │   └── pages.css       # Hero, profile, dashboard, onboarding
│   ├── js/
│   │   ├── supabase.js     # Supabase client singleton
│   │   ├── db.js           # All database queries (one file)
│   │   ├── render.js       # HTML rendering functions
│   │   ├── forms.js        # Validation + form extraction
│   │   ├── router.js       # Hash-based SPA router
│   │   └── toast.js        # Toast notification utility
│   └── pages/
│       ├── browse.js       # Homepage / cleaner grid
│       ├── profile.js      # Cleaner profile page
│       ├── booking.js      # Multi-step booking modal
│       ├── dashboard.js    # Client booking history
│       └── apply.js        # Cleaner application form
├── supabase/
│   └── schema.sql          # Full DB schema + seed data
├── .env.example            # Copy to .env.local
├── vite.config.js
└── package.json
```

---

## Adding a real cleaner (admin flow)

Until the admin UI is built (Phase 2), add approved cleaners directly in Supabase:

1. Supabase → **Table Editor → cleaners → Insert row**
2. Fill in all fields
3. Set `status = 'approved'` and `is_listed = true`
4. The cleaner appears on the browse page immediately

---

## Deploy to Netlify

```bash
npm run build
```

Then drag the `dist/` folder to [netlify.com/drop](https://netlify.com/drop).

For continuous deployment:
1. Push to GitHub
2. Netlify → New site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env vars in Netlify: Site settings → Environment variables

---

## Phase 2 checklist (next)

- [ ] Supabase Auth — email/password for clients and cleaners
- [ ] Cleaner dashboard — view incoming booking requests, accept/decline
- [ ] Client dashboard — real auth session replaces email lookup
- [ ] Email notifications via Resend (request submitted, accepted, declined)
- [ ] Tighten RLS policies to use `auth.uid()` instead of open read

## Phase 3 checklist (later)

- [ ] Stripe — deposit or full payment on booking confirmation
- [ ] Verified review system — auto-triggered after booking completed
- [ ] Cleaner photo upload (Supabase Storage)
- [ ] SEO — static generation or prerendering for cleaner profile pages
- [ ] Admin dashboard — approve/reject applications, manage cleaners

---

## Key product rules (don't change these)

- Clients always choose their own cleaner — no manual matching
- Request-to-book only (no instant booking in MVP)
- Cleaners must be manually approved before appearing publicly
- Same cleaner rebook flow is a core retention mechanic
- Off-platform bookings void all protections — enforce this clearly
