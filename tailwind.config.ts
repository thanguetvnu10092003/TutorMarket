import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#E8EBF0",
          100: "#C5CCD9",
          200: "#8B99B3",
          300: "#51668D",
          400: "#1E3A6E",
          500: "#0F2847",
          600: "#0A1628",
          700: "#070F1C",
          800: "#050A13",
          900: "#020509",
        },
        cream: {
          50: "#FDFCFA",
          100: "#FAF8F4",
          200: "#F5F0E8",
          300: "#EDE5D6",
          400: "#E0D4BD",
          500: "#D3C3A4",
        },
        gold: {
          50: "#FBF6E9",
          100: "#F5EAC9",
          200: "#ECD58F",
          300: "#DBBF5C",
          400: "#C9A84C",
          500: "#B8933A",
          600: "#A07D2E",
          700: "#7A5F23",
          800: "#544118",
          900: "#2E230D",
        },
        sage: {
          50: "#EDF4F1",
          100: "#D4E5DE",
          200: "#A9CBBD",
          300: "#7EB19C",
          400: "#4A7C6F",
          500: "#3D6A5E",
          600: "#30584D",
          700: "#23413A",
          800: "#172B26",
          900: "#0B1613",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "scale-in": "scaleIn 0.3s ease-out",
        "gradient-shift": "gradientShift 8s ease infinite",
        shine: "shine 0.6s ease-out",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.4,0,0.2,1) both",
        "slide-in-left": "slideInLeft 0.55s cubic-bezier(0.4,0,0.2,1) both",
        "slide-in-right": "slideInRight 0.55s cubic-bezier(0.4,0,0.2,1) both",
        "border-spin": "borderSpin 4s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shine: {
          "0%": { transform: "translateX(-100%) skewX(-15deg)" },
          "100%": { transform: "translateX(200%) skewX(-15deg)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201,168,76,0)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(201,168,76,0.25)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        borderSpin: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "dot-grid": "radial-gradient(circle, rgba(201,168,76,0.15) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "24px 24px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(10, 22, 40, 0.12)",
        "glass-lg": "0 16px 48px 0 rgba(10, 22, 40, 0.16)",
        gold: "0 4px 20px 0 rgba(201, 168, 76, 0.25)",
        "gold-lg": "0 8px 32px 0 rgba(201, 168, 76, 0.35)",
        sage: "0 4px 20px 0 rgba(74, 124, 111, 0.25)",
        "navy-sm": "0 2px 8px 0 rgba(10, 22, 40, 0.08)",
        "glow-gold": "0 0 24px 4px rgba(201, 168, 76, 0.3)",
        "glow-sage": "0 0 24px 4px rgba(74, 124, 111, 0.3)",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".label-xs": {
          fontSize: "0.625rem",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          lineHeight: "1rem",
        },
        ".label-sm": {
          fontSize: "0.75rem",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          lineHeight: "1rem",
        },
      });
    }),
  ],
};

export default config;
