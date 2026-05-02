import { StyleSheet, Platform } from 'react-native';
import { FONT_UI, FONT_BODY } from './typography';

/**
 * Atomic Design System Utilities
 * Powered by SafetyUI Theme Tokens
 */
export const createAtomic = (theme) => {
  const { spacing, shadows, radiusXs, radiusSm, radiusMd, radiusLg, text, textSecondary, textMuted } = theme;

  const filterShadows = (shadowObj) => {
    if (!shadowObj) return {};
    if (Platform.OS !== 'web') return shadowObj;
    const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation, ...webShadow } = shadowObj;
    return webShadow;
  };

  return {
    // Layout
    l: StyleSheet.create({
      flex: { flex: 1 },
      f1: { flex: 1 },
      row: { flexDirection: 'row' },
      col: { flexDirection: 'column' },
      center: { alignItems: 'center', justifyContent: 'center' },
      alignCenter: { alignItems: 'center' },
      aic: { alignItems: 'center' },
      selfCenter: { alignSelf: 'center' },
      justifyCenter: { justifyContent: 'center' },
      jcc: { justifyContent: 'center' },
      justifyBetween: { justifyContent: 'space-between' },
      jcb: { justifyContent: 'space-between' },
      justifyAround: { justifyContent: 'space-around' },
      wrap: { flexDirection: 'row', flexWrap: 'wrap' },
      abs: { position: 'absolute' },
      fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      fillWidth: { width: '100%' },
      overflow: { overflow: 'hidden' },
      zIndex10: { zIndex: 10 },
      zIndex20: { zIndex: 20 },
      zIndex50: { zIndex: 50 },
    }),

    // Spacing (Margins & Padding)
    s: StyleSheet.create({
      // Margin
      m0: { margin: 0 },
      m4: { margin: 4 },
      m8: { margin: 8 },
      m12: { margin: 12 },
      m16: { margin: 16 },
      m20: { margin: 20 },
      m24: { margin: 24 },
      
      mt4: { marginTop: 4 },
      mt8: { marginTop: 8 },
      mt12: { marginTop: 12 },
      mt16: { marginTop: 16 },
      mt20: { marginTop: 20 },
      mt24: { marginTop: 24 },
      mt32: { marginTop: 32 },
      
      mb4: { marginBottom: 4 },
      mb8: { marginBottom: 8 },
      mb12: { marginBottom: 12 },
      mb16: { marginBottom: 16 },
      mb20: { marginBottom: 20 },
      mb24: { marginBottom: 24 },
      mb32: { marginBottom: 32 },

      ml4: { marginLeft: 4 },
      ml8: { marginLeft: 8 },
      ml12: { marginLeft: 12 },
      ml16: { marginLeft: 16 },
      
      mr4: { marginRight: 4 },
      mr8: { marginRight: 8 },
      mr12: { marginRight: 12 },
      mr16: { marginRight: 16 },

      mx4: { marginHorizontal: 4 },
      mx8: { marginHorizontal: 8 },
      mx12: { marginHorizontal: 12 },
      mx16: { marginHorizontal: 16 },
      mx20: { marginHorizontal: 20 },
      mx24: { marginHorizontal: 24 },

      my4: { marginVertical: 4 },
      my8: { marginVertical: 8 },
      my12: { marginVertical: 12 },
      my16: { marginVertical: 16 },
      my20: { marginVertical: 20 },
      my24: { marginVertical: 24 },

      // Padding
      p0: { padding: 0 },
      p4: { padding: 4 },
      p8: { padding: 8 },
      p12: { padding: 12 },
      p16: { padding: 16 },
      p20: { padding: 20 },
      p24: { padding: 24 },

      pt4: { paddingTop: 4 },
      pt8: { paddingTop: 8 },
      pt12: { paddingTop: 12 },
      pt16: { paddingTop: 16 },
      
      pb4: { paddingBottom: 4 },
      pb8: { paddingBottom: 8 },
      pb12: { paddingBottom: 12 },
      pb16: { paddingBottom: 16 },

      px4: { paddingHorizontal: 4 },
      px8: { paddingHorizontal: 8 },
      px12: { paddingHorizontal: 12 },
      px16: { paddingHorizontal: 16 },
      px20: { paddingHorizontal: 20 },
      px24: { paddingHorizontal: 24 },

      py4: { paddingVertical: 4 },
      py8: { paddingVertical: 8 },
      py12: { paddingVertical: 12 },
      py16: { paddingVertical: 16 },
      py20: { paddingVertical: 20 },
    }),

    // Typography
    t: StyleSheet.create({
      h1: { fontSize: 28, fontWeight: '700', color: text, letterSpacing: -0.35, fontFamily: FONT_UI },
      h2: { fontSize: 22, fontWeight: '600', color: text, letterSpacing: -0.2, fontFamily: FONT_UI },
      h3: { fontSize: 18, fontWeight: '600', color: text, fontFamily: FONT_UI },
      h4: { fontSize: 16, fontWeight: '600', color: text, fontFamily: FONT_UI },
      p: { fontSize: 15, fontWeight: '400', color: text, lineHeight: 22, fontFamily: FONT_BODY },
      body: { fontSize: 13, fontWeight: '400', color: textSecondary, lineHeight: 19, fontFamily: FONT_BODY },
      caption: { fontSize: 11, fontWeight: '600', color: textMuted, letterSpacing: 0.35, textTransform: 'uppercase', fontFamily: FONT_UI },
      small: { fontSize: 10, fontWeight: '500', color: textMuted, fontFamily: FONT_UI },
      tiny: { fontSize: 9, fontWeight: '500', color: textMuted, letterSpacing: 0.35, fontFamily: FONT_UI },
      
      // Weight
      bold: { fontWeight: '600' },
      heavy: { fontWeight: '700' },
      semibold: { fontWeight: '600' },
      medium: { fontWeight: '500' },
      light: { fontWeight: '300' },
      
      // Align
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    }),

    // Effects & Radius
    e: StyleSheet.create({
      shadowXs: filterShadows(shadows.xs),
      shadowSm: filterShadows(shadows.sm),
      shadowMd: filterShadows(shadows.md),
      shadowLg: filterShadows(shadows.lg),
      
      roundXs: { borderRadius: radiusXs },
      roundSm: { borderRadius: radiusSm },
      roundMd: { borderRadius: radiusMd },
      roundLg: { borderRadius: radiusLg },
      roundFull: { borderRadius: 9999 },
      
      bordered: { borderWidth: 1.5, borderColor: theme.border || 'rgba(255,255,255,0.1)' },
    })
  };
};
