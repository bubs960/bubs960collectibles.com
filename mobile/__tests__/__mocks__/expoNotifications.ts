/**
 * Stand-in for expo-notifications. Covers only the surface
 * src/notifications/setup.ts consumes: setNotificationHandler, permission
 * queries / requests, token fetching, Android channel creation, and the
 * AndroidImportance enum.
 */

export const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MIN: 1,
  MAX: 5,
  NONE: 0,
} as const;

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionState {
  status: PermissionStatus;
  canAskAgain: boolean;
}

interface MockState {
  permission: PermissionState;
  token: string | null;
  handler: unknown;
  channelsCreated: string[];
}

const state: MockState = {
  permission: { status: 'undetermined', canAskAgain: true },
  token: 'ExponentPushToken[mock-token]',
  handler: null,
  channelsCreated: [],
};

export function setNotificationHandler(handler: unknown): void {
  state.handler = handler;
}

export async function getPermissionsAsync(): Promise<PermissionState> {
  return { ...state.permission };
}

export async function requestPermissionsAsync(
  _opts?: unknown,
): Promise<PermissionState> {
  void _opts;
  // Simulate granting in tests by default — flip via __mock.
  if (state.permission.status === 'undetermined') {
    state.permission = { status: 'granted', canAskAgain: true };
  }
  return { ...state.permission };
}

export async function getExpoPushTokenAsync(): Promise<{ data: string }> {
  if (!state.token) throw new Error('token fetch failed');
  return { data: state.token };
}

export async function setNotificationChannelAsync(
  name: string,
  _channel: unknown,
): Promise<void> {
  state.channelsCreated.push(name);
}

export const __mock = {
  reset(): void {
    state.permission = { status: 'undetermined', canAskAgain: true };
    state.token = 'ExponentPushToken[mock-token]';
    state.handler = null;
    state.channelsCreated = [];
  },
  setPermission(next: PermissionState): void {
    state.permission = { ...next };
  },
  setToken(token: string | null): void {
    state.token = token;
  },
  getHandler(): unknown {
    return state.handler;
  },
  getChannels(): string[] {
    return [...state.channelsCreated];
  },
};
