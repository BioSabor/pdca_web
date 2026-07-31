import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // #2563eb (color de marca) === blue-600, así que brand es un alias directo
        brand: colors.blue,
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--c-surface) / <alpha-value>)",
          2: "rgb(var(--c-surface-2) / <alpha-value>)",
        },
        line: "rgb(var(--c-line) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / .06), 0 1px 3px 0 rgb(16 24 40 / .10)",
        "card-hover":
          "0 4px 8px -2px rgb(16 24 40 / .10), 0 2px 4px -2px rgb(16 24 40 / .06)",
        overlay:
          "0 20px 25px -5px rgb(0 0 0 / .25), 0 8px 10px -6px rgb(0 0 0 / .20)",
      },
      zIndex: {
        nav: "30",
        banner: "40",
        modal: "50",
        popover: "60",
        toast: "70",
      },
    },
  },
  plugins: [],
};
