/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark, professional enterprise palette (module 2 design goals)
        base: {
          950: '#0a0e14',
          900: '#0f1620',
          800: '#161f2c',
          700: '#1f2b3a',
          600: '#2b3a4d'
        },
        accent: {
          DEFAULT: '#3b82f6',
          muted: '#1e3a5f'
        },
        risk: {
          low: '#22c55e',
          medium: '#eab308',
          high: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};
