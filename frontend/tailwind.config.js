/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hms: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#115e59',
        }
      }
    },
  },
  plugins: [],
}
