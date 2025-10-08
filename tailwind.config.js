/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./themes/daily/layouts/**/*.html"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
  daisyui: {
    themes: ["cupcake"],
  },
};
