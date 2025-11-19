/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
      colors: {
        // v0 Design System - Archy Orange
        "archy-orange": "#C85A3C",
        terracotta: {
          DEFAULT: "#C85A3C", // Updated to match v0
          dark: "#B54A32",
          hover: "#B54A32",
          sienna: "#8B4513",
          "burnt-orange": "#CC5500"
        },
        // v0 Design System - Warm Greys
        charcoal: "#2B2D2F",
        "warm-grey": "#6B6B6B",
        "light-grey": "#F5F5F5",
        cream: {
          DEFAULT: "#F5E6D3",
          100: "#F5E6D3",
          50: "#FAF5F0"
        },
        warm: {
          offWhite: "#F5F5F5", // Updated to light-grey
          offWhiteAlt: "#F5E6D3", // Updated to cream
          charcoal: "#2B2D2F", // Updated to match v0
          gray: "#6B6B6B", // Updated to warm-grey
          border: "#E7E5E4",
          dark: "#2B2D2F",
          cream: "#F5E6D3"
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
        },
        sand: "#E8E2D0"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2, 6, 23, 0.08)"
      }
    },
  },
  plugins: [],
};
