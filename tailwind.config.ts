import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        card2: 'rgb(var(--color-card2) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        ink: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        accent: '#e8622a',
        teal: '#2ec4b6',
        gold: '#f5c842',
        purple: '#a78bfa',
        orange: '#f97316'
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      animation: {
        'dojo-walk': 'dojoWalk 6s ease-in-out infinite',
      },
      keyframes: {
        dojoWalk: {
          '0%, 100%': { transform: 'translateX(-30px)' },
          '50%': { transform: 'translateX(30px)' },
        },
      },
    }
  },
  plugins: []
} satisfies Config
