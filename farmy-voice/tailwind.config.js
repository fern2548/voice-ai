/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      // สีทั้งหมดอ้างอิง CSS variable ที่ประกาศไว้ใน globals.css
      // เปลี่ยนธีมทีเดียวที่ :root / .dark แล้วทั้งเว็บเปลี่ยนตาม
      colors: {
        base: 'rgb(var(--c-base) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        iris: 'rgb(var(--c-iris) / <alpha-value>)',
        aqua: 'rgb(var(--c-aqua) / <alpha-value>)',
        warm: 'rgb(var(--c-warm) / <alpha-value>)',
      },
      maxWidth: {
        stage: '1520px',
      },
      fontSize: {
        display: ['clamp(62px, 8vw, 152px)', { lineHeight: '0.92', letterSpacing: '-0.045em' }],
        statement: ['clamp(38px, 5.2vw, 88px)', { lineHeight: '1.08', letterSpacing: '-0.035em' }],
        section: ['clamp(30px, 3.6vw, 60px)', { lineHeight: '1.12', letterSpacing: '-0.03em' }],
        metric: ['clamp(56px, 8vw, 148px)', { lineHeight: '0.88', letterSpacing: '-0.05em' }],
      },
      spacing: {
        section: 'clamp(100px, 11vw, 160px)',
      },
      keyframes: {
        'ring-expand': {
          '0%': { transform: 'scale(1)', opacity: '0.45' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(0,-26px,0) scale(1.04)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'ring-expand': 'ring-expand 3.4s cubic-bezier(0.22, 0.61, 0.36, 1) infinite',
        drift: 'drift 18s ease-in-out infinite',
        shimmer: 'shimmer 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
