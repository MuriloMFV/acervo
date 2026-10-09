import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceOpeningClock, openingProgress, openingSceneSize, sceneCrops, sceneSize, startupTiming } from '../src/components/visual/startupAnimation.ts';
const initial = () => ({ scene: 0, exit: 0, finished: false });

test('fast loading completes the visible sequence before the exit fade', () => {
  let clock = initial();
  for (let frame = 0; frame < startupTiming.scene / 10; frame++) clock = advanceOpeningClock(clock, 10, true, true, false);
  assert.equal(clock.scene, startupTiming.scene);
  assert.equal(clock.exit, 0); assert.equal(clock.finished, false);
  for (let frame = 0; frame < startupTiming.exit / 10; frame++) clock = advanceOpeningClock(clock, 10, true, true, false);
  assert.equal(clock.finished, true);
  assert.equal(startupTiming.scene + startupTiming.exit, 2800);
});
test('slow loading holds the completed scene until real readiness', () => {
  let clock = advanceOpeningClock(initial(), startupTiming.scene, false, true, false);
  assert.equal(clock.scene, startupTiming.scene);
  assert.deepEqual(advanceOpeningClock(clock, 30_000, false, true, false), clock);
  clock = advanceOpeningClock(clock, startupTiming.exit, true, true, false);
  assert.equal(clock.finished, true);
});
test('background never consumes entrance or exit animation time', () => {
  const entrance = { scene: 500, exit: 0, finished: false };
  assert.deepEqual(advanceOpeningClock(entrance, 60_000, true, false, false), entrance);
  const exiting = { scene: startupTiming.scene, exit: 50, finished: false };
  assert.deepEqual(advanceOpeningClock(exiting, 60_000, true, false, false), exiting);
  assert.equal(advanceOpeningClock(entrance, 90, false, true, false).scene, 590);
  assert.equal(advanceOpeningClock(exiting, 50, true, true, false).exit, 100);
});
test('Reduce Motion shows the stable scene and bypasses the minimum animation', () => {
  const waiting = advanceOpeningClock(initial(), 0, false, true, true);
  assert.deepEqual(waiting, { scene: startupTiming.scene, exit: 0, finished: false });
  assert.equal(advanceOpeningClock(waiting, 0, true, true, true).finished, true);
  assert.equal(advanceOpeningClock(initial(), 0, true, true, true).finished, true);
});
test('invalid frame intervals and completed clocks do not restart the sequence', () => {
  for (const delta of [NaN, Infinity, -10]) assert.deepEqual(advanceOpeningClock(initial(), delta, true, true, false), initial());
  const done = { scene: startupTiming.scene, exit: startupTiming.exit, finished: true };
  assert.deepEqual(advanceOpeningClock(done, 100, false, true, false), done);
});
test('stagger is top to bottom and logo/line finish within the scene duration', () => {
  const start = startupTiming.media.start;
  const step = startupTiming.media.stagger;
  assert.ok(step >= 110 && step <= 140);
  assert.ok(openingProgress(start + 50, start, startupTiming.media.duration) > 0);
  assert.equal(openingProgress(start + 50, start + step, startupTiming.media.duration), 0);
  assert.equal(openingProgress(start + 50, start + step * 2, startupTiming.media.duration), 0);
  assert.ok(startupTiming.logo.start >= start + step * 2 + startupTiming.media.duration);
  assert.ok(startupTiming.line.start + startupTiming.line.duration <= startupTiming.scene);
});
test('responsive scene preserves aspect ratio and fits phone/tablet/landscape areas', () => {
  for (const [width, height] of [[320,568],[393,852],[768,1024],[1024,768]]) {
    const scene = openingSceneSize(width,height);
    assert.ok(scene.width <= width + 0.001 && scene.height <= height + 0.001);
    assert.ok(Math.abs(scene.width / scene.height - sceneSize.width / sceneSize.height) < 0.00001);
  }
  assert.equal(openingSceneSize(0,0).scale,0);
});
test('logo and underline use separate non-overlapping crops from the original asset', () => {
  assert.ok(sceneCrops.logo.crop.y + sceneCrops.logo.crop.height <= sceneCrops.line.crop.y);
});
