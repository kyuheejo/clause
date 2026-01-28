/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#6366F1',
        success: '#22C55E',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}
