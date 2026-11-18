# Kër Téranga — website & booking platform

Bilingual (FR/EN) cultural-tourism website for **Kër Téranga** (Dakar, Senegal), with
real-time workshop booking and a founder-friendly admin dashboard.

| | |
|---|---|
| Framework | Next.js 15 (App Router) · TypeScript · React 19 |
| Styling | Tailwind CSS (design tokens in `tailwind.config.ts`) · Framer Motion (subtle) |
| i18n | `next-intl` — localized URLs (`/fr/reservation` ↔ `/en/booking`, `/fr/a-propos` ↔ `/en/about`) |
| Data | Supabase PostgreSQL · Row Level Security · Realtime · Storage · Auth |
| Email | Resend + transactional **outbox** with automatic retries |
| Hosting | Netlify (recommended) or any Next.js host (Vercel, Render…) |

---

## 1. What's included

**Public site** — Home, About, Experiences (grid + detail page), Contact, Booking.
Sticky header, language switcher, mobile menu, floating WhatsApp button, footer.

**Booking (5 steps)** — experience → date & time (accessible calendar, live
availability) → guests & language → contact details (international phone, consent)
→ review & confirm → confirmation screen with a unique reference (`KT-XXXXXX`).
No online payment (v1).

**Booking engine (database)** — `create_booking()` runs in one transaction with a
row lock on the session: two people can never take the same last seat. Idempotency
key (no duplicates on double-click or retry), booking cut-off (default 24 h, set per
experience), blocked dates, automatic *full* status, cancellation restores
capacity, Africa/Dakar time zone. Confirmation + admin emails are queued **in the
same transaction** and retried if the email provider fails.

**Admin dashboard** (`/admin`, French, mobile-friendly) — KPIs (occupancy, bookings,
cancellations, pending emails), one-off and recurring sessions, close/reopen,
blocked dates, bookings search/filter/edit/cancel + CSV export, experiences editor
(FR/EN side by side, draft/published/archived, price, group size, cut-off), photo
upload/replace/reorder/cover, partnership inquiries and contact messages.

**Security** — Supabase Auth for admins + `admin_profiles` allow-list, RLS on every
table, visitors can never read bookings or call the booking function directly
(server only), server-side validation & sanitisation, honeypot + timing anti-spam,
Postgres-backed rate limiting (anonymised IPs), consent checkbox, CSV formula-injection
protection, security headers, `noindex` admin.

**SEO** — localized URLs, `hreflang` + canonical, sitemap with alternates, robots,
Open Graph/Twitter, JSON-LD (`LocalBusiness`, `TouristTrip`), keyword-focused copy
(Senegalese cooking class, Thiéboudiène workshop, Dakar cultural experience).

---

## 2. Content status — please read

Nothing about the business has been invented. Unknown information is shown as a
clearly marked placeholder (dashed style, `[À compléter]` / `[To be completed]`):

| Item | Where to set it |
|---|---|
| Founder's name & biography, project history | `src/config/site.ts` (`founderName`), `messages/fr.json` + `en.json` → `about.founder.bio`, `about.history.text` |
| Email, phone, WhatsApp, address, social links | `src/config/site.ts` (links/buttons stay hidden until set) |
| Price, max group size, address of the workshop | Admin → Expériences (empty price = "Prix à confirmer") |
| Real sessions & capacity | Admin → Séances (the seeded sessions are **SAMPLE**, capacity 8) |
| Testimonials | `src/config/testimonials.ts` — real reviews only; section hidden while empty |
| Photos | See §6 |

The 16 visuals in `public/images/ker-teranga/` are **temporary AI-generated
illustrations** supplied with the brief. Each one carries a small "Illustration"
label on the site and they are never presented as real workshops. The founder
portrait uses a placeholder (never an illustration).

---

## 3. Local development

```bash
cp .env.example .env.local      # fill in the values (see §4–5)
npm install
npm run dev                     # http://localhost:3000 → redirects to /fr
npm run typecheck && npm run build
```

Without Supabase variables the content pages still render (preview data) but
**online booking is disabled** and shows a "coming soon / contact us" panel —
bookings are never simulated.

---

## 4. Supabase setup (≈ 15 min)

1. Create a project at <https://supabase.com> (region: Europe West is closest to Dakar).
2. **SQL Editor** → run, in order:
   1. `supabase/migrations/001_schema.sql` (tables, functions, RLS, realtime)
   2. `supabase/migrations/002_storage.sql` (public `photos` bucket, admin-only uploads)
   3. `supabase/migrations/003_studio.sql` (Kër Téranga Studio: booking requests confirmed by the owner,
      special session prices, announcements, offers, media library, editable site content)
   4. `supabase/migrations/004_media_storage.sql` (public `media` bucket for flyers — images and PDF)
   5. `supabase/seed.sql` (**sample** Thiéboudiène experience + sample sessions + temporary images)
   *(or with the CLI: `supabase link` then `supabase db push`, and run the seed.)*
3. **Project Settings → API**: copy *Project URL*, *anon public* key and *service_role*
   key into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.
4. **Authentication → URL Configuration**: Site URL = your domain; add
   `https://YOUR-DOMAIN/admin/auth/callback` to *Redirect URLs* (magic-link login).
5. **Authentication → Providers → Email**: keep enabled; turn **off** "Allow new users
   to sign up" (admins are invited only).
6. **Database → Replication**: check that `sessions` and `blocked_dates` are in the
   `supabase_realtime` publication (the migration adds them).

### Create the founder's admin account
1. **Authentication → Users → Add user** → email + password (tick *Auto confirm*).
2. SQL Editor:
   ```sql
   insert into public.admin_profiles (user_id, full_name)
   select id, 'Prénom Nom' from auth.users where email = 'founder@example.com';
   ```
3. Sign in at `https://YOUR-DOMAIN/admin`. Give her `docs/GUIDE_ADMIN_FR.md`.

---

## 5. Email setup (Resend)

1. Create an account at <https://resend.com>, add your domain (e.g. `kerteranga.com`)
   and add the DNS records Resend shows (SPF/DKIM) at your DNS provider.
2. Create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM` (verified domain) and
   `NOTIFY_EMAIL` (founder's inbox).
3. Supabase **Authentication → Emails → SMTP**: optionally use Resend SMTP too, so
   magic-link emails come from your domain.

How delivery works: bookings write two `email_outbox` rows inside the booking
transaction. The server tries to send immediately; if Resend is down or not yet
configured, the booking is **still confirmed** and the email stays *pending*. It is
retried with back-off every 10 min by `netlify/functions/email-retry.mts`
(→ `/api/cron/emails`, protected by `CRON_SECRET`), or manually from the dashboard
("Renvoyer maintenant"). After 8 failed attempts it is marked *failed* and shown in
the dashboard.

---

## 6. Photos

- **Recommended:** Admin → Expériences → *Photos*: upload, replace, reorder, choose the
  cover, edit FR/EN descriptions, untick "Illustration" for real photos.
- **Page photos** (home hero, story grid, about page): replace files in
  `public/images/ker-teranga/…` or change paths in `src/config/site.ts` → `photos`,
  and set `illustration: false`. Founder portrait: `photos.founder.src`.
- Recommended sizes: hero 2400×1600 px, others ≥ 1600 px wide, WebP/JPG. Next.js
  serves optimised AVIF/WebP automatically. (The temporary visuals are 758×502 px and
  will look soft on large screens — another reason to replace them.)
- Add `public/images/og.jpg` (1200×630) for social-media previews.

---

## 7. Deploy on Netlify

1. Push this folder to a GitHub repository.
2. Netlify → *Add new site → Import from Git* → choose the repo. Next.js is detected
   automatically (build `npm run build`, settings in `netlify.toml`).
3. *Site configuration → Environment variables*: add every variable from
   `.env.example` (mark `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
   as secret).
4. Deploy, then attach the domain (*Domain management*) and enable HTTPS.
5. Update `NEXT_PUBLIC_SITE_URL` and the Supabase redirect URL with the final domain,
   then redeploy.
6. The scheduled function `email-retry` appears under *Functions* and runs every 10 min.

Other hosts: any platform supporting Next.js 15 server features works; replace the
Netlify scheduled function with a cron that calls
`GET /api/cron/emails` with header `Authorization: Bearer $CRON_SECRET`.

---

## 8. Tests

```bash
bash supabase/tests/run_local_tests.sh     # needs PostgreSQL 15+ binaries locally
```

Runs the schema against a throw-away PostgreSQL and checks: simultaneous requests for
the last seat, 25 parallel requests for 5 seats, automatic *full* status, cancellation
restoring capacity, admin edits/closing/blocking, booking cut-off, unauthorized access
(anonymous & non-admin), email outbox, partnership notifications, persistence.
Results of the last run: `docs/TEST_REPORT.md`.

---

## 9. Project structure

```
messages/                 FR / EN interface text
public/images/ker-teranga temporary illustrations (replace)
src/app/[locale]/         public pages (home, a-propos, experiences, contact, reservation)
src/app/admin/            admin dashboard, login, server actions, CSV export
src/app/api/cron/emails   email retry endpoint
src/app/actions.ts        booking / contact / partnership server actions
src/components/           UI, layout, booking wizard & calendar, admin
src/config/site.ts        contact details, photos  ← edit here
src/lib/                  data access, validation, rate limit, email outbox & templates, SEO
supabase/migrations/      database schema (+ storage)
supabase/seed.sql         SAMPLE data
supabase/tests/           acceptance tests
docs/                     admin guide (FR), production checklist, test report, email previews
```

Adding a new experience requires **no code**: create it in Admin → Expériences, add
photos, publish, then create sessions. It appears automatically in the grid, booking
flow and sitemap.
