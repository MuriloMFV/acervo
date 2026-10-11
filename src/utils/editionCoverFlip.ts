// Both faces rotate in the same direction. At the back endpoint, 360° keeps
// the image readable instead of displaying a mirrored 180° face.
export function editionCoverFlipFaces(progress: number) {
  'worklet';
  const value = Math.max(0, Math.min(1, progress));
  return {
    frontAngle: `${value * 180}deg`, backAngle: `${180 + value * 180}deg`,
    frontOpacity: value < 0.5 ? 1 : 0, backOpacity: value >= 0.5 ? 1 : 0,
  };
}
