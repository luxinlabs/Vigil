/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vigil: {
          bg: '#0f0f1a',
          card: '#1a1a2e',
          border: '#2a2a4a',
          purple: '#7F77DD',
          green: {
            DEFAULT: '#1D9E75',
            light: '#4ade80'
          },
          yellow: {
            DEFAULT: '#BA7517',
            light: '#fbbf24'
          },
          red: {
            DEFAULT: '#E24B4A',
            light: '#f87171'
          }
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      }
    },
  },
  plugins: [],
}
