/** Countries with dial codes. Senegal first, then the most likely visitor origins. */
export interface Country {
  code: string;
  dial: string;
  fr: string;
  en: string;
}

export const countries: Country[] = [
  { code: 'SN', dial: '+221', fr: 'Sénégal', en: 'Senegal' },
  { code: 'FR', dial: '+33', fr: 'France', en: 'France' },
  { code: 'US', dial: '+1', fr: 'États-Unis', en: 'United States' },
  { code: 'CA', dial: '+1', fr: 'Canada', en: 'Canada' },
  { code: 'GB', dial: '+44', fr: 'Royaume-Uni', en: 'United Kingdom' },
  { code: 'BE', dial: '+32', fr: 'Belgique', en: 'Belgium' },
  { code: 'CH', dial: '+41', fr: 'Suisse', en: 'Switzerland' },
  { code: 'DE', dial: '+49', fr: 'Allemagne', en: 'Germany' },
  { code: 'ES', dial: '+34', fr: 'Espagne', en: 'Spain' },
  { code: 'IT', dial: '+39', fr: 'Italie', en: 'Italy' },
  { code: 'NL', dial: '+31', fr: 'Pays-Bas', en: 'Netherlands' },
  { code: 'PT', dial: '+351', fr: 'Portugal', en: 'Portugal' },
  { code: 'LU', dial: '+352', fr: 'Luxembourg', en: 'Luxembourg' },
  { code: 'SE', dial: '+46', fr: 'Suède', en: 'Sweden' },
  { code: 'NO', dial: '+47', fr: 'Norvège', en: 'Norway' },
  { code: 'DK', dial: '+45', fr: 'Danemark', en: 'Denmark' },
  { code: 'IE', dial: '+353', fr: 'Irlande', en: 'Ireland' },
  { code: 'MA', dial: '+212', fr: 'Maroc', en: 'Morocco' },
  { code: 'TN', dial: '+216', fr: 'Tunisie', en: 'Tunisia' },
  { code: 'DZ', dial: '+213', fr: 'Algérie', en: 'Algeria' },
  { code: 'CI', dial: '+225', fr: "Côte d'Ivoire", en: "Côte d'Ivoire" },
  { code: 'ML', dial: '+223', fr: 'Mali', en: 'Mali' },
  { code: 'GN', dial: '+224', fr: 'Guinée', en: 'Guinea' },
  { code: 'GM', dial: '+220', fr: 'Gambie', en: 'Gambia' },
  { code: 'MR', dial: '+222', fr: 'Mauritanie', en: 'Mauritania' },
  { code: 'CV', dial: '+238', fr: 'Cap-Vert', en: 'Cabo Verde' },
  { code: 'BF', dial: '+226', fr: 'Burkina Faso', en: 'Burkina Faso' },
  { code: 'CM', dial: '+237', fr: 'Cameroun', en: 'Cameroon' },
  { code: 'GH', dial: '+233', fr: 'Ghana', en: 'Ghana' },
  { code: 'NG', dial: '+234', fr: 'Nigeria', en: 'Nigeria' },
  { code: 'ZA', dial: '+27', fr: 'Afrique du Sud', en: 'South Africa' },
  { code: 'KE', dial: '+254', fr: 'Kenya', en: 'Kenya' },
  { code: 'BR', dial: '+55', fr: 'Brésil', en: 'Brazil' },
  { code: 'MX', dial: '+52', fr: 'Mexique', en: 'Mexico' },
  { code: 'AE', dial: '+971', fr: 'Émirats arabes unis', en: 'United Arab Emirates' },
  { code: 'SA', dial: '+966', fr: 'Arabie saoudite', en: 'Saudi Arabia' },
  { code: 'QA', dial: '+974', fr: 'Qatar', en: 'Qatar' },
  { code: 'TR', dial: '+90', fr: 'Turquie', en: 'Türkiye' },
  { code: 'CN', dial: '+86', fr: 'Chine', en: 'China' },
  { code: 'JP', dial: '+81', fr: 'Japon', en: 'Japan' },
  { code: 'KR', dial: '+82', fr: 'Corée du Sud', en: 'South Korea' },
  { code: 'IN', dial: '+91', fr: 'Inde', en: 'India' },
  { code: 'AU', dial: '+61', fr: 'Australie', en: 'Australia' }
];
