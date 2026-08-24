import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca violeta-índigo: los tonos 500/600 son los del sistema
        // (#6366f1 / #4f46e5) y sostienen botones, focus y acentos.
        brand: colors.indigo,
        // Acento decorativo (iconos, degradados, realces)
        accent: colors.violet,
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
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        // Sombras tintadas de violeta: se funden con el degradado del fondo
        card: "0 1px 2px 0 rgb(60 40 110 / .05), 0 6px 16px -10px rgb(60 40 110 / .20)",
        "card-hover":
          "0 2px 4px 0 rgb(60 40 110 / .06), 0 14px 30px -12px rgb(60 40 110 / .30)",
        overlay:
          "0 20px 25px -5px rgb(30 20 60 / .25), 0 8px 10px -6px rgb(30 20 60 / .20)",
      },
      zIndex: {
        nav: "30",
        banner: "40",
        modal: "50",
        popover: "60",
        toast: "70",
      },
      screens: {
        // Punto de corte para móviles muy estrechos (iPhone SE / Galaxy S)
        xs: "400px",
      },
    },
  },
  plugins: [],
};
