/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        yellow: '#FFEB5A',
        pink: '#FF82D7',
        blue: '#005FFF',
        green: '#009D3A',
        noir: '#191923',
        blanc: '#FFFFFF',
        gris: '#EBEBEB',
      },
      fontFamily: {
        display: ['"Arial Narrow"', 'Arial', 'sans-serif'],
        script: ['Yellowtail', 'cursive'],
        body: ['"Arial Narrow"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
