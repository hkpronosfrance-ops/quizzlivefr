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
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
