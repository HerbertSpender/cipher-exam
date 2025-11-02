/**
 * Design Tokens for CipherExam
 * Seed: sha256("CipherExam" + "Sepolia" + "202501") = 7b6fd71b524cf8c9ad0db32ba89a60ee17f88a7032b34a84382aaa1869040398
 * Deterministic design system derived from seed
 */

export const designTokens = {
  colors: {
    light: {
      primary: {
        main: '#2D3A7C',      // Deep indigo (from seed 52)
        accent: '#6B46C1',     // Violet (from seed 4c)
        light: '#6366F1',
        dark: '#1E293B',
      },
      success: '#10B981',     // Emerald (from seed ad)
      warning: '#F59E0B',      // Amber (from seed 0d)
      error: '#EF4444',
      neutral: {
        background: '#F9FAFB',
        foreground: '#374151',
        border: '#E5E7EB',
        muted: '#F3F4F6',
      },
    },
    dark: {
      primary: {
        main: '#0F172A',       // Deep space blue
        accent: '#7C3AED',      // Indigo violet
        light: '#8B5CF6',
        dark: '#020617',
      },
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      neutral: {
        background: '#0F172A',
        foreground: '#F1F5F9',
        border: '#334155',
        muted: '#1E293B',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      compact: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '24px',
        '2xl': '32px',
      },
      comfortable: {
        xs: '14px',
        sm: '16px',
        base: '18px',
        lg: '20px',
        xl: '28px',
        '2xl': '36px',
      },
    },
    lineHeight: {
      compact: 1.5,
      comfortable: 1.75,
    },
  },
  spacing: {
    scale: [4, 8, 12, 16, 24, 32, 48, 64],
    unit: 'px',
  },
  borderRadius: {
    compact: '8px',
    comfortable: '12px',
  },
  shadows: {
    card: '0 2px 8px rgba(45, 58, 124, 0.1)',
    hover: '0 4px 12px rgba(45, 58, 124, 0.15)',
  },
  transitions: {
    duration: '200ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  breakpoints: {
    mobile: '640px',
    tablet: '768px',
    desktop: '1024px',
  },
  density: {
    compact: {
      padding: {
        button: '12px 16px',
        card: '16px',
        input: '12px',
      },
      gap: '8px',
    },
    comfortable: {
      padding: {
        button: '16px 20px',
        card: '24px',
        input: '16px',
      },
      gap: '12px',
    },
  },
} as const;

export type DesignTokens = typeof designTokens;


