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
  mapQuery: 'Rond-point Mermoz, Dakar, Sénégal',
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
};

const IMG = '/images/ker-teranga';

/**
 * Page photos. The current files are TEMPORARY AI-generated illustrations
 * (Ker_Teranga_Images_Temporaires). Replace each `src` with an authentic
 * Kër Téranga photo, then set `illustration: false`.
 * `src: null` shows a placeholder describing the photo needed.
 */
export const photos = {
  hero: { src: `${IMG}/01_Accueil/hero-thieboudiene.webp`, illustration: true, alt: { fr: 'Illustration : plat de thiéboudiène', en: 'Illustration: a thiéboudiène dish' } },
  intro: { src: `${IMG}/03_Atelier/preparation-herbes.webp`, illustration: true, alt: { fr: 'Illustration : préparation des herbes', en: 'Illustration: preparing herbs' } },
  featured: { src: `${IMG}/01_Accueil/plat-senegalais-photographie.webp`, illustration: true, alt: { fr: 'Illustration : plat sénégalais', en: 'Illustration: Senegalese dish' } },
  storyMarket: { src: `${IMG}/04_Ingredients/etal-marche-dakar-inspire.webp`, illustration: true, alt: { fr: 'Illustration : étal de marché', en: 'Illustration: market stall' } },
  storyHands: { src: `${IMG}/03_Atelier/decoupe-ingredients.webp`, illustration: true, alt: { fr: 'Illustration : découpe des ingrédients', en: 'Illustration: cutting ingredients' } },
  storyPot: { src: `${IMG}/03_Atelier/cuisson-poisson.webp`, illustration: true, alt: { fr: 'Illustration : cuisson', en: 'Illustration: cooking' } },
  storyDetail: { src: `${IMG}/04_Ingredients/produits-locaux.webp`, illustration: true, alt: { fr: 'Illustration : produits locaux', en: 'Illustration: local produce' } },
  storyBowl: { src: `${IMG}/05_Culture/convivialite-autour-du-plat.webp`, illustration: true, alt: { fr: 'Illustration : convivialité autour du plat', en: 'Illustration: gathering around the dish' } },
  storyGuests: { src: `${IMG}/05_Culture/experience-repas-collectif.webp`, illustration: true, alt: { fr: 'Illustration : repas collectif', en: 'Illustration: shared meal' } },
  tasting: { src: `${IMG}/05_Culture/moment-degustation.webp`, illustration: true, alt: { fr: 'Illustration : moment de dégustation', en: 'Illustration: tasting together' } },
  marinade: { src: `${IMG}/03_Atelier/marinade-poisson.webp`, illustration: true, alt: { fr: 'Illustration : préparation du poisson', en: 'Illustration: preparing the fish' } },
  aboutHeritage: { src: `${IMG}/05_Culture/repas-partage-teranga.webp`, illustration: true, alt: { fr: 'Illustration : repas partagé', en: 'Illustration: shared meal' } },
  aboutMarket: { src: `${IMG}/04_Ingredients/marche-produits-frais.webp`, illustration: true, alt: { fr: 'Illustration : marché de produits frais', en: 'Illustration: fresh produce market' } },
  contact: { src: `${IMG}/04_Ingredients/poissons-et-legumes.webp`, illustration: true, alt: { fr: 'Illustration : poissons et légumes', en: 'Illustration: fish and vegetables' } },
  // Real portrait required — never use an illustration for the founder
  founder: { src: null, alt: { fr: 'Portrait de la fondatrice', en: 'Portrait of the founder' } }
} satisfies Record<string, SitePhoto>;
