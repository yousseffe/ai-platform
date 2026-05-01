/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef0fc',
          100: '#e0e7ff',
          500: '#5145cd',
          600: '#4338ca',
          700: '#3730a3',
        },
        sidebar: '#ffffff',
        main: '#f8f9fc',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
