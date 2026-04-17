/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        void: "#0A0F1E",
        surface: "#0D1526",
        elevated: "#1A2744",
        border: "#1E3A5F",
        // Accent
        emerald: "#00FF87",
        "tech-blue": "#0EA5E9",
        electric: "#38BDF8",
        gold: "#F59E0B",
        // Typography
        text: "#E2E8F0",
        muted: "#64748B",
        subtle: "#334155",
        // Terminal
        "terminal-bg": "#020B06",
        "terminal-green": "#00FF87",
        "terminal-cyan": "#00D4FF"
      },
      fontFamily: {
        display: ["Geist Mono", "monospace"],
        ui: ["Inter", "sans-serif"],
        terminal: ["JetBrains Mono", "monospace"]
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "serpio-gradient":
          "linear-gradient(135deg, #0A0F1E 0%, #0D1526 50%, #1A2744 100%)"
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite"
      }
    }
  },
  plugins: []
};
