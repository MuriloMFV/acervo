import { useEffect, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Film from 'lucide-react-native/icons/film';
import { colors, controls } from '../../theme';
import { editionCoverFlipFaces } from '../../utils/editionCoverFlip';

type Props = { front: ImageSourcePropType | null; back?: ImageSourcePropType | null; title: string; style: StyleProp<ViewStyle>; resizeMode?: 'cover' | 'contain' };

export function EditionCoverFlip({ front, back, title, style, resizeMode = 'contain' }: Props) {
  if (!back) return <View style={style}>
    {front ? <Image accessibilityLabel={`Capa de ${title}`} source={front} resizeMode={resizeMode} resizeMethod="resize" style={styles.image} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
  </View>;
  return <FlippableCover key={JSON.stringify([front, back])} front={front} back={back} title={title} style={style} />;
}

function FlippableCover({ front, back, title, style }: Props & { back: ImageSourcePropType }) {
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
  return <Pressable style={style} onPress={turn} disabled={!backLoaded} accessible
    accessibilityRole={backLoaded ? 'button' : 'image'} accessibilityLabel={backLoaded ? `${flipped ? 'Ver frente' : 'Ver contracapa'} de ${title}` : `Capa de ${title}`}>
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
  image: { width: '100%', height: '100%' },
  sheet: { flex: 1, width: '100%' },
  face: { ...StyleSheet.absoluteFill, backfaceVisibility: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
