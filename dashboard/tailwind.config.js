/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clawd: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9', // Sky blue for Clawdbot
          900: '#0c4a6e',
        },
        poke: {
          500: '#8b5cf6', // Violet for Poke
        },
        agent0: {
          500: '#10b981', // Emerald for Agent Zero
        }
      }
    },
  },
  plugins: [],
}