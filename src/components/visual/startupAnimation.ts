// All timing is foreground animation time, not a startup/network timeout.
export const startupTiming = {
  scene: 2520,
  exit: 280,
  background: { start: 0, duration: 180 },
  lamp: { start: 220, duration: 370 },
  glow: { start: 310, duration: 370, settleDuration: 310 },
  shelf: { start: 530, duration: 460 },
  media: { start: 920, duration: 430, stagger: 130 },
  plants: { start: 1350, duration: 460, stagger: 60 },
  logo: { start: 1720, duration: 460 },
  line: { start: 2170, duration: 350 },
} as const;

export interface OpeningClock { scene: number; exit: number; finished: boolean }
export function advanceOpeningClock(clock: OpeningClock, delta: number, ready: boolean, active: boolean, reduceMotion: boolean): OpeningClock {
  'worklet';
  if (!active || clock.finished) return clock;
  if (reduceMotion) return { scene: startupTiming.scene, exit: ready ? startupTiming.exit : 0, finished: ready };
  const step = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  if (clock.scene < startupTiming.scene) return { ...clock, scene: Math.min(startupTiming.scene, clock.scene + step) };
  if (!ready) return clock;
  const exit = Math.min(startupTiming.exit, clock.exit + step);
  return { ...clock, exit, finished: exit === startupTiming.exit };
}

export function openingProgress(time: number, start: number, duration: number): number {
  'worklet';
  const progress = Math.min(1, Math.max(0, (time - start) / duration));
  return 1 - Math.pow(1 - progress, 3);
}

export const sceneSize = { width: 941, height: 1672 } as const;
export function openingSceneSize(width: number, height: number) {
  const scale = Math.max(0, Math.min(width / sceneSize.width, height / sceneSize.height));
  return { scale, width: sceneSize.width * scale, height: sceneSize.height * scale };
}

export interface SceneCrop { x: number; y: number; width: number; height: number }
export interface ScenePlacement { x: number; y: number; width: number }
export const sceneCrops = {
  media: [
    { crop: { x: 0, y: 300, width: 941, height: 340 }, place: { x: 0, y: 314, width: 941 } },
    { crop: { x: 0, y: 680, width: 941, height: 330 }, place: { x: 0, y: 638, width: 941 } },
    { crop: { x: 0, y: 1050, width: 941, height: 295 }, place: { x: 0, y: 964, width: 941 } },
  ],
  plantLeft: { crop: { x: 24, y: 24, width: 700, height: 1550 }, place: { x: -20, y: -30, width: 280 } },
  plantRight: { crop: { x: 510, y: 245, width: 425, height: 855 }, place: { x: 758, y: -25, width: 170 } },
  plantBottom: { crop: { x: 585, y: 1190, width: 350, height: 410 }, place: { x: 813, y: 1112, width: 112 } },
  logo: { crop: { x: 150, y: 1320, width: 630, height: 160 }, place: { x: 150, y: 1320, width: 630 } },
  line: { crop: { x: 340, y: 1490, width: 260, height: 40 }, place: { x: 340, y: 1490, width: 260 } },
  lamp: { x: 390, y: 93, width: 627 },
} as const;
