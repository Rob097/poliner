import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
          lighter: "var(--primary-lighter)",
        },
        accent: {
          peach: "#FFE4D0",
          butter: "#FFE07A",
          sage: "#B5D4B5",
          sky: "#A8D1FF",
          lavender: "#E8DAFF",
        },
        bg: {
          DEFAULT: "var(--bg)",
          warm: "var(--bg-warm)",
        },
        border: {
          DEFAULT: "var(--border)",
        },
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
        },
      },
      fontFamily: {
        serif: ["Comfortaa", "Trebuchet MS", "sans-serif"],
        sans: ["Quicksand", "Trebuchet MS", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
      maxWidth: {
        app: "430px",
      },
      boxShadow: {
        card: "0 0 60px rgba(0,0,0,0.08)",
        fab: "0 4px 16px rgba(232,103,138,0.35)",
        toast: "0 8px 24px rgba(0,0,0,0.2)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        bounce: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease",
        "slide-up": "slideUp 0.3s ease",
        "slide-in-right": "slideInRight 0.3s ease",
        bounce: "bounce 0.6s ease",
      },
    },
  },
  plugins: [],
};

export default config;
