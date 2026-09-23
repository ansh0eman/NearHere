import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Reads the user's system Reduce Motion preference. Screens can use this to
 * remove decorative transitions while preserving the same information and
 * interaction states.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  return reducedMotion;
}
