/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090d",
          900: "#0c0e14",
          850: "#11141c",
          800: "#161a24",
          700: "#1e2432",
          600: "#2a3142",
        },
        accent: {
          DEFAULT: "#6d5efc",
          soft: "#8b7dff",
          400: "#8b7dff",
          500: "#6d5efc",
          600: "#5a49f0",
        },
        danger: "#ff5c72",
        warn: "#ffb020",
        ok: "#37d399",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(109,94,252,0.55)",
        card: "0 8px 30px -12px rgba(0,0,0,0.7)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
