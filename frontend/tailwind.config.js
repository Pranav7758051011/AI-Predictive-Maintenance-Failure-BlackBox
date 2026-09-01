/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F5F2",
        "industrial-white": "#FFFFFF",
        "industrial-gray": "#E8EBE7",
        "industrial-gray-dark": "#DCE1DC",
        "industrial-text": "#172126",
        "industrial-subtext": "#59656A",
        "steel-blue": "#234B63",
        "steel-blue-light": "#32627F",
        "steel-blue-dark": "#183746",
        "industrial-orange": "#E85D25",
        "industrial-orange-hover": "#C94718",
        "industrial-amber": "#F97316",
        "industrial-cyan": "#0284C7",
        "industrial-teal": "#0F766E",
        "status-success": "#10B981",
        "status-warning": "#F59E0B",
        "status-failure": "#EF4444",
        "industrial-border": "#D5DAD7",
        "industrial-border-dark": "#B8C0BC",
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        'industrial': '0 2px 10px rgba(23, 33, 38, 0.05)',
        'industrial-card': '0 4px 20px rgba(23, 33, 38, 0.07)',
        'industrial-hover': '0 12px 30px -5px rgba(35, 75, 99, 0.15), 0 4px 12px -2px rgba(232, 93, 37, 0.1)',
        'industrial-lg': '0 10px 30px rgba(23, 33, 38, 0.1)',
        'glow-orange': '0 0 15px rgba(232, 93, 37, 0.35)',
        'glow-blue': '0 0 15px rgba(35, 75, 99, 0.3)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
