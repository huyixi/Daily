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
            h1,
            h2,
            h3,
            h4,
            h5: {
              margin: "0",
              "margin-block-start": "0px",
              "margin-block-end": "0px",
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
