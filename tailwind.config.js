/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#059669',
        accent: '#f59e0b',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
