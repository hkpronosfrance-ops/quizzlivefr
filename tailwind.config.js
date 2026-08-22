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
