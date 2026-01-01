/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk palette from Section 5
        'cyber-bg': '#0d0d0d',
        'cyber-cyan': '#00f3ff',
        'cyber-red': '#ff2a2a',
        'cyber-green': '#00ff41',
      },
    },
  },
  plugins: [],
}
