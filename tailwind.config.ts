import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:             "#0d0d14",
        panel:          "#111118",
        card:           "#1a1a28",
        "card-hover":   "#1e1e32",
        border:         "#1e1e30",
        "text-primary": "#e8e8f0",
        "text-muted":   "#6b7280",
        accent:         "#7c3aed",
        "accent-light": "#a78bfa",
        success:        "#10b981",
        link:           "#60a5fa",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
      },
      animation: {
        blink: "blink 1s step-start infinite",
      },
    },
  },
  plugins: [],
};

export default config;
