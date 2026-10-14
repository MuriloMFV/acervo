import { useEffect, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Film from 'lucide-react-native/icons/film';
import X from 'lucide-react-native/icons/x';
import { AppText, IconButton, Screen } from '../ui';
import { colors, controls, spacing } from '../../theme';
import { editionCoverFlipFaces } from '../../utils/editionCoverFlip';

type Props = { front: ImageSourcePropType | null; back?: ImageSourcePropType | null; title: string; style: StyleProp<ViewStyle>; resizeMode?: 'cover' | 'contain'; expandable?: boolean };
type ExpandedCover = { source: ImageSourcePropType; label: string };

export function EditionCoverFlip({ front, back, title, style, resizeMode = 'contain', expandable = false }: Props) {
  const [expanded, setExpanded] = useState<ExpandedCover | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const expand = (source: ImageSourcePropType, label: string) => {
    setPreviewFailed(false); setExpanded({ source, label });
  };
  const expandFront = () => { if (expandable && front) expand(front, `Capa de ${title}`); };
  const canExpandFront = expandable && !!front;
  return <>
    {back ? <FlippableCover key={JSON.stringify([front, back])} front={front} back={back} title={title} style={style} onExpand={expandable ? expand : undefined} /> :
      <Pressable style={style} disabled={!canExpandFront} onLongPress={expandFront} delayLongPress={450}
        accessible accessibilityRole={canExpandFront ? 'button' : 'image'} accessibilityLabel={`Capa de ${title}`}
        accessibilityHint={canExpandFront ? 'Mantenha pressionado para ampliar' : undefined}
        accessibilityActions={canExpandFront ? [{ name: 'activate', label: 'Ampliar capa' }] : undefined}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') expandFront(); }}>
        {front ? <Image accessible={false} source={front} resizeMode={resizeMode} resizeMethod="resize" style={styles.image} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
      </Pressable>}
    {expanded && <Modal visible animationType="none" onRequestClose={() => setExpanded(null)}>
      <Screen>
        <View style={styles.previewHeader}>
          <AppText variant="label" style={styles.previewTitle}>{expanded.label}</AppText>
          <IconButton accessibilityLabel="Fechar imagem ampliada" onPress={() => setExpanded(null)}><X size={controls.iconSize} color={colors.text} /></IconButton>
        </View>
        {previewFailed ? <View style={styles.previewError}><AppText accessibilityRole="alert" color="textMuted">Imagem indisponível</AppText></View> :
          <Image source={expanded.source} accessibilityLabel={expanded.label} resizeMode="contain" resizeMethod="resize" style={styles.previewImage} onError={() => setPreviewFailed(true)} />}
      </Screen>
    </Modal>}
  </>;
}

function FlippableCover({ front, back, title, style, onExpand }: Props & { back: ImageSourcePropType; onExpand?: (source: ImageSourcePropType, label: string) => void }) {
  const progress = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);
  const [backLoaded, setBackLoaded] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { cancelAnimation(progress); progress.value = flipped ? 1 : 0; }
    });
    return () => subscription.remove();
  }, [flipped, progress]);
  useEffect(() => () => cancelAnimation(progress), [progress]);
  const frontStyle = useAnimatedStyle(() => {
    const face = editionCoverFlipFaces(progress.value);
    return { opacity: face.frontOpacity, transform: [{ perspective: 1000 }, { rotateY: face.frontAngle }] };
  });
  const backStyle = useAnimatedStyle(() => {
    const face = editionCoverFlipFaces(progress.value);
    return { opacity: face.backOpacity, transform: [{ perspective: 1000 }, { rotateY: face.backAngle }] };
  });
  const turn = () => {
    if (!backLoaded || AppState.currentState !== 'active') return;
    const next = !flipped;
    setFlipped(next);
    progress.value = withTiming(next ? 1 : 0, { duration: 420, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System });
  };
  const backFailed = () => {
    setBackLoaded(false); setFlipped(false);
    cancelAnimation(progress); progress.value = 0;
  };
  const visibleSource = flipped ? back : front;
  const expandVisible = () => {
    if (!onExpand || !visibleSource) return;
    cancelAnimation(progress); progress.value = flipped ? 1 : 0;
    onExpand(visibleSource, `${flipped ? 'Contracapa' : 'Capa'} de ${title}`);
  };
  const canExpand = !!onExpand && !!visibleSource;
  return <Pressable style={style} onPress={turn} onLongPress={canExpand ? expandVisible : undefined} delayLongPress={450} disabled={!backLoaded && !canExpand} accessible
    accessibilityRole={backLoaded || canExpand ? 'button' : 'image'} accessibilityLabel={backLoaded ? `${flipped ? 'Ver frente' : 'Ver contracapa'} de ${title}` : `Capa de ${title}`}
    accessibilityHint={canExpand ? 'Mantenha pressionado para ampliar a imagem atual' : undefined}
    accessibilityActions={canExpand ? [{ name: 'expand', label: 'Ampliar imagem atual' }] : undefined}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'expand') expandVisible(); }}>
    <View style={styles.sheet} pointerEvents="none">
      <Animated.View style={[styles.face, frontStyle]} accessible={false} accessibilityElementsHidden={flipped} importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}>
        {front ? <Image source={front} resizeMode="contain" resizeMethod="resize" style={styles.image} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
      </Animated.View>
      <Animated.View style={[styles.face, backStyle]} accessible={false} accessibilityElementsHidden={!flipped} importantForAccessibility={!flipped ? 'no-hide-descendants' : 'auto'}>
        <Image source={back} resizeMode="contain" resizeMethod="resize" style={styles.image} onLoad={() => setBackLoaded(true)} onError={backFailed} />
      </Animated.View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  previewTitle: { flex: 1 },
  previewImage: { flex: 1, width: '100%' },
  previewError: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  sheet: { flex: 1, width: '100%' },
  face: { ...StyleSheet.absoluteFill, backfaceVisibility: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
