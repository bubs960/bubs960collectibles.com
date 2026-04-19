/**
 * Stand-in for expo-device. setup.ts does `import * as Device from
 * 'expo-device'` and reads `Device.isDevice` — a live-reading getter so
 * the mock can flip between tests.
 */

const state = { isDevice: true };

export const __mock = {
  setIsDevice(v: boolean): void {
    state.isDevice = v;
  },
  reset(): void {
    state.isDevice = true;
  },
};

// Exported as a getter on the module so `Device.isDevice` reads live state.
Object.defineProperty(module.exports, 'isDevice', {
  get(): boolean {
    return state.isDevice;
  },
  enumerable: true,
  configurable: true,
});

// Satisfy TS that the module shape includes isDevice.
export declare const isDevice: boolean;
