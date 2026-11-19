# Production readiness checklist — Kër Téranga

Legend: ✅ done in the code · ⬜ to do before launch (needs real information or credentials)

## Content (supplied by Kër Téranga — never invented)
- ⬜ Founder's name (`src/config/site.ts` → `founderName`)
- ⬜ Founder biography + project history (`messages/fr.json` & `en.json` → `about.founder.bio`, `about.history.text`)
- ⬜ Review mission / vision texts (proposed wording) in both languages
- ⬜ Email, phone, WhatsApp, street address, map query, social links (`src/config/site.ts`)
- ⬜ Price per person, max group size, exact location, "what's included" (Admin → Expériences)
- ⬜ Real sessions & capacities; delete or close the SAMPLE sessions (Admin → Séances)
- ⬜ Real photos replacing the 16 AI illustrations; founder portrait; official logo (`src/components/ui/Logo.tsx`)
- ⬜ `public/images/og.jpg` (1200×630) for social sharing
- ⬜ Real testimonials only, with permission (`src/config/testimonials.ts`)
- ⬜ Privacy notice / mentions légales page (recommended: Senegal law 2008-12 on personal data; GDPR for EU visitors)

## Infrastructure
- ⬜ Supabase project created; migrations 001 → 005 applied; seed run
- ⬜ Auth: sign-ups disabled; redirect URL `/admin/auth/callback` added
- ⬜ Founder admin user created + row in `admin_profiles`
- ⬜ Resend: domain verified (SPF/DKIM), `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFY_EMAIL`
- ⬜ Netlify: all env vars set (service role key & secrets marked secret), domain + HTTPS
- ⬜ `CRON_SECRET` set; `email-retry` scheduled function visible in Netlify
- ⬜ Supabase daily backups (Pro plan) or scheduled `pg_dump`
- ⬜ Supabase: enable leaked-password protection & MFA for the admin account (recommended)

## Verification after deploy (≈ 20 min)
- ⬜ `npm run build` passes on Netlify (not runnable in the build environment used to write this code)
- ⬜ FR flow: book a session on `/fr/reservation` → confirmation screen + email in French + admin email
- ⬜ EN flow: same on `/en/booking` → English email
- ⬜ Two browsers on the last seat → one succeeds, the other gets "not enough spots"
- ⬜ Cancel the test booking in Admin → seats restored; cancellation email received
- ⬜ Block a date in Admin → disappears from the public calendar in real time
- ⬜ Upload / replace / reorder a photo in Admin
- ⬜ Partnership form → inquiry in Admin + notification email
- ⬜ Visit `/admin` in a private window → redirected to login; `/admin/bookings/export` → 403 when signed out
- ⬜ Lighthouse (mobile) ≥ 90 performance/accessibility/SEO; Google Rich Results test on an experience page
- ⬜ Submit `https://YOUR-DOMAIN/sitemap.xml` in Google Search Console
- ⬜ Delete test bookings

## Already implemented ✅
- ✅ Atomic booking with row lock, idempotency, cut-off, blocked dates, auto-full/reopen (tested)
- ✅ RLS on all tables; visitors cannot read personal data or call booking RPC directly (tested)
- ✅ Email outbox written in the booking transaction + retries + admin resend (tested at DB level)
- ✅ Server-side validation/sanitisation, honeypot + timing anti-spam, rate limiting, consent
- ✅ Bilingual site & emails, localized URLs, hreflang, canonical, sitemap, robots, OG, JSON-LD
- ✅ Accessible calendar (keyboard, ARIA), focus management, reduced-motion support
- ✅ Admin: sessions (one-off/recurring), blocking, bookings (search/export/edit/cancel), experiences FR/EN, photos, partners, KPIs
