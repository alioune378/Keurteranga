import type { Experience } from '@/lib/types';

/**
 * PREVIEW-ONLY copy of the sample experience (mirrors supabase/seed.sql).
 * Used for content pages only when Supabase is not configured.
 * Online booking is DISABLED in that case — nothing is ever simulated.
 */
const IMG = '/images/ker-teranga';

export const fallbackExperiences: Experience[] = [
  {
    id: 'preview-thieboudiene',
    slug: 'atelier-thieboudiene',
    status: 'published',
    title: { fr: 'Atelier Thiéboudiène', en: 'Thiéboudiène Workshop' },
    summary: {
      fr: "Cuisinez ensemble le plat national du Sénégal et découvrez l'histoire, les gestes et l'art de recevoir qui l'accompagnent.",
      en: "Cook Senegal's national dish together and discover the history, the techniques and the art of hospitality behind it."
    },
    description: {
      fr: "Le thiéboudiène — « riz au poisson » en wolof — est bien plus qu'un plat : c'est un moment de partage et un savoir transmis de génération en génération, inscrit en 2021 au patrimoine culturel immatériel de l'UNESCO. Pendant cet atelier, vous découvrez les ingrédients locaux, préparez le plat ensemble, apprenez les techniques et les secrets de la fondatrice, puis partagez le repas dans l'esprit de la Teranga.",
      en: 'Thiéboudiène — "rice and fish" in Wolof — is far more than a dish: it is a moment of sharing and a know-how handed down through generations, inscribed on UNESCO\'s Intangible Cultural Heritage list in 2021. In this workshop you discover local ingredients, cook the dish together, learn the founder\'s techniques and secrets, then share the meal in the spirit of Teranga.'
    },
    location: {
      fr: 'Rond-point Mermoz, Dakar',
      en: 'Rond-point Mermoz, Dakar'
    },
    duration: { fr: '2h30 – 4h', en: '2.5 – 4 hours' },
    included: {
      fr: [
        'Présentation culturelle avec projection sur écran',
        'Préparation collective du plat',
        'Dégustation et moment de partage',
        '[À compléter : ingrédients, matériel, boissons…]'
      ],
      en: [
        'Cultural presentation with screen projection',
        'Cooking the dish together',
        'Tasting and sharing',
        '[To be completed: ingredients, equipment, drinks…]'
      ]
    },
    steps: {
      fr: [
        { title: 'Accueil & introduction à la Teranga', text: "Les présentations et le sens de l'hospitalité sénégalaise." },
        { title: 'Histoire & importance culturelle du Thiéboudiène', text: "D'où vient le plat, sa place dans la vie familiale et son inscription à l'UNESCO." },
        { title: 'Découverte des ingrédients locaux', text: 'Les produits qui font le goût du thiéboudiène : les observer, les sentir, les comprendre.' },
        { title: 'Préparation collective', text: 'Chacun participe à la préparation du plat.' },
        { title: 'Techniques & secrets', text: 'Les gestes et les astuces transmis par la fondatrice.' },
        { title: 'Dégustation & moment de partage', text: "Le plat préparé ensemble, partagé dans l'esprit de la Teranga." },
        { title: 'Échange autour de la gastronomie & des traditions', text: 'Questions, échanges et conseils pour refaire le plat chez vous.' }
      ],
      en: [
        { title: 'Welcome & introduction to Teranga', text: 'Introductions and the meaning of Senegalese hospitality.' },
        { title: 'History & cultural importance of Thiéboudiène', text: 'Where the dish comes from, its place in family life and its UNESCO listing.' },
        { title: 'Discovering local ingredients', text: 'The products behind the taste of thiéboudiène: look, smell, understand.' },
        { title: 'Cooking together', text: 'Everyone takes part in preparing the dish.' },
        { title: 'Techniques & secrets', text: 'Gestures and tips handed down by the founder.' },
        { title: 'Tasting & sharing', text: 'The dish you cooked together, shared in the spirit of Teranga.' },
        { title: 'Conversation on Senegalese food & traditions', text: 'Questions, conversation and tips to cook the dish again at home.' }
      ]
    },
    languages: ['fr', 'en'],
    price_xof: null,
    min_participants: 1,
    max_participants: null,
    booking_cutoff_hours: 24,
    featured: true,
    sort_order: 1,
    experience_images: [
      { id: 'p0', src: `${IMG}/02_Experiences/fiche-atelier-thieboudiene.webp`, alt: { fr: "Un poste de cuisine prêt pour l'atelier thiéboudiène", en: "A cooking station ready for the thiéboudiène workshop" }, is_cover: true, illustration: false, sort_order: 0 },
      { id: 'p1', src: `${IMG}/03_Atelier/decoupe-ingredients.webp`, alt: { fr: "Une participante émince un oignon sur la terrasse", en: "A participant chops an onion on the terrace" }, is_cover: false, illustration: false, sort_order: 1 },
      { id: 'p2', src: `${IMG}/03_Atelier/marinade-poisson.webp`, alt: { fr: "Une participante ajoute un ingrédient dans le mortier", en: "A participant adds an ingredient to the mortar" }, is_cover: false, illustration: false, sort_order: 2 },
      { id: 'p3', src: `${IMG}/04_Ingredients/poissons-et-legumes.webp`, alt: { fr: "Poisson frais, tomates et légumes du thiéboudiène", en: "Fresh fish, tomatoes and vegetables for thiéboudiène" }, is_cover: false, illustration: false, sort_order: 3 },
      { id: 'p4', src: `${IMG}/03_Atelier/cuisson-poisson.webp`, alt: { fr: "Le plat mijote sur le feu pendant l'atelier", en: "The dish simmering on the stove during the workshop" }, is_cover: false, illustration: false, sort_order: 4 },
      { id: 'p5', src: `${IMG}/05_Culture/moment-degustation.webp`, alt: { fr: "L'animatrice échange avec une participante", en: "The host talking with a participant" }, is_cover: false, illustration: false, sort_order: 5 },
      { id: 'p6', src: `${IMG}/02_Experiences/detail-plat-thieboudiene.webp`, alt: { fr: "Le poste de travail vu de haut : poisson, légumes et ustensiles", en: "The workstation from above: fish, vegetables and utensils" }, is_cover: false, illustration: false, sort_order: 6 }
    ]
  }
];
