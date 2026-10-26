/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastoral: {
          cafe: '#3C2D29',
          profundo: '#281F1C',
          dourado: '#B68B4B',
          'dourado-claro': '#D4AF37',
          vinho: '#8E303B',
          'rosa-antigo': '#D89BA2',
          creme: '#FAF3E9',
          'creme-escuro': '#F3E8D8',
          grafite: '#292625',
          cinza: '#64748B',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'pastoral': '0 4px 20px -2px rgba(60, 45, 41, 0.12), 0 2px 6px -1px rgba(60, 45, 41, 0.08)',
        'pastoral-lg': '0 10px 30px -3px rgba(60, 45, 41, 0.18), 0 4px 10px -2px rgba(60, 45, 41, 0.10)',
        'gold': '0 0 15px rgba(182, 139, 75, 0.35)',
      },
    },
  },
  plugins: [],
}

