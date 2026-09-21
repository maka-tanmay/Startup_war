/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
      },
      borderWidth: {
        1.5: '1.5px',
      },
    },
  },
  plugins: [],
};
