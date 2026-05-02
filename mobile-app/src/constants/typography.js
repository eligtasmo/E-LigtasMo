import { Platform } from 'react-native';

export const FONT_UI = Platform.OS === 'web'
  ? "'Outfit', sans-serif"
  : undefined;

export const FONT_BODY = Platform.OS === 'web'
  ? "'Inter', sans-serif"
  : undefined;

export const ensureSharedFonts = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const id = '__eligtasmo_shared_fonts';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
};

ensureSharedFonts();
