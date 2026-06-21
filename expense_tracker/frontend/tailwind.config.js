/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#ced9fd',
          300: '#b1c2fc',
          400: '#7795fa',
          500: '#3d68f8',
          600: '#375edf',
          700: '#2e4ebc',
          800: '#253e96',
          900: '#1e337b',
        },
      },
    },
  },
  plugins: [],
}
