import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { canvas: '#090909', panel: '#141414', water: '#4CA7FF' },
      boxShadow: { glow: '0 12px 40px rgba(44, 141, 255, .22)' }
    }
  },
  plugins: []
} satisfies Config
