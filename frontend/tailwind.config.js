/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#030308',
          surface: '#07070f',
          card: '#0c0c18',
          border: '#16162a',
          'border-light': '#1f1f38',
          accent: '#5b5aff',
          'accent-dim': '#4040e0',
          'accent-glow': '#7b7aff',
          'accent-soft': 'rgba(91,90,255,0.12)',
          teal: '#00c9a7',
          'teal-soft': 'rgba(0,201,167,0.12)',
          rose: '#ff3860',
          'rose-soft': 'rgba(255,56,96,0.12)',
          amber: '#ffb300',
          'amber-soft': 'rgba(255,179,0,0.12)',
          muted: '#4b5563',
          text: '#f0f0ff',
          'text-dim': '#8888aa',
          'text-muted': '#444460',
        },
      },
      fontFamily: {
        sans: ['"Geist"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'monospace'],
        display: ['"Cal Sans"', '"Syne"', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2.2s linear infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 7s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'border-flow': 'borderFlow 4s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.93)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-14px) rotate(1deg)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      boxShadow: {
        'glow': '0 0 24px rgba(91, 90, 255, 0.35)',
        'glow-sm': '0 0 12px rgba(91, 90, 255, 0.2)',
        'glow-teal': '0 0 24px rgba(0, 201, 167, 0.3)',
        'card': '0 8px 32px rgba(0,0,0,0.5)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.7)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'float': '0 24px 80px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-subtle': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235b5aff' fill-opacity='0.03'%3E%3Cpath d='M0 0h60v60H0V0zm1 1h58v58H1V1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      backdropBlur: {
        'xs': '2px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
