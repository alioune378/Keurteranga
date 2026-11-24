/**
 * Kër Téranga — site configuration
 *
 * ⚠️ Values set to `null` are NOT known yet and must be supplied by
 *    Kër Téranga. While null, the site shows a clearly marked placeholder
 *    ("[À compléter]") and hides the corresponding links/buttons.
 *    Never replace them with invented information.
 */
export const site = {
  name: 'Kër Téranga',
  founderName: null as string | null, // [À compléter] — founder's full name
  email: 'hello@kerteranga.com' as string | null,
  phoneDisplay: '+221 77 146 27 18' as string | null,
  phoneHref: '+221771462718' as string | null,
  whatsapp: '221771462718' as string | null, // digits only
  address: {
    street: 'Rond-point Mermoz' as string | null,
    city: 'Dakar',
    country: 'Sénégal',
    countryCode: 'SN'
  },
  /** Google Maps embed query: an exact address once known */
  mapQuery: 'Mermoz, Dakar, Senegal',
  social: {
    instagram: 'https://www.instagram.com/ker.teranga.sn' as string | null,
    facebook: null as string | null, // [À compléter] full URL
    linkedin: null as string | null, // [À compléter] full URL
    tiktok: null as string | null // [À compléter] — the link received was an Instagram URL; add the real TikTok URL
  }
};

export type SitePhoto = {
  src: string | null;
  alt: { fr: string; en: string };
  /** true = temporary AI-generated illustration → labelled "Illustration" on the site */
  illustration?: boolean;
  /** Optional tighter square crop, used where the photo is shown in a circle */
  square?: string;
  /** Optional short silent clip (mp4) shown instead of the photo; the photo is its poster */
  video?: string;
};

const IMG = '/images/ker-teranga';

/**
 * Page photos — real photos from a Kër Téranga workshop (14 November 2026).
 * `src: null` shows a placeholder describing the photo needed.
 */
/** Home banner video (silent loop) — Kër Téranga workshop, 14 November 2026. */
export const heroVideo = { src: '/videos/hero-cuisson.mp4', poster: `${IMG}/01_Accueil/hero-video-poster.webp` };

export const photos = {
  hero: { src: `${IMG}/01_Accueil/hero-thieboudiene.webp`, illustration: false, alt: { fr: 'Une participante épluche une carotte pendant un atelier Kër Téranga', en: 'A participant peels a carrot during a Kër Téranga workshop' } },
  intro: { src: `${IMG}/03_Atelier/pilon-mortier-terrasse.webp`, illustration: false, alt: { fr: 'Une participante pile l\'assaisonnement au mortier sur la terrasse', en: 'A participant pounds the seasoning in the mortar on the terrace' } },
  featured: { src: `${IMG}/01_Accueil/plat-senegalais-photographie.webp`, illustration: false, alt: { fr: 'Un poste de cuisine prêt : poisson, tomates, légumes et mortier', en: 'A cooking station ready: fish, tomatoes, vegetables and a mortar' } },
  storyMarket: { src: `${IMG}/04_Ingredients/etal-marche-dakar-inspire.webp`, illustration: false, alt: { fr: 'Poisson frais, tomates et légumes du thiéboudiène', en: 'Fresh fish, tomatoes and vegetables for thiéboudiène' } },
  storyHands: { src: `${IMG}/03_Atelier/emincer-oignon.webp`, illustration: false, alt: { fr: 'Une participante émince un oignon sur la terrasse', en: 'A participant chops an onion on the terrace' } },
  storyPot: { src: `${IMG}/03_Atelier/mijotage.webp`, video: '/videos/atelier-cuisson.mp4', illustration: false, alt: { fr: 'Le plat mijote sur le feu pendant l\'atelier', en: 'The dish simmering on the stove during the workshop' } },
  storyDetail: { src: `${IMG}/04_Ingredients/produits-locaux.webp`, illustration: false, alt: { fr: 'Le poste de travail vu de haut : poisson, légumes et ustensiles', en: 'The workstation from above: fish, vegetables and utensils' } },
  storyBowl: { src: `${IMG}/05_Culture/convivialite-autour-du-plat.webp`, illustration: false, alt: { fr: 'Une participante ajoute un ingrédient dans le mortier', en: 'A participant adds an ingredient to the mortar' } },
  storyGuests: { src: `${IMG}/05_Culture/experience-repas-collectif.webp`, illustration: false, alt: { fr: 'Échange chaleureux entre l\'animatrice et une participante', en: 'A warm exchange between the host and a participant' } },
  tasting: { src: `${IMG}/05_Culture/echange-animatrice.webp`, illustration: false, alt: { fr: 'L\'animatrice échange avec une participante', en: 'The host talking with a participant' } },
  marinade: { src: `${IMG}/03_Atelier/ajout-mortier.webp`, illustration: false, alt: { fr: 'Une participante ajoute un ingrédient dans le mortier', en: 'A participant adds an ingredient to the mortar' } },
  momentStove: { src: `${IMG}/05_Culture/moment-degustation.webp`, illustration: false, alt: { fr: 'Les participantes aux fourneaux pendant l\'atelier', en: 'Guests at the stove during the workshop' } },
  aboutHeritage: { src: `${IMG}/05_Culture/repas-partage-teranga.webp`, illustration: false, alt: { fr: 'Une participante pile l\'assaisonnement au mortier', en: 'A participant pounds the seasoning in the mortar' } },
  aboutMarket: { src: `${IMG}/04_Ingredients/marche-produits-frais.webp`, illustration: false, alt: { fr: 'Les ingrédients du thiéboudiène prêts pour l\'atelier', en: 'Thiéboudiène ingredients ready for the workshop' } },
  contact: { src: `${IMG}/04_Ingredients/poissons-et-legumes.webp`, illustration: false, alt: { fr: 'Poisson frais, tomates et légumes du thiéboudiène', en: 'Fresh fish, tomatoes and vegetables for thiéboudiène' } },
  // Real portrait required — never use an illustration for the founder
  founder: { src: `${IMG}/06_Fondatrice/fondatrice-portrait.webp`, square: `${IMG}/06_Fondatrice/fondatrice-portrait-carre.webp`, illustration: false, alt: { fr: 'Portrait de la fondatrice de Kër Téranga, souriante, coiffée d\'un bonnet aux couleurs du Sénégal', en: 'Portrait of the founder of Kër Téranga, smiling, wearing a cap in Senegal\'s colours' } }
} satisfies Record<string, SitePhoto>;
