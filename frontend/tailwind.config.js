/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0b0f19',
          card: '#141928',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        cyan: {
          primary: '#00ccff',
          secondary: '#0055ff',
        }
      }
    },
  },
  plugins: [],
}
