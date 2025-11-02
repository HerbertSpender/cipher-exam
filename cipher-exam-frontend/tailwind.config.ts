import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D3A7C',
          accent: '#6B46C1',
          light: '#6366F1',
          dark: '#1E293B',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F9FAFB',
        foreground: '#374151',
        border: '#E5E7EB',
        muted: '#F3F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(45, 58, 124, 0.1)',
        'card-hover': '0 4px 12px rgba(45, 58, 124, 0.15)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;


