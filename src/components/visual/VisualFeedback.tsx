import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { AppText } from '../ui';
import { spacing } from '../../theme';

const animations = {
  barcode: require('../../assets/animations/barcode.json'),
  search: require('../../assets/animations/search.json'),
  check: require('../../assets/animations/check.json'),
  film: require('../../assets/animations/film.json'),
};
export function VisualFeedback({ animation, label, size, loop = animation !== 'check', onFinish }: {
  animation: keyof typeof animations; label?: string; size?: number; loop?: boolean; onFinish?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const prominent = size === undefined && (animation === 'search' || animation === 'barcode');
  const dimension = size ?? (prominent ? Math.min(width - spacing.page * 2, spacing.xl * 15) : spacing.xl * 2);
  const aspectRatio = animations[animation].w / animations[animation].h;
  const [loadedAnimation, setLoadedAnimation] = useState<keyof typeof animations | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const player = useRef<LottieView>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => { if (mounted) setReducedMotion(true); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (loadedAnimation !== animation) return;
    if (reducedMotion === false && active) player.current?.play();
    else player.current?.pause();
  }, [loadedAnimation, animation, reducedMotion, active]);
  return <View style={[styles.feedback, prominent && { minHeight: Math.min(height * 0.45, dimension * 1.2) }]} accessibilityLiveRegion="polite">
    <LottieView key={animation} ref={player} source={animations[animation]} autoPlay={false} onAnimationLoaded={() => setLoadedAnimation(animation)} loop={loop} progress={reducedMotion ? (animation === 'check' ? 0.99 : 0.5) : undefined} speed={0.8} resizeMode="contain" style={{ width: dimension, height: dimension / aspectRatio }} onAnimationFinish={cancelled => { if (!cancelled && reducedMotion === false) onFinish?.(); }} />
    {label && <AppText color="textMuted" style={styles.label}>{label}</AppText>}
  </View>;
}
const styles = StyleSheet.create({ feedback: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md }, label: { textAlign: 'center' } });
