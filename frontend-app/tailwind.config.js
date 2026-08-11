/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#003d2d', // Forest Green (brand core)
          600: '#00291e',
          700: '#001a13',
          800: '#000f0a',
          900: '#000000',
          950: '#000000',
        },
        lime: {
          500: '#e6ff75',
        },
        accent: {
          50: '#fdf8f6',
          100: '#faece5',
          200: '#f6dcd0',
          300: '#F6C7B3', // Soft Peach
          400: '#eca487',
          500: '#e28261',
          600: '#d36242',
          700: '#b84a28',
          800: '#96371a',
          900: '#752811',
          950: '#421305',
        },
        surface: {
          50: '#001a13', 
          100: '#003d2d', // Dark Forest Green (Main Text)
          200: '#004d39',
          300: '#00664d', 
          400: '#4d8f7e', 
          500: '#8ba4b0',
          600: '#bdcdd3', 
          700: '#e5e9ea', 
          800: '#f0f2f2', // Pills / Subtle backgrounds
          900: '#FFFFFF', // Cards / Containers
          950: '#f4f5f6', // Light grayish-white (Main Canvas)
        },
        success: { 50: '#f3faf7', 100: '#def7ec', 200: '#bcf0da', 300: '#84e1bc', 400: '#3b6653', 500: '#4B8068', 600: '#3e6a56', 700: '#2e5140', 800: '#1d382b', 900: '#0f1a15' }, 
        warning: { 50: '#fbf8f3', 100: '#f6eedf', 200: '#edd8b5', 300: '#e1bd86', 400: '#d29d58', 500: '#B98531', 600: '#a36d26', 700: '#85551c', 800: '#633e14', 900: '#462c12' }, 
        danger: { 50: '#fdf2f2', 100: '#fde8e8', 200: '#fbd5d5', 300: '#f8b4b4', 400: '#9a4646', 500: '#B65353', 600: '#9b4646', 700: '#843535', 800: '#5a2222', 900: '#241010' }, 
        info: { 50: '#ebf5ff', 100: '#e1effe', 200: '#c3ddfd', 300: '#a4cafe', 400: '#266573', 500: '#2F7888', 600: '#266573', 700: '#1d4e5a', 800: '#13353e', 900: '#09181b' }, 
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 4px 14px 0 rgba(47, 120, 136, 0.2)',
        'glow-lg': '0 6px 20px rgba(47, 120, 136, 0.23)',
        'soft': '0 4px 20px -2px rgba(23, 37, 43, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
