/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        warm: {
          offWhite: "#FAFAF9",
          charcoal: "#1C1917",
          gray: "#78716C",
          border: "#E7E5E4",
          dark: "#292524"
        },
        amber: {
          DEFAULT: "#F59E0B",
          hover: "#FCD34D",
          dark: "#B45309"
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
          500: "#F59E0B"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2, 6, 23, 0.08)"
      }
    },
  },
  plugins: [],
};
