/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        parede: "#f4f0e8", // gesso da parede
        gesso: "#fbf9f4", // passe-partout e etiquetas
        tinta: "#1b1916",
        grafite: "#6b655b",
        ponto: "#e2452c", // o ponto vermelho das galerias
        dourado: "#b98f3f",
      },
    },
  },
  plugins: [],
};
