import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// One native subscription for all press surfaces, including long virtualized lists.
let reduced = true;
const listeners = new Set<() => void>();
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
function update(value: boolean) {
  if (value === reduced) return;
  reduced = value;
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscription) {
    let changed = false;
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      update(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!changed) update(value);
    }).catch(() => update(true));
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { subscription?.remove(); subscription = undefined; }
  };
}
const getSnapshot = () => reduced;
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
