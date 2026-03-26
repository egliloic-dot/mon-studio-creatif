/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0A0A0A',
          surface: '#111111',
          border: '#1E1E1E',
          accent: '#7C3AED',
          'accent-glow': '#9D5CFF',
          text: '#E5E5E5',
          muted: '#6B7280',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
