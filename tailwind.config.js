/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cartoon: {
          yellow: '#FFC93C',
          'yellow-light': '#FFEAA7',
          'yellow-dark': '#E0A800',
          red: '#FF4757',
          'red-dark': '#D63031',
          orange: '#FF7F11',
          'orange-light': '#FFA502',
          green: '#2ED573',
          'green-dark': '#20BF6B',
          teal: '#2BCBBA',
          purple: '#8854D0',
          blue: '#1E90FF',
          cream: '#FFFDF6',
          'cream-dark': '#F7EED6',
          card: '#FFFFFF',
          ink: '#1E1B18',
        }
      },
      fontFamily: {
        display: ['"Lilita One"', 'cursive', 'sans-serif'],
        sub: ['"Fredoka"', 'cursive', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cartoon-xs': '1.5px 1.5px 0px #1E1B18',
        'cartoon-sm': '2px 2px 0px #1E1B18',
        'cartoon': '4px 4px 0px #1E1B18',
        'cartoon-lg': '6px 6px 0px #1E1B18',
        'cartoon-xl': '8px 8px 0px #1E1B18',
        'cartoon-white': '4px 4px 0px #FFFFFF',
        'cartoon-inset': 'inset 2px 2px 0px rgba(255,255,255,0.4), inset -2px -2px 0px rgba(0,0,0,0.15)',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1.5deg)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(10px)' },
          '70%': { transform: 'scale(1.05) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      animation: {
        wiggle: 'wiggle 2s ease-in-out infinite',
        bob: 'bob 3.5s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pop-in': 'popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        marquee: 'marquee 22s linear infinite',
      }
    },
  },
  plugins: [],
}
