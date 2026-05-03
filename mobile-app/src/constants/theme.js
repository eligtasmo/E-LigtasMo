export const lightTheme = {
  mode: 'light',
  primary: '#2F80ED', // Tactical Blue from Auth
  secondary: '#64748B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  glassBorder: 'rgba(47, 128, 237, 0.1)',
  glassBackground: 'rgba(255,255,255,0.85)',
  placeholder: '#94A3B8',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusFull: 99,
  shadows: {
    none: { boxShadow: 'none', shadowOpacity: 0, elevation: 0 },
    xs: { 
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
      boxShadow: '0px 1px 3px rgba(0,0,0,0.05)' 
    },
    sm: { 
      shadowColor: '#2F80ED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
      boxShadow: '0px 4px 8px rgba(47,128,237,0.08)' 
    },
    md: { 
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
      boxShadow: '0px 8px 16px rgba(0,0,0,0.1)' 
    },
    lg: { 
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
      boxShadow: '0px 12px 24px rgba(0,0,0,0.15)' 
    },
    glow: {
        shadowColor: '#2F80ED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8,
        boxShadow: '0px 8px 15px rgba(47,128,237,0.25)'
    }
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

export const darkTheme = {
  mode: 'dark',
  background: '#191A1A', 
  backgroundGradient: ['#191A1A', '#121212'],
  backgroundStart: { x: 0, y: 0 },
  backgroundEnd: { x: 0, y: 1 },
  surface: '#161616',
  surfaceVariant: '#1C1C1E',
  text: '#F4F0E8',
  textSecondary: 'rgba(242,238,230,0.6)',
  textMuted: 'rgba(242,238,230,0.4)',
  placeholder: 'rgba(242,238,230,0.25)',
  primary: '#F6F2EB', // Off-white for primary buttons
  primaryBg: 'rgba(246, 242, 235, 0.1)',
  primaryAccent: '#F59E0B', // Golden Orange for FAB
  secondary: 'rgba(255,255,255,0.06)', 
  secondaryBg: 'rgba(255, 255, 255, 0.03)',
  accent: '#F59E0B',
  accentBg: 'rgba(245, 158, 11, 0.1)',
  border: 'rgba(255,255,255,0.06)',
  borderVariant: 'rgba(255,255,255,0.08)',
  error: '#EF4444', 
  errorBg: 'rgba(239, 68, 68, 0.12)',
  success: '#27AE60',
  successBg: 'rgba(39, 174, 96, 0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.1)',

  glassBackground: 'rgba(22, 22, 22, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  glassShadow: 'rgba(0, 0, 0, 0.6)',

  radiusXs: 8,
  radiusSm: 14,
  radiusMd: 22,
  radiusLg: 28,
  radiusFull: 999,

  shadows: {
    none: { boxShadow: 'none', shadowOpacity: 0, elevation: 0 },
    xs: { 
      shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
      boxShadow: '0px 2px 4px rgba(0,0,0,0.2)' 
    },
    sm: { 
      shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
      boxShadow: '0px 4px 10px rgba(0,0,0,0.3)' 
    },
    md: { 
      shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
      boxShadow: '0px 8px 20px rgba(0,0,0,0.4)' 
    },
    lg: { 
      shadowColor: '#000000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 20,
      boxShadow: '0px 16px 30px rgba(0,0,0,0.5)' 
    },
    glow: { 
      shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
      boxShadow: '0px 4px 12px rgba(245,158,11,0.4)' 
    },
  },

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
};

