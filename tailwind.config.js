/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0A0A18",        // background, near-black indigo
        signal: "#FFD400",       // electric yellow — countdown, emphasis
        pulse: "#FF2D6A",        // hot pink — live/TikTok energy accent
        ink: "#B8B4D9",          // muted lavender-grey — secondary text
        panel: "#14142B",        // card surface
        line: "#242447",         // hairline borders

        // Admin console tokens — broadcast regie aesthetic
        console: {
          bg: "#0D0F0F",
          panel: "#16191A",
          raised: "#1C2021",
          line: "#2A2F30",
          text: "#EDEFEE",
          muted: "#7D8888",
          tally: "#E8342A",
          ready: "#3ECF6E",
          warn: "#F5A623",
        },

        // Auth screen tokens — matches the QuizzLiveFR login mockup
        auth: {
          bg: "#05060C",
          panel: "#0A0C16",
          panelAlt: "#0D0F1C",
          border: "#1D2030",
          text: "#F3F4F8",
          muted: "#8B8FA6",
          mutedDim: "#6B7086",
          blue: "#4C6FFF",
          purple: "#9B4DFF",
          pink: "#FF3D8E",
          danger: "#FF4D6D",
          positive: "#22C55E",
          live: "#EF4444",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
        condensed: ["'Barlow Condensed'", "sans-serif"],
        consolemono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
