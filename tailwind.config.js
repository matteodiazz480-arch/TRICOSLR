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
          yellow: '#F59E0B',
          'yellow-light': '#FEF3C7',
          'yellow-dark': '#D97706',
          red: '#E11D48',
          'red-dark': '#BE123C',
          orange: '#EA580C',
          'orange-light': '#F97316',
          green: '#10B981',
          'green-dark': '#059669',
          teal: '#0D9488',
          purple: '#7C3AED',
          blue: '#2563EB',
          cream: '#F8FAFC',
          'cream-dark': '#F1F5F9',
          card: '#FFFFFF',
          ink: '#0F172A',
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        sub: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgba(15, 23, 42, 0.04)',
        'xs': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'cartoon-xs': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'cartoon-sm': '0 1px 3px 0 rgba(15, 23, 42, 0.07), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'cartoon': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'cartoon-lg': '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.06)',
        'cartoon-xl': '0 20px 35px -8px rgba(15, 23, 42, 0.16), 0 8px 16px -4px rgba(15, 23, 42, 0.08)',
        'cartoon-white': '0 4px 12px rgba(255, 255, 255, 0.15)',
        'cartoon-inset': 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
      },
      borderWidth: {
        '3': '1.5px',
        '4': '2px',
        '5': '2px',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      animation: {
        wiggle: 'wiggle 3s ease-in-out infinite',
        bob: 'bob 4s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
        'pop-in': 'popIn 0.22s ease-out forwards',
        marquee: 'marquee 28s linear infinite',
      }
    },
  },
  plugins: [],
}
