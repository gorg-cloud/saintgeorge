import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        church: {
          50: "#fbf8f3",
          100: "#f5eee2",
          200: "#e9dac4",
          300: "#d9c09f",
          400: "#c4a074",
          500: "#b58752",
          600: "#9c6e41",
          700: "#7e5436",
          800: "#684530",
          900: "#573b2a",
        },
        coptic: {
          gold: "#d4af37",
          crimson: "#9b111e",
          blue: "#1b3f75",
          teal: "#0f766e"
        }
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
