/**
 * Ultra-minimal react-native shim for the sandbox harness. ONLY stubs the
 * pieces our non-UI modules actually import — Platform and AccessibilityInfo.
 * Component-layer tests use the real react-native via jest-expo.
 */

let osName: 'ios' | 'android' | 'web' = 'ios';

export const Platform = {
  get OS(): 'ios' | 'android' | 'web' {
    return osName;
  },
  select<T>(spec: { ios?: T; android?: T; default?: T; web?: T }): T | undefined {
    if (osName === 'ios' && 'ios' in spec) return spec.ios;
    if (osName === 'android' && 'android' in spec) return spec.android;
    if (osName === 'web' && 'web' in spec) return spec.web;
    return spec.default;
  },
};

type Listener = (v: boolean) => void;

const a11yListeners = new Map<string, Set<Listener>>();

export const AccessibilityInfo = {
  isReduceMotionEnabled: async (): Promise<boolean> => false,
  addEventListener(event: string, cb: Listener): { remove: () => void } {
    if (!a11yListeners.has(event)) a11yListeners.set(event, new Set());
    a11yListeners.get(event)!.add(cb);
    return {
      remove: () => a11yListeners.get(event)?.delete(cb),
    };
  },
};

export const __mock = {
  setOS(v: 'ios' | 'android' | 'web'): void {
    osName = v;
  },
  resetA11y(): void {
    a11yListeners.clear();
  },
};

// Re-export a default for `import RN from 'react-native'` if anyone tries it.
export default {
  Platform,
  AccessibilityInfo,
};
