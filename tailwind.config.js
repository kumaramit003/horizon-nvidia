/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Instrument Serif"', 'Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        cream: {
          50:  '#FDFBF6',
          100: '#F7F3EC',
          200: '#EFE8DA',
          300: '#E5DDCB',
        },
        ink: {
          900: '#181612',
          800: '#2A2620',
          700: '#3F3933',
          500: '#6B655B',
          400: '#8B857A',
          300: '#A8A199',
          200: '#C9C3B8',
          100: '#E5DFD3',
        },
        peach: {
          50:  '#FFF6EE',
          100: '#FFE9D6',
          200: '#FFD2B0',
          300: '#FFB582',
          400: '#FF9259',
          500: '#FF6B3D',
          600: '#E04E1F',
        },
        lavender: {
          50:  '#F4F0FF',
          100: '#E8E0FF',
          200: '#D2C4FF',
          300: '#B19BFF',
          400: '#8C70FF',
          500: '#6B4DFF',
        },
        mint: {
          50:  '#EAFAEF',
          100: '#D2F2DC',
          200: '#A8E2BA',
          300: '#7DCC93',
        },
        sky: {
          50:  '#EAF3FB',
          100: '#D3E6F5',
          200: '#A8C9E8',
          300: '#7AABD4',
        },
        butter: {
          100: '#FFF1B8',
          200: '#FFE48A',
          300: '#FFD659',
        },
        rose: {
          100: '#FFD9DC',
          200: '#FFB3B8',
          300: '#FF8A91',
        },
      },
      boxShadow: {
        soft: '0 1px 0 rgba(24,22,18,0.04), 0 6px 16px -8px rgba(24,22,18,0.08)',
        lift: '0 2px 4px rgba(24,22,18,0.04), 0 24px 48px -16px rgba(24,22,18,0.12)',
        ring: '0 0 0 4px rgba(255,107,61,0.10)',
      },
      keyframes: {
        breathe: { '0%,100%': { transform: 'scale(1)', opacity: 0.85 }, '50%': { transform: 'scale(1.04)', opacity: 1 } },
        ringOut: { '0%': { transform: 'scale(1)', opacity: 0.55 }, '100%': { transform: 'scale(1.6)', opacity: 0 } },
        wave:    { '0%,100%': { transform: 'scaleY(0.25)' }, '50%': { transform: 'scaleY(1)' } },
        floaty:  { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        typecursor: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
      },
      animation: {
        breathe: 'breathe 3.2s ease-in-out infinite',
        ringOut: 'ringOut 2.4s ease-out infinite',
        wave:    'wave 1s ease-in-out infinite',
        floaty:  'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        cursor:  'typecursor 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
