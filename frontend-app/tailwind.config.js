/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── PAYNO FROSTED DUSK SLATE PALETTE ─────────────────────────────
        // 1. Signature Brand & CTA: Deep Dusk Slate Blue
        primary: {
          50: '#f2f6fa',
          100: '#e4ecf4',
          200: '#cddbe8',
          300: '#adc3d6',
          400: '#87a6c2',
          500: '#6086a8',
          600: '#42688c',
          700: '#345373',
          800: '#2c3e55', // Signature deep dusk button & card gradient top
          900: '#202f42',
          950: '#131e2c',
        },
        // 2. High-Trust Anchor: Midnight Navy / Dusk Slate
        navy: {
          50: '#f2f6fa',
          100: '#e5edf4',
          200: '#d4e0ec',
          300: '#adc3d6',
          400: '#7a95b0',
          500: '#4f7091',
          600: '#385573',
          700: '#2d445d',
          800: '#24364b',
          900: '#1b2a3b', // Deepest authority slate
          950: '#101c29',
        },
        // 3. Frosted Metallic Ice Mist
        frost: {
          50: '#fafcfe',
          100: '#f0f5fa',
          200: '#e4edf5',
          300: '#d7e3ee',
          400: '#c4d4e3',
          500: '#a5bccf',
          600: '#7e9ab3',
          700: '#587693',
          800: '#395673',
          900: '#243c55',
        },
        // 4. Financial Confidence Mint Accent
        mint: {
          50: '#edf9f3',
          100: '#d5f2e3',
          200: '#b1e6cb',
          300: '#81d5ad',
          400: '#4ebd8b',
          500: '#28b072', // Crisp financial approval mint
          600: '#1f955e',
          700: '#1a774d',
          800: '#175e3e',
          900: '#144d34',
          950: '#072b1c',
        },
        // 5. Signature Notification Coral
        coral: {
          50: '#fff5f4',
          100: '#ffe8e6',
          200: '#ffd4cf',
          300: '#ffb2a9',
          400: '#ff8475',
          500: '#ff5b4d', // Signature red/coral notification dot
          600: '#f03e30',
          700: '#cc291d',
          800: '#a6241a',
          900: '#87231c',
        },
        // ─── Frosted Mobile Surface Hierarchy ─
        surface: {
          50: '#0d151e',
          100: '#122436', // Dominant dark ink for headings ("Your Card Your Control")
          200: '#25394d', // Slate body text
          300: '#4b637b', // Secondary subheadings
          400: '#748b9e', // Muted microcopy & labels ("Card Name", "Daily Limit")
          500: '#9cb0c1', // Subtle placeholder
          600: '#cad6e2', // Soft divider lines
          700: '#d8e3ec', // Crisp 1px border matching card edges
          800: '#e8eef5', // Frosted ice pill & circle icons ("NFC Off", "Skip")
          850: '#f2f6fa', // Sub-card containers
          900: '#ffffff', // Pure white sheet cards & modals
          950: '#eff4f8', // Ambient soft misty blue canvas
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fff5f5',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(32, 53, 76, 0.05)',
        'card': '0 14px 34px -8px rgba(32, 53, 76, 0.08), 0 2px 8px -2px rgba(32, 53, 76, 0.04)',
        'pill': '0 4px 14px -2px rgba(32, 53, 76, 0.06)',
        'dusk': '0 10px 24px -4px rgba(44, 62, 85, 0.35)',
        'elevated': '0 20px 25px -5px rgba(32, 53, 76, 0.08), 0 8px 10px -6px rgba(32, 53, 76, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-in-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
