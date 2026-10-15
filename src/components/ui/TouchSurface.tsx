import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Shared native press response. Transform does not move neighbouring list items.
export function TouchSurface({ style, onPressIn, onPressOut, onFocus, onBlur, onHoverIn, onHoverOut, ...props }: PressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (reduceMotion) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [reduceMotion, scale]);
  const animate = (toValue: number) => {
    scale.stopAnimation();
    if (reduceMotion) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue, speed: 38, bounciness: 0, useNativeDriver: true }).start();
  };
  return <AnimatedPressable
    {...props}
    onPressIn={event => { setPressed(true); animate(0.975); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); animate(1); onPressOut?.(event); }}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={[typeof style === 'function' ? style({ pressed, hovered }) : style, { transform: [{ scale }] }, focused && styles.focused]}
  />;
}
const styles = StyleSheet.create({ focused: { outlineWidth: 2, outlineColor: colors.accent, outlineOffset: 2 } });
