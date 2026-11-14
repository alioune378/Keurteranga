-- ============================================================================
-- Kër Téranga — SAMPLE DATA (données d'exemple)
-- ⚠️ Everything below is SAMPLE content to start from. Values marked
--    "[À compléter]" / NULL must be confirmed by Kër Téranga in the admin
--    dashboard (price, group size, address, sessions, photos).
-- Run AFTER the migrations.
-- ============================================================================

insert into public.experiences (
  slug, status, title, summary, description, location, duration, included, steps,
  languages, price_xof, min_participants, max_participants, booking_cutoff_hours,
  featured, sort_order
) values (
  'atelier-thieboudiene',
  'published',
  '{"fr": "Atelier Thiéboudiène", "en": "Thiéboudiène Workshop"}',
  '{"fr": "Cuisinez ensemble le plat national du Sénégal et découvrez l''histoire, les gestes et l''art de recevoir qui l''accompagnent.",
    "en": "Cook Senegal''s national dish together and discover the history, the techniques and the art of hospitality behind it."}',
  '{"fr": "Le thiéboudiène — « riz au poisson » en wolof — est bien plus qu''un plat : c''est un moment de partage et un savoir transmis de génération en génération, inscrit en 2021 au patrimoine culturel immatériel de l''UNESCO. Pendant cet atelier, vous découvrez les ingrédients locaux, préparez le plat ensemble, apprenez les techniques et les secrets de la fondatrice, puis partagez le repas dans l''esprit de la Teranga.",
    "en": "Thiéboudiène — \"rice and fish\" in Wolof — is far more than a dish: it is a moment of sharing and a know-how handed down through generations, inscribed on UNESCO''s Intangible Cultural Heritage list in 2021. In this workshop you discover local ingredients, cook the dish together, learn the founder''s techniques and secrets, then share the meal in the spirit of Teranga."}',
  '{"fr": "Rond-point Mermoz, Dakar", "en": "Rond-point Mermoz, Dakar"}',
  '{"fr": "2h30 – 4h", "en": "2.5 – 4 hours"}',
  '{"fr": ["Présentation culturelle avec projection sur écran", "Préparation collective du plat", "Dégustation et moment de partage", "[À compléter : ingrédients, matériel, boissons…]"],
    "en": ["Cultural presentation with screen projection", "Cooking the dish together", "Tasting and sharing", "[To be completed: ingredients, equipment, drinks…]"]}',
  '{"fr": [
      {"title": "Accueil & introduction à la Teranga", "text": "Les présentations et le sens de l''hospitalité sénégalaise."},
      {"title": "Histoire & importance culturelle du Thiéboudiène", "text": "D''où vient le plat, sa place dans la vie familiale et son inscription à l''UNESCO."},
      {"title": "Découverte des ingrédients locaux", "text": "Les produits qui font le goût du thiéboudiène : les observer, les sentir, les comprendre."},
      {"title": "Préparation collective", "text": "Chacun participe à la préparation du plat."},
      {"title": "Techniques & secrets", "text": "Les gestes et les astuces transmis par la fondatrice."},
      {"title": "Dégustation & moment de partage", "text": "Le plat préparé ensemble, partagé dans l''esprit de la Teranga."},
      {"title": "Échange autour de la gastronomie & des traditions", "text": "Questions, échanges et conseils pour refaire le plat chez vous."}
    ],
    "en": [
      {"title": "Welcome & introduction to Teranga", "text": "Introductions and the meaning of Senegalese hospitality."},
      {"title": "History & cultural importance of Thiéboudiène", "text": "Where the dish comes from, its place in family life and its UNESCO listing."},
      {"title": "Discovering local ingredients", "text": "The products behind the taste of thiéboudiène: look, smell, understand."},
      {"title": "Cooking together", "text": "Everyone takes part in preparing the dish."},
      {"title": "Techniques & secrets", "text": "Gestures and tips handed down by the founder."},
      {"title": "Tasting & sharing", "text": "The dish you cooked together, shared in the spirit of Teranga."},
      {"title": "Conversation on Senegalese food & traditions", "text": "Questions, conversation and tips to cook the dish again at home."}
    ]}',
  array['fr','en'],
  null,   -- price per person: [À compléter] — set it in the admin dashboard
  1,
  null,   -- maximum group size: [À compléter]
  24,     -- online booking closes 24 h before the session (editable)
  true,
  1
)
on conflict (slug) do nothing;

-- Temporary AI-generated illustrations (labelled "Illustration" on the site).
-- Replace with authentic photos in the admin dashboard.
insert into public.experience_images (experience_id, src, alt, is_cover, illustration, sort_order)
select e.id, v.src, v.alt::jsonb, v.is_cover, true, v.ord
  from public.experiences e,
  (values
    ('/images/ker-teranga/02_Experiences/fiche-atelier-thieboudiene.webp', '{"fr":"Illustration d''un plat de thiéboudiène","en":"Illustration of a thiéboudiène dish"}', true, 0),
    ('/images/ker-teranga/03_Atelier/decoupe-ingredients.webp', '{"fr":"Illustration : découpe des ingrédients","en":"Illustration: cutting the ingredients"}', false, 1),
    ('/images/ker-teranga/03_Atelier/marinade-poisson.webp', '{"fr":"Illustration : préparation du poisson","en":"Illustration: preparing the fish"}', false, 2),
    ('/images/ker-teranga/04_Ingredients/poissons-et-legumes.webp', '{"fr":"Illustration : poissons et légumes","en":"Illustration: fish and vegetables"}', false, 3),
    ('/images/ker-teranga/03_Atelier/cuisson-poisson.webp', '{"fr":"Illustration : cuisson","en":"Illustration: cooking"}', false, 4),
    ('/images/ker-teranga/05_Culture/moment-degustation.webp', '{"fr":"Illustration : moment de dégustation","en":"Illustration: tasting moment"}', false, 5),
    ('/images/ker-teranga/02_Experiences/detail-plat-thieboudiene.webp', '{"fr":"Illustration : détail du plat","en":"Illustration: close-up of the dish"}', false, 6)
  ) as v(src, alt, is_cover, ord)
 where e.slug = 'atelier-thieboudiene'
   and not exists (select 1 from public.experience_images i where i.experience_id = e.id);

-- SAMPLE sessions (capacity 8 is a sample value — adjust in the admin):
-- Tue / Thu / Sat for the next 8 weeks, 10:00–13:30 Dakar time.
insert into public.sessions (experience_id, date, start_time, end_time, capacity, notes)
select e.id, d::date, time '10:00', time '13:30', 8, 'SAMPLE — à confirmer'
  from public.experiences e,
       generate_series((now() at time zone 'Africa/Dakar')::date + 2,
                       (now() at time zone 'Africa/Dakar')::date + 56, interval '1 day') as d
 where e.slug = 'atelier-thieboudiene'
   and extract(isodow from d) in (2, 4, 6)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Make the founder an administrator (after creating her user in
-- Supabase > Authentication > Users > "Add user"):
--
-- insert into public.admin_profiles (user_id, full_name)
--   select id, 'Prénom Nom' from auth.users where email = 'email@exemple.com';
-- ---------------------------------------------------------------------------
