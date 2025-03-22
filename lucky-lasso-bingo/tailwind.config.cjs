/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'ivory': '#faeae4',
          'olivine': '#b5a33a',
          'bluebell': '#5b7fbd',
          'lilac': '#dbc3db',
          'deep-sage': '#5d6d58',
          'dahlia': '#fe6232',
        }
      },
    },
    plugins: [],
  }