/** @type {import('tailwindcss').Config} */
// ROUTEPAY is dark only. The scales below are written for a near-black ground:
// 50 to 300 are deep tints (fills and borders), 400/500 are the solid accent,
// 600 to 900 get lighter so they read as text on the tints.
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Route green (#2FA8FF): money moving.
        hood: {
          50: '#0A1220',
          100: '#0D1A2E',
          200: '#12294A',
          300: '#1A3F73',
          400: '#6CC4FF',
          500: '#2FA8FF',
          600: '#4DB8FF',
          700: '#7FD0FF',
          800: '#B3E3FF',
          900: '#DDF3FF',
        },
        // Gold: the premium accent.
        gold: {
          50: '#1A1508',
          100: '#271F0B',
          200: '#433512',
          300: '#614D19',
          400: '#F6C343',
          500: '#E9B32A',
          600: '#F1C658',
          700: '#F6D683',
        },
        orange: { 50: '#1D1108', 100: '#2B180A', 200: '#4A2A10', 300: '#6B3D16', 700: '#FFA45C', 800: '#FFC08F' },
        red: { 50: '#1F0C0C', 100: '#2E1010', 200: '#4D1A1A', 300: '#6E2424', 600: '#FF7A7A', 700: '#FF9494' },
        pink: { 100: '#2B0F1D', 200: '#4A1A32', 600: '#FF7DB4', 700: '#FF9CC6' },
        // Negative move colour.
        down: '#FF5C33',
        ink: '#F4F5F4',
        mut: '#8A9099',
        line: '#24272B',
        paper: '#101112',
        ground: '#0A0A0A',
        tile: '#191B1D',
        // Raised dark panel (what used to be the inverted ink panel) and text on a solid accent.
        slab: '#15171A',
        coal: '#0A0A0A',
        tape: '#050505',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Tighter corners and calmer weights than the Tailwind defaults: frames read as
      // instruments, not bubbles, and a heading never shouts.
      borderRadius: { xl: '8px', '2xl': '10px', '3xl': '14px' },
      fontWeight: { bold: '600', extrabold: '620' },
      boxShadow: {
        soft: '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 12px 32px rgba(0, 0, 0, 0.45)',
        glow: '0 0 0 1px rgba(47, 168, 255, 0.35), 0 12px 40px rgba(47, 168, 255, 0.12)',
        gold: '0 0 0 1px rgba(233, 179, 42, 0.25), 0 12px 40px rgba(233, 179, 42, 0.1)',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'float-slow': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        feedIn: { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        wiggle: { '0%, 100%': { transform: 'rotate(-9deg)' }, '50%': { transform: 'rotate(9deg)' } },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -18px) scale(1.12)' },
          '66%': { transform: 'translate(-18px, 16px) scale(0.92)' },
        },
        pop: { '0%': { transform: 'scale(0.8)', opacity: '0' }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        orbit: { from: { transform: 'rotate(0deg) translateX(var(--r)) rotate(0deg)' }, to: { transform: 'rotate(360deg) translateX(var(--r)) rotate(-360deg)' } },
        tick: { '0%': { backgroundColor: 'rgba(47, 168, 255,0.35)' }, '100%': { backgroundColor: 'transparent' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        feedin: 'feedIn 0.4s ease-out',
        wiggle: 'wiggle 0.5s ease-in-out',
        blob: 'blob 14s ease-in-out infinite',
        pop: 'pop 0.4s ease-out',
        orbit: 'orbit 22s linear infinite',
        tick: 'tick 1.2s ease-out',
      },
    },
  },
  plugins: [],
}
