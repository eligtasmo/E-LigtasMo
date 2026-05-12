import React, { useMemo, useContext, createContext, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  TextInput,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, Stop, Circle, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import * as LucideIcons from 'lucide-react-native';
import { FONT_UI, FONT_BODY, ensureSharedFonts } from '../constants/typography';
export { TextInput };

ensureSharedFonts();
export const DS_FONT_UI = FONT_UI;
export const DS_FONT_INPUT = FONT_BODY;

const flattenStyle = (style) => {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(s => flattenStyle(s)));
  }
  return style;
};

export const DS_BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

export const DS_TACTICAL = {
  bg: '#0A0A0A',
  card: 'rgba(21,17,14,0.94)',
  border: 'rgba(255,255,255,0.07)',
  primary: '#B37213',
  success: '#679949',
  successBorder: 'rgba(120,214,105,0.20)',
  successBg: 'rgba(103,153,73,0.18)',
  text: '#F4F0E8',
  textMuted: 'rgba(242,238,230,0.70)',
  buttonPrimary: '#B37213',
  buttonSecondary: 'rgba(255,255,255,0.08)',
};

export const SimulatorContext = createContext(null);

export const useResponsive = () => {
  const windowDims = useWindowDimensions();
  const simulatorDims = useContext(SimulatorContext);
  const insets = useSafeAreaInsets();
  const GAP = 16;

  // Use simulator dimensions if available, otherwise fallback to real window
  const { width, height } = simulatorDims || windowDims;

  // Safe area aware margins to ensure exactly 16px from edges
  const SAFE_TOP = Math.max((insets?.top || 0), GAP);
  const SAFE_BOTTOM = Math.max((insets?.bottom || 0), GAP);

  const isMobile = width < DS_BREAKPOINTS.tablet;
  const isTablet = width >= DS_BREAKPOINTS.tablet && width < DS_BREAKPOINTS.desktop;
  const isDesktop = width >= DS_BREAKPOINTS.desktop;
  const isLargeScreen = width >= DS_BREAKPOINTS.largeDesktop;

  const horizontalPadding = 16;
  const safeTop = Math.max(insets?.top || 0, 16);

  const safeBottom = Math.max(insets?.bottom || 0, 16);

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    isPortrait: height > width,
    // Maximize width as requested
    contentMaxWidth: 2560,
    horizontalPadding,
    safeTop,
    safeBottom,
    scale: width / 375,
  };
};

export const SimulatorWrapper = ({ children }) => {
  return children;
};

const DS_LAYOUT = {
  contentMaxWidth: 1280,
};

export const ds = { layout: DS_LAYOUT };

// Utility to filter shadows for Web to avoid deprecation warnings
const filterShadows = (shadowObj) => {
  if (!shadowObj) return {};
  if (Platform.OS !== 'web') return shadowObj;

  // On Web, remove shadow* props and keep boxShadow
  const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation, ...webShadow } = shadowObj;
  return webShadow;
};

const Ornament = ({ intensity = 1 }) => {
  const { theme } = useTheme();

  const opacityA = theme.mode === 'dark' ? 0.2 : 0.1;
  const opacityB = theme.mode === 'dark' ? 0.15 : 0.08;
  const a = opacityA * intensity;
  const b = opacityB * intensity;

  return (
    <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { pointerEvents: 'none' }]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgLinearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.primary} stopOpacity={a} />
            <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
          </SvgLinearGradient>
          <SvgLinearGradient id="grad2" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.secondary} stopOpacity={b} />
            <Stop offset="1" stopColor={theme.primary} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx="400" cy="0" r="350" fill="url(#grad1)" />
        <Circle cx="0" cy="400" r="300" fill="url(#grad2)" />
        <Circle cx="400" cy="800" r="250" fill="url(#grad1)" />
      </Svg>
    </View>
  );
};

export const Screen = ({ children, style, withOrnament = false, animate = true }) => {
  const { theme, atomic } = useTheme();
  const { isDesktop, isLargeScreen } = useResponsive();

  const colors = theme.backgroundGradient || [theme.background, theme.background];
  const start = theme.backgroundStart || { x: 0, y: 0 };
  const end = theme.backgroundEnd || { x: 1, y: 1 };

  // Constrain screen width on desktop to maintain "Mobile/Tablet" proportion
  const screenStyle = {};

  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[atomic.l.flex, screenStyle, style]}
    >
      <MotiView
        from={animate ? { opacity: 0 } : {}}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 800 }}
        style={{ flex: 1 }}
      >
        {children}
      </MotiView>
    </LinearGradient>
  );
};

export const Container = ({ children, style, ...props }) => {
  const { contentMaxWidth, horizontalPadding } = useResponsive();
  return (
    <View style={[
      {
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
        paddingHorizontal: horizontalPadding,
      },
      style
    ]} {...props}>
      {children}
    </View>
  );
};

export const Section = ({ children, title, subtitle, style, action, align = 'left', ...props }) => {
  const { theme, atomic } = useTheme();
  return (
    <View style={[atomic.s.mb32, style]} {...props}>
      {(title || action) && (
        <Row align="center" justify="space-between" style={atomic.s.mb16}>
          <Col style={{ flex: 1 }}>
            {title && <Heading size="sm" style={[align === 'center' && atomic.t.center]}>{title}</Heading>}
            {subtitle && <Text style={[atomic.t.caption, { marginTop: 2 }, align === 'center' && atomic.t.center]}>{subtitle}</Text>}
          </Col>
          {action && <View style={atomic.s.ml12}>{action}</View>}
        </Row>
      )}
      {children}
    </View>
  );
};

export const Box = ({ children, style, ...props }) => {
  const { atomic } = useTheme();
  return <View style={[atomic.l.box, style]} {...props}>{children}</View>;
};

export const Row = ({ children, style, align, justify, gap, ...props }) => {
  const { atomic } = useTheme();
  return (
    <View
      style={[
        atomic.l.row,
        align && { alignItems: align },
        justify && { justifyContent: justify },
        gap && { gap },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export const Col = ({ children, style, align, justify, gap, ...props }) => {
  const { atomic } = useTheme();
  return (
    <View
      style={[
        atomic.l.col,
        align && { alignItems: align },
        justify && { justifyContent: justify },
        gap && { gap },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export const Card = ({ children, style, variant = 'elevated', glow = false, rounded = 'lg', elevation = 'sm', shadowIntensity = 'sm', statusColor, noPadding = false, ...props }) => {
  const { theme } = useTheme();
  const { contentMaxWidth, horizontalPadding } = useResponsive();

  const borderRadius = rounded === 'lg' ? 24 : rounded === 'sm' ? 12 : 16;
  const flattenedStyle = flattenStyle(style);
  const activeRadius = flattenedStyle.borderRadius || borderRadius;

  const CardWrapper = variant === 'glass' ? BlurView : View;
  const wrapperProps = variant === 'glass' ? { intensity: 40, tint: 'dark' } : {};

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={[
        {
          borderRadius: activeRadius,
          overflow: 'hidden',
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
        },
        style
      ]}
    >
      <CardWrapper {...wrapperProps} style={{ backgroundColor: '#1A1A1A', borderRadius: activeRadius }}>
        <Row style={{ flex: 1 }}>
          {statusColor && <View style={{ width: 4, backgroundColor: statusColor }} />}
          <View style={{ flex: 1, padding: noPadding ? 0 : 16 }}>
            {children}
          </View>
        </Row>
      </CardWrapper>
    </MotiView>
  );
};

export const Badge = ({ label, variant = 'info', style }) => {
  const { theme } = useTheme();
  const getBadgeColors = () => {
    switch (variant) {
      case 'danger': return { bg: theme.error + '12', text: theme.error };
      case 'success': return { bg: theme.success + '12', text: theme.success };
      case 'warning': return { bg: theme.warning + '12', text: theme.warning };
      default: return { bg: theme.primary + '12', text: theme.primary };
    }
  };
  const colors = getBadgeColors();
  return (
    <View style={[{
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radiusXs,
      backgroundColor: colors.bg,
      alignSelf: 'flex-start'
    }, style]}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, letterSpacing: 1, fontFamily: DS_FONT_UI }}>{label}</Text>
    </View>
  );
};

export const PrimaryButton = ({
  title,
  onPress,
  icon,
  lucideIcon: LucideIconName,
  loading,
  disabled,
  style,
  variant = 'primary',
  size = 'md'
}) => {
  const { theme } = useTheme();

  const getColors = () => {
    if (disabled) return { bg: theme.surfaceVariant, text: theme.textMuted };
    if (variant === 'danger') return { bg: theme.error, text: '#fff' };
    if (variant === 'secondary') return { bg: DS_TACTICAL.successBg, text: '#DDF7D7', border: DS_TACTICAL.successBorder };
    if (variant === 'gray') return { bg: 'rgba(255,255,255,0.06)', text: '#F4F0E8', border: 'rgba(255,255,255,0.08)' };
    if (variant === 'outline') return { bg: 'transparent', text: theme.text, border: 'rgba(255,255,255,0.15)' };
    if (variant === 'tactical') return { bg: '#B37213', text: '#FFFFFF' };
    return { bg: '#F6F2EB', text: '#2A231C' };
  };

  const colors = getColors();
  const IconComponent = LucideIconName ? LucideIcons[LucideIconName] : null;

  return (
    <Pressable onPress={onPress} disabled={disabled || loading}>
      {({ pressed }) => (
        <MotiView
          animate={{
            scale: pressed ? 0.98 : 1,
            backgroundColor: variant === 'outline' ? 'transparent' : colors.bg,
            opacity: pressed ? 0.9 : 1,
          }}
          transition={{ type: 'timing', duration: 100 }}
          style={[
            {
              height: 50, // Increased button height
              borderRadius: 25, // More rounded for pill shape
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: (variant === 'outline' || colors.border) ? 1 : 0,
              borderColor: colors.border || 'transparent',
              flexDirection: 'row',
              paddingHorizontal: 24,
            },
            style
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              {IconComponent && <IconComponent size={16} color={colors.text} style={{ marginRight: 8 }} strokeWidth={2.1} />}
              {!IconComponent && icon && <MaterialCommunityIcons name={icon} size={18} color={colors.text} style={{ marginRight: 8 }} />}
              <Text style={{
                color: colors.text,
                fontWeight: '700', // Bolder text
                fontSize: 14, // Slightly larger
                letterSpacing: -0.2,
                fontFamily: DS_FONT_UI,
              }}>
                {title}
              </Text>
            </>
          )}
        </MotiView>
      )}
    </Pressable>
  );
};

export const TacticalCard = ({ children, style, statusColor, noPadding = false, ...props }) => {
  const { contentMaxWidth } = useResponsive();
  const flattenedStyle = flattenStyle(style);
  const activeRadius = flattenedStyle.borderRadius || 22;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={[
        {
          borderRadius: activeRadius,
          overflow: 'hidden',
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          backgroundColor: DS_TACTICAL.card,
          borderWidth: 1,
          borderColor: DS_TACTICAL.border,
        },
        style
      ]}
      {...props}
    >
      <Row style={{ flex: 1 }}>
        {statusColor && <View style={{ width: 4, backgroundColor: statusColor }} />}
        <View style={{ flex: 1, padding: noPadding ? 0 : 14, borderRadius: activeRadius }}>
          {children}
        </View>
      </Row>
    </MotiView>
  );
};

export const IconBox = ({ name, lucideName, size = 24, color, backgroundColor, style, animate = true }) => {
  const { theme } = useTheme();
  const IconComponent = lucideName ? LucideIcons[lucideName] : null;

  const content = (
    <View style={[
      {
        width: size * 2,
        height: size * 2,
        borderRadius: theme.radiusSm,
        backgroundColor: backgroundColor || theme.primaryBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.border,
      },
      style
    ]}>
      {IconComponent ? (
        <IconComponent size={size} color={color || theme.primary} strokeWidth={2.5} />
      ) : (
        <MaterialCommunityIcons name={name} size={size} color={color || theme.primary} />
      )}
    </View>
  );

  if (!animate) return content;

  return (
    <MotiView
      from={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 12 }}
    >
      {content}
    </MotiView>
  );
};

export const Heading = ({ children, style, size = 'lg', animate = true }) => {
  const { theme } = useTheme();
  const fontSize = size === 'xl' ? 24 : size === 'lg' ? 20 : size === 'md' ? 16 : 14;
  const fontWeight = '700';
  const fontStyle = {
    fontSize,
    fontWeight,
    color: theme.text,
    letterSpacing: -0.4,
    lineHeight: fontSize * 1.2,
    fontFamily: DS_FONT_UI,
  };

  const { contentMaxWidth } = useResponsive();

  const content = typeof children === 'string' ? children.trim() : children;

  if (!animate) return <Text style={[fontStyle, { width: '100%' }, style]}>{content}</Text>;

  return (
    <MotiText
      from={{ opacity: 0, translateY: 5 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600 }}
      style={[fontStyle, { width: '100%' }, style]}
    >
      {content}
    </MotiText>
  );
};

export const Stat = ({ label, value, sub, icon: Icon, color, lucideIcon: LucideIconName }) => {
  const { theme, atomic } = useTheme();
  const IconComponent = LucideIconName ? LucideIcons[LucideIconName] : null;
  return (
    <Col align="center" style={{ flex: 1 }}>
      <View style={[atomic.l.justifyCenter, atomic.l.aic, { width: 48, height: 48, backgroundColor: (color || theme.primary) + '15', borderRadius: theme.radiusSm, marginBottom: 12, borderWidth: 1, borderColor: (color || theme.primary) + '20' }]}>
        {IconComponent ? (
          <IconComponent size={22} color={color || theme.primary} strokeWidth={2.5} />
        ) : Icon && (
          <MaterialCommunityIcons name={Icon} size={24} color={color || theme.primary} />
        )}
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>{value}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, marginTop: 4 }}>{label}</Text>
    </Col>
  );
};

// PageHeader component

export const PageHeader = ({ title, subtitle, onBack, rightElement, withDrawer = false }) => {
  const { theme, atomic } = useTheme();
  const navigation = useNavigation();

  return (
    <Container style={{ paddingTop: 24, paddingBottom: 16 }}>
      <Row align="center" justify="space-between">
        <Col style={{ flex: 1 }}>
          <Row align="center" gap={10} style={{ marginBottom: 12 }}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <LucideIcons.ChevronLeft size={20} color="#F4F0E8" strokeWidth={2.5} />
              </TouchableOpacity>
            )}

            {withDrawer && (
              <TouchableOpacity
                onPress={() => navigation.openDrawer?.()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <LucideIcons.Menu size={20} color="#F4F0E8" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </Row>

          {subtitle && (
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.primary,
              textTransform: 'uppercase',
              letterSpacing: 2,
              marginBottom: 6
            }}>
              {subtitle}
            </Text>
          )}
          <Heading size="lg" animate={false}>{title}</Heading>
        </Col>
        {rightElement && <View style={{ marginLeft: 16 }}>{rightElement}</View>}
      </Row>
    </Container>
  );
};

export const Subheading = ({ children, style }) => {
  const { theme } = useTheme();
  const content = typeof children === 'string' ? children.trim() : children;
  return (
    <Text style={[{ fontSize: 16, fontWeight: '500', color: theme.textSecondary, lineHeight: 24 }, style]}>
      {content}
    </Text>
  );
};

export const Divider = ({ style }) => {
  const { theme } = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.border, marginVertical: 16, opacity: 0.1 }, style]} />;
};

export const ValidationInput = ({
  label,
  error,
  success,
  icon,
  lucideIcon: LucideIconName,
  ...props
}) => {
  const { theme } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const IconComponent = LucideIconName ? LucideIcons[LucideIconName] : null;
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[{ marginBottom: 24, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }, props.style]}>
      {label && (
        <Text style={{
          fontSize: 11,
          fontWeight: '700',
          color: isFocused ? DS_TACTICAL.primary : 'rgba(255,255,255,0.4)',
          marginBottom: 10,
          marginLeft: 4,
          fontFamily: DS_FONT_UI,
          textTransform: 'uppercase',
          letterSpacing: 1.5
        }}>
          {label}
        </Text>
      )}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: error ? '#EF4444' : isFocused ? DS_TACTICAL.primary : 'rgba(255,255,255,0.05)',
        paddingHorizontal: 18,
        height: 50, // Standardized input height
      }}>
        {IconComponent && (
          <IconComponent size={18} color={error ? '#EF4444' : isFocused ? DS_TACTICAL.primary : 'rgba(255,255,255,0.2)'} style={{ marginRight: 12 }} strokeWidth={2.1} />
        )}
        {!IconComponent && icon && <MaterialCommunityIcons name={icon} size={18} color={error ? '#EF4444' : isFocused ? DS_TACTICAL.primary : 'rgba(255,255,255,0.2)'} style={{ marginRight: 12 }} />}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {React.Children.map(props.children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                onFocus: (e) => {
                  setIsFocused(true);
                  child.props.onFocus && child.props.onFocus(e);
                },
                onBlur: (e) => {
                  setIsFocused(false);
                  child.props.onBlur && child.props.onBlur(e);
                },
                placeholderTextColor: 'rgba(255,255,255,0.2)',
                style: [child.props.style, {
                  color: '#FFF',
                  fontSize: 14,
                  fontWeight: '600',
                  fontFamily: DS_FONT_INPUT,
                  height: '100%',
                  padding: 0
                }]
              });
            }
            return child;
          })}
        </View>
        {(error || success) && (
          <View style={{ marginLeft: 8 }}>
            {error && <LucideIcons.AlertCircle size={20} color="#EF4444" />}
            {success && <LucideIcons.CheckCircle2 size={20} color="#22C55E" />}
          </View>
        )}
      </View>
      {error && (
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', marginTop: 8, marginLeft: 4, fontFamily: DS_FONT_UI }}>
          {error}
        </Text>
      )}
    </View>
  );
};
