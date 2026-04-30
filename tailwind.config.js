/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#b3e5fc",
        // anime.js dark palette
        anime: {
          bg:      "#0f0e17",
          surface: "#1a1a2e",
          card:    "#16213e",
          accent:  "#ff6b6b",
          teal:    "#4ecdc4",
          yellow:  "#ffe66d",
          muted:   "#a8a8b3",
          border:  "#ffffff14",
        }
      }
    },
  },
  plugins: [],
}