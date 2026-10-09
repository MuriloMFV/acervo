import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { ClipPath, Defs, Image as SvgImage, Polygon } from 'react-native-svg';
import { colors } from '../../theme';
import { advanceOpeningClock, openingProgress, openingSceneSize, sceneCrops, sceneSize, startupTiming, type OpeningClock, type SceneCrop, type ScenePlacement } from './startupAnimation';

const assets = {
  background: require('../../assets/splash animation/background.png'),
  lamp: require('../../assets/splash animation/lamp.png'),
  glow: require('../../assets/splash animation/lamp-glow.png'),
  shelf: require('../../assets/splash animation/shelf.png'),
  media: require('../../assets/splash animation/media.png'),
  plantLeft: require('../../assets/splash animation/plant-left.png'),
  plantRight: require('../../assets/splash animation/plant-right.png'),
  logo: require('../../assets/splash animation/logo-acervo.png'),
} as const;
type AssetName = keyof typeof assets;

function Layer({ source, clock, scale, crop = { x: 0, y: 0, ...sceneSize }, place = { x: 0, y: 0, width: sceneSize.width }, sourceSize = sceneSize, start, duration, fromScale = 1, fromX = 0, fromY = 0, grow = false, onLoadEnd }: {
  source: ImageSourcePropType; clock: SharedValue<OpeningClock>; scale: number;
  crop?: SceneCrop; place?: ScenePlacement; sourceSize?: { width: number; height: number };
  start: number; duration: number; fromScale?: number; fromX?: number; fromY?: number; grow?: boolean; onLoadEnd: () => void;
}) {
  const imageScale = place.width / crop.width * scale;
  const animated = useAnimatedStyle(() => {
    const progress = openingProgress(clock.value.scene, start, duration);
    return { opacity: progress, transform: [{ scale: fromScale + (1 - fromScale) * progress }, { translateX: fromX * (1 - progress) }, { translateY: fromY * (1 - progress) }, { scaleX: grow ? progress : 1 }] };
  });
  return <Animated.View style={[styles.crop, {
    left: place.x * scale, top: place.y * scale, width: place.width * scale, height: crop.height * imageScale,
    transformOrigin: grow ? 'left center' : 'center',
  }, animated]}>
    <Image accessible={false} source={source} resizeMode="contain" fadeDuration={0} onLoadEnd={onLoadEnd} style={{ position: 'absolute', left: -crop.x * imageScale, top: -crop.y * imageScale, width: sourceSize.width * imageScale, height: sourceSize.height * imageScale }} />
  </Animated.View>;
}

export function AnimatedStartupSplash({ ready, onPrepared, onFinish }: { ready: boolean; onPrepared: () => Promise<void>; onFinish: () => void }) {
  const clock = useSharedValue<OpeningClock>({ scene: 0, exit: 0, finished: false });
  const notified = useSharedValue(false);
  const initialReducedMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(initialReducedMotion);
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [assetsReady, setAssetsReady] = useState(false);
  const [presented, setPresented] = useState(false);
  const [sceneComplete, setSceneComplete] = useState(false);
  const settled = useRef(new Set<AssetName>());
  const scene = openingSceneSize(viewport.width, viewport.height);
  const markComplete = useCallback(() => setSceneComplete(true), []);
  const assetSettled = (name: AssetName) => {
    settled.current.add(name);
    if (settled.current.size === Object.keys(assets).length) setAssetsReady(true);
  };

  useEffect(() => {
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { app.remove(); motion.remove(); };
  }, []);
  useEffect(() => {
    if (!assetsReady || !scene.scale || !active || presented) return;
    let mounted = true;
    void onPrepared().finally(() => { if (mounted) setPresented(true); });
    return () => { mounted = false; };
  }, [assetsReady, scene.scale, active, presented, onPrepared]);

  const frame = useFrameCallback(info => {
    const previous = clock.value;
    const next = advanceOpeningClock(previous, info.timeSincePreviousFrame ?? 0, ready, active, reduceMotion);
    clock.value = next;
    if (next.scene >= startupTiming.scene && !notified.value) {
      notified.value = true;
      scheduleOnRN(markComplete);
    }
    if (!previous.finished && next.finished) scheduleOnRN(onFinish);
  }, false);
  useEffect(() => {
    frame.setActive(presented && active && (!sceneComplete || ready));
    return () => frame.setActive(false);
  }, [frame, presented, active, sceneComplete, ready]);

  const fade = useAnimatedStyle(() => ({ opacity: 1 - clock.value.exit / startupTiming.exit }));
  const background = useAnimatedStyle(() => ({ opacity: openingProgress(clock.value.scene, startupTiming.background.start, startupTiming.background.duration) }));
  const glow = useAnimatedStyle(() => {
    const time = clock.value.scene;
    const { start, duration, settleDuration } = startupTiming.glow;
    const peak = start + duration;
    return { opacity: time < peak ? 0.8 * openingProgress(time, start, duration) : 0.8 - 0.2 * openingProgress(time, peak, settleDuration) };
  });

  return <Animated.View
    accessible accessibilityLabel="Acervo, carregando" accessibilityRole="progressbar"
    style={[styles.overlay, fade]}
    onLayout={event => setViewport({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
  >
    <Animated.Image accessible={false} source={assets.background} resizeMode="cover" fadeDuration={0} onLoadEnd={() => assetSettled('background')} style={[StyleSheet.absoluteFill, background]} />
    <View pointerEvents="none" style={[styles.scene, { width: scene.width, height: scene.height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, glow]}>
        <Svg width={scene.width} height={scene.height} viewBox={`0 0 ${sceneSize.width} ${sceneSize.height}`} accessible={false}>
          <Defs><ClipPath id="opening-lamp-beam"><Polygon points="568,334 820,455 872,665 880,920 40,920 40,460" /></ClipPath></Defs>
          <SvgImage href={assets.glow} width={sceneSize.width} height={sceneSize.height} clipPath="url(#opening-lamp-beam)" />
        </Svg>
      </Animated.View>
      {/* Native Image also reports download failures, so a missing asset cannot block startup. */}
      <Image accessible={false} source={assets.glow} onLoadEnd={() => assetSettled('glow')} style={styles.loader} />
      <Layer source={assets.lamp} clock={clock} scale={scene.scale} sourceSize={{ width: 1254, height: 1254 }} crop={{ x: 0, y: 0, width: 1254, height: 1254 }} place={sceneCrops.lamp} {...startupTiming.lamp} onLoadEnd={() => assetSettled('lamp')} />
      {sceneCrops.media.map((band, index) => <Layer key={index} source={assets.media} clock={clock} scale={scene.scale} {...band} start={startupTiming.media.start + index * startupTiming.media.stagger} duration={startupTiming.media.duration} onLoadEnd={() => assetSettled('media')} />)}
      <Layer source={assets.shelf} clock={clock} scale={scene.scale} {...startupTiming.shelf} fromScale={1.03} onLoadEnd={() => assetSettled('shelf')} />
      <Layer source={assets.plantLeft} clock={clock} scale={scene.scale} {...sceneCrops.plantLeft} {...startupTiming.plants} fromX={-8} onLoadEnd={() => assetSettled('plantLeft')} />
      {[sceneCrops.plantRight, sceneCrops.plantBottom].map((plant, index) => <Layer key={index} source={assets.plantRight} clock={clock} scale={scene.scale} {...plant} start={startupTiming.plants.start + startupTiming.plants.stagger} duration={startupTiming.plants.duration} fromX={8} onLoadEnd={() => assetSettled('plantRight')} />)}
      <Layer source={assets.logo} clock={clock} scale={scene.scale} {...sceneCrops.logo} {...startupTiming.logo} fromY={12} onLoadEnd={() => assetSettled('logo')} />
      <Layer source={assets.logo} clock={clock} scale={scene.scale} {...sceneCrops.line} {...startupTiming.line} grow onLoadEnd={() => assetSettled('logo')} />
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scene: { overflow: 'hidden' },
  crop: { position: 'absolute', overflow: 'hidden' },
  loader: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
