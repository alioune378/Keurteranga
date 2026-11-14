import type { Config } from 'tailwindcss';

/**
 * Kër Téranga — design tokens
 * Pure white background, deep forest green (#123D2D), muted gold (#C9A35D)
 * for CTAs and details, terracotta (#C16B45) as a secondary accent only.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', md: '2rem', lg: '2.5rem' },
      screens: { '2xl': '1280px' }
    },
    extend: {
      colors: {
        // Deep forest green — brand, typography, selective sections, footer
        forest: {
          50: '#EFF4F1',
          100: '#DCE7E0',
          200: '#B5CBBF',
          300: '#82A694',
          400: '#4E7D66',
          500: '#2B5E47',
          600: '#1C4D39',
          700: '#123D2D', // primary
          800: '#0E3226',
          900: '#0A261D'
        },
        // Primary background is pure white (legacy "cream" name kept for compatibility)
        cream: {
          DEFAULT: '#FFFFFF',
          50: '#FFFFFF',
          100: '#FFFFFF',
          200: '#F7F7F4'
        },
        // Muted gold — primary CTAs and fine details, used sparingly
        gold: {
          100: '#F8F2E4',
          200: '#EDDFC0',
          300: '#DDC48F',
          400: '#C9A35D', // accent
          500: '#B08A45',
          600: '#8C6C33'
        },
        // Terracotta — secondary accent only
        terracotta: {
          100: '#F8E8E0',
          300: '#DD9E80',
          500: '#C16B45',
          700: '#8E4A2C'
        },
        // Neutral hairlines & quiet surfaces (no beige backgrounds)
        sand: {
          100: '#F6F6F3',
          200: '#E8E8E3',
          300: '#D5D5CE'
        },
        wood: {
          400: '#8A8F8B',
          500: '#6E746F',
          700: '#4B514D'
        },
        ink: {
          DEFAULT: '#14211B',
          soft: '#4A5750',
          muted: '#6B7770'
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
      },
      fontSize: {
        // Warm grotesque headings — confident but never oversized
        'display-2xl': ['clamp(2.1rem, 5.4vw, 3.9rem)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        'display-xl': ['clamp(1.9rem, 4.2vw, 3.1rem)', { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-lg': ['clamp(1.65rem, 3.3vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.35rem, 2.3vw, 1.8rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }]
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem'
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,38,29,.04), 0 8px 24px -8px rgba(10,38,29,.10)',
        lift: '0 2px 4px rgba(10,38,29,.05), 0 24px 48px -16px rgba(10,38,29,.22)'
      },
      transitionTimingFunction: {
        elegant: 'cubic-bezier(.22,.61,.36,1)'
      }
    }
  },
  plugins: []
};

export default config;
