import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { createBarcodeScanGate, scannerBarcodeTypes } from '../../utils/barcodeScanner';
import { colors, controls, radius, spacing } from '../../theme';

const barcodeScannerSettings = { barcodeTypes: [...scannerBarcodeTypes] };

export function BarcodeScanner({ onScan, onClose, onManual, scannedLabel = 'Código lido' }: {
  onScan: (code: string) => void; onClose: () => void; onManual: () => void; scannedLabel?: string;
}) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<'camera' | 'permission' | 'invalid' | null>(null);
  const [cameraVersion, setCameraVersion] = useState(0);
  const gate = useRef(createBarcodeScanGate()).current;
  const focusRef = useRef(false);
  const departing = useRef(false);

  useFocusEffect(useCallback(() => {
    focusRef.current = true;
    departing.current = false;
    gate.rearm();
    setLocked(false);
    setError(null);
    setFocused(true);
    return () => { focusRef.current = false; gate.pause(); setFocused(false); };
  }, [gate]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      gate.pause();
      setActive(state === 'active');
      if (state === 'active' && focusRef.current) {
        void getPermission().catch(() => setError('permission'));
      }
    });
    return () => subscription.remove();
  }, [gate, getPermission]);

  const read = ({ data }: BarcodeScanningResult) => {
    // Also reject queued native events after blur/background.
    if (departing.current || !focusRef.current || AppState.currentState !== 'active') return;
    const result = gate.read(data);
    if (result.status === 'ignored') return;
    if (result.status === 'invalid') { setError('invalid'); return; }
    departing.current = true;
    setLocked(true);
    gate.pause();
    onScan(result.code);
  };
  const leave = (manual = false) => {
    if (departing.current) return;
    departing.current = true;
    gate.pause();
    setLocked(true);
    if (manual) onManual();
    else onClose();
  };
  const allow = async () => {
    try {
      setError(null);
      if (permission?.canAskAgain === false) await Linking.openSettings();
      else await requestPermission();
    } catch { setError('permission'); }
  };
  const showCamera = permission?.granted && focused && active && !locked && error !== 'camera';

  return <Screen>
    <View style={styles.header}>
      <IconButton accessibilityLabel="Voltar" onPress={() => leave()}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton>
      <AppText variant="heading" style={styles.title}>Escanear código</AppText>
    </View>
    <View style={styles.preview}>
      {showCamera && <CameraView key={cameraVersion} style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={barcodeScannerSettings} onBarcodeScanned={read}
        onCameraReady={() => { if (!departing.current && focusRef.current && AppState.currentState === 'active') gate.resume(); }}
        onMountError={() => { gate.pause(); setError('camera'); }} />}
      {showCamera && <View pointerEvents="none" style={styles.frame} />}
      {!permission && <ActivityIndicator color={colors.accent} accessibilityLabel="Verificando permissão" />}
      {permission && !permission.granted && <View style={styles.message}>
        <AppText style={styles.center}>Permissão da câmera necessária</AppText>
        <ActionButton label={permission.canAskAgain ? 'Permitir câmera' : 'Abrir configurações'} onPress={() => { void allow(); }} />
      </View>}
      {permission?.granted && error === 'camera' && <View style={styles.message}>
        <AppText>Câmera indisponível</AppText>
        <ActionButton secondary label="Tentar novamente" onPress={() => { setError(null); setCameraVersion((value) => value + 1); }} />
      </View>}
    </View>
    <View style={styles.footer}>
      <AppText variant="caption" color="textMuted" style={styles.center} accessibilityLiveRegion="polite">
        {error === 'invalid' ? 'Código inválido. Use 8, 12 ou 13 dígitos.' : error === 'permission' ? 'Não foi possível acessar a permissão' : locked ? scannedLabel : 'Posicione o código'}
      </AppText>
      <ActionButton secondary label="Digitar código" onPress={() => leave(true)} disabled={locked} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  title: { flex: 1 },
  preview: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  frame: { width: '85%', aspectRatio: 2, borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md },
  message: { padding: spacing.lg, gap: spacing.md, alignSelf: 'stretch' },
  footer: { paddingVertical: spacing.lg, gap: spacing.md },
  center: { textAlign: 'center' },
});
