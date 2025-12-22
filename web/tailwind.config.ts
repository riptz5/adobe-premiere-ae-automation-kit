import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050910",
        panel: "#0b1220",
        "panel-2": "#0d1625",
        text: "#e9f1ff",
        muted: "#8da0be",
        accent: "#22d3ee",
        "accent-2": "#38bdf8",
        border: "#1c2740"
      }
    }
  },
  plugins: [],
};

export default config;
