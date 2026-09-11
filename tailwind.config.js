/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#b8571f',
        secondary: '#059669',
        accent: '#f59e0b',
        clay: {
          50: '#fdf6ef',
          100: '#faeada',
          200: '#f4d3b3',
          300: '#ecb483',
          400: '#e18e51',
          500: '#d57232',
          600: '#b8571f',
          700: '#9a431c',
          800: '#7c371c',
          900: '#642e1a',
          950: '#361507',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
