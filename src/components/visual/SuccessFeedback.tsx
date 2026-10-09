import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisualFeedback } from './VisualFeedback';
import { colors, radius, spacing } from '../../theme';

type SuccessState = { show: () => void; close: () => void; visible: boolean; sequence: number };
const SuccessContext = createContext<SuccessState>({ show: () => {}, close: () => {}, visible: false, sequence: 0 });

// Keep only presentation state here. The focused destination owns playback;
// an animation above/below a native stack must not run behind a departing modal.
export function SuccessFeedbackProvider({ children }: { children: ReactNode }) {
  const [sequence, setSequence] = useState(0);
  const [visible, setVisible] = useState(false);
  const show = useCallback(() => {
    AccessibilityInfo.announceForAccessibility('Salvo no Acervo');
    setSequence(value => value + 1);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);
  return <SuccessContext.Provider value={{ show, close, visible, sequence }}>{children}</SuccessContext.Provider>;
}
export const useSuccessFeedback = () => useContext(SuccessContext).show;

export function SuccessFeedbackHost() {
  const { visible, sequence, close } = useContext(SuccessContext);
  const [focused, setFocused] = useState(false);
  const insets = useSafeAreaInsets();
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  if (!visible || !focused) return null;
  return <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + spacing.md }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Salvo no Acervo. Fechar confirmação" onPress={close} style={styles.card}>
      <VisualFeedback key={sequence} animation="check" label="Salvo" size={spacing.xl * 4} onFinish={close} />
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  card: { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, elevation: 8 },
});
