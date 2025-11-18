/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: "#C87B5A",
          dark: "#A85F43",
          hover: "#B4694E",
          sienna: "#8B4513",
          "burnt-orange": "#CC5500"
        },
        warm: {
          offWhite: "#FAFAF9",
          offWhiteAlt: "#F5F5F4",
          charcoal: "#1C1917",
          gray: "#78716C",
          border: "#E7E5E4",
          dark: "#292524",
          cream: "#FFF8F0"
        },
        // Legacy amber - keeping for backward compatibility during transition
        amber: {
          DEFAULT: "#C87B5A", // Maps to terracotta
          hover: "#B4694E", // Maps to terracotta hover
          dark: "#A85F43" // Maps to terracotta dark
        },
        brand: {
          900: "#0C1117",
          800: "#111827",
          700: "#1F2937",
          600: "#334155",
          500: "#475569",
          400: "#64748B",
          300: "#94A3B8",
          200: "#CBD5E1",
          100: "#E2E8F0"
        },
        accent: {
          500: "#C87B5A" // Terracotta
        },
        ali: {
          charcoal: "#1D1F21",
          indigoSteel: "#2B3A67",
          oxblood: "#6A1B1A",
          sand: "#E8E2D0",
          offWhite: "#F8F7F3"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2, 6, 23, 0.08)"
      }
    },
  },
  plugins: [],
};
