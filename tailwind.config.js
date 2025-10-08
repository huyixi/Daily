/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./themes/daily/layouts/**/*.html"],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            a: {
              "text-decoration": "none",
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
  daisyui: {
    themes: ["cupcake"],
  },
};
