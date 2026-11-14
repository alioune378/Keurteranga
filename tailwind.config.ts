import type { Config } from 'tailwindcss';

/**
 * Kër Téranga — design tokens
 * Deep green (Senegalese flag, deepened), off-white, soft gold, and warm
 * natural tones (terracotta, sand, wood).
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
        forest: {
          50: '#EEF6F1',
          100: '#D4E9DC',
          200: '#A8D2B9',
          300: '#6FB18C',
          400: '#3A8E61',
          500: '#00853F', // flag green
          600: '#0B6B3A',
          700: '#0A5532', // primary
          800: '#08412A',
          900: '#062F1F'
        },
        cream: {
          DEFAULT: '#FBF8F2',
          50: '#FFFEFB',
          100: '#FBF8F2',
          200: '#F4EEE2'
        },
        gold: {
          100: '#FBF0D6',
          200: '#F3DDA6',
          300: '#E9C676',
          400: '#DDAE4E', // accent
          500: '#C9962F',
          600: '#A67821'
        },
        terracotta: {
          100: '#F6E1D6',
          300: '#E0A07E',
          500: '#C0643B',
          700: '#8E4425'
        },
        sand: {
          100: '#F6EFE2',
          200: '#EADCC3',
          300: '#DCC6A0'
        },
        wood: {
          400: '#B08A66',
          500: '#9A7352',
          700: '#6B4E36'
        },
        ink: {
          DEFAULT: '#1D2621',
          soft: '#4A564F',
          muted: '#7A857F'
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'display-xl': ['clamp(2.6rem, 6vw, 4.75rem)', { lineHeight: '1.04', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.1rem, 4.2vw, 3.4rem)', { lineHeight: '1.08', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.6rem, 2.8vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }]
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem'
      },
      boxShadow: {
        soft: '0 1px 2px rgba(29,38,33,.04), 0 8px 24px -8px rgba(29,38,33,.10)',
        lift: '0 2px 4px rgba(29,38,33,.05), 0 24px 48px -16px rgba(29,38,33,.22)'
      },
      transitionTimingFunction: {
        elegant: 'cubic-bezier(.22,.61,.36,1)'
      }
    }
  },
  plugins: []
};

export default config;
