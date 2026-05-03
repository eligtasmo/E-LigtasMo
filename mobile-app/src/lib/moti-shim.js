/**
 * Lightweight drop-in replacement for moti.
 * Uses React Native's built-in Animated API instead of Reanimated,
 * avoiding the Reanimated v4 incompatibility that crashes Expo Go SDK 54.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Platform } from 'react-native';

/**
 * MotiView — animates a View with `from`, `animate`, and `exit` props.
 * Supports style passthrough and all standard View props.
 */
export const MotiView = React.forwardRef(({
  from = {},
  animate = {},
  exit,
  transition = {},
  style,
  children,
  ...rest
}, ref) => {
  const duration = transition?.duration ?? 300;

  // Build animated values for each property we need to animate
  const animKeys = Object.keys({ ...from, ...animate });
  const animValues = useRef({});

  // Initialize animated values once
  if (Object.keys(animValues.current).length === 0) {
    animKeys.forEach(key => {
      const initial = from[key] ?? animate[key] ?? 0;
      animValues.current[key] = new Animated.Value(typeof initial === 'number' ? initial : 0);
    });
  }

  useEffect(() => {
    const animations = animKeys
      .filter(key => animate[key] !== undefined && animValues.current[key])
      .map(key =>
        Animated.timing(animValues.current[key], {
          toValue: typeof animate[key] === 'number' ? animate[key] : 1,
          duration,
          useNativeDriver: Platform.OS !== 'web',
        })
      );

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [JSON.stringify(animate)]);

  // Map animated values to style
  const animatedStyle = {};
  const transformKeys = ['translateX', 'translateY', 'scale', 'rotate', 'scaleX', 'scaleY'];
  const transforms = [];

  animKeys.forEach(key => {
    if (!animValues.current[key]) return;
    if (transformKeys.includes(key)) {
      transforms.push({ [key]: animValues.current[key] });
    } else {
      animatedStyle[key] = animValues.current[key];
    }
  });

  if (transforms.length > 0) {
    animatedStyle.transform = transforms;
  }

  return (
    <Animated.View ref={ref} style={[style, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
});

MotiView.displayName = 'MotiView';

/**
 * MotiText — same concept but for Text elements.
 */
export const MotiText = React.forwardRef(({
  from = {},
  animate = {},
  transition = {},
  style,
  children,
  ...rest
}, ref) => {
  const duration = transition?.duration ?? 300;
  const opacityVal = useRef(new Animated.Value(from.opacity ?? animate.opacity ?? 1)).current;

  useEffect(() => {
    if (animate.opacity !== undefined) {
      Animated.timing(opacityVal, {
        toValue: animate.opacity,
        duration,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [animate.opacity]);

  return (
    <Animated.Text ref={ref} style={[style, { opacity: opacityVal }]} {...rest}>
      {children}
    </Animated.Text>
  );
});

MotiText.displayName = 'MotiText';

/**
 * AnimatePresence — simplified version that just renders children.
 * The real moti AnimatePresence handles mount/unmount animations,
 * but for stability we just pass through.
 */
export const AnimatePresence = ({ children }) => {
  return <>{children}</>;
};
