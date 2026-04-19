/**
 * Stand-in for @clerk/clerk-expo. The real module is a native-bridge
 * Clerk client; tests care only about the hook surface useCollection +
 * useAuthToken depend on.
 *
 * Each test tweaks behaviour via the exposed __mock helpers rather than
 * re-mocking at the jest module level.
 */

interface MockState {
  isSignedIn: boolean;
  userId: string | null;
  token: string | null;
}

const state: MockState = {
  isSignedIn: false,
  userId: null,
  token: null,
};

export const __mock = {
  signIn(userId: string, token = `jwt-${userId}`) {
    state.isSignedIn = true;
    state.userId = userId;
    state.token = token;
  },
  signOut() {
    state.isSignedIn = false;
    state.userId = null;
    state.token = null;
  },
  tokenFactory(makeToken: () => Promise<string | null>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getTokenImpl as any).impl = makeToken;
  },
  resetTokenFactory() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getTokenImpl as any).impl = null;
  },
  getState() {
    return { ...state };
  },
};

interface GetTokenOptions {
  template?: string;
}

const getTokenCalls: GetTokenOptions[] = [];

async function defaultGetToken(opts?: GetTokenOptions): Promise<string | null> {
  return state.token;
}

function getTokenImpl(opts?: GetTokenOptions): Promise<string | null> {
  getTokenCalls.push(opts ?? {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const override = (getTokenImpl as any).impl as (() => Promise<string | null>) | null;
  return override ? override() : defaultGetToken(opts);
}

// Expose the call log so tests can assert whether a JWT template was
// passed. v1 uses default session tokens (no template) per engineer
// 2026-04-19.
export function __getTokenCalls(): ReadonlyArray<GetTokenOptions> {
  return getTokenCalls;
}
export function __clearTokenCalls(): void {
  getTokenCalls.length = 0;
}

export function useAuth() {
  return {
    isSignedIn: state.isSignedIn,
    userId: state.userId,
    getToken: getTokenImpl,
  };
}

export function useUser() {
  return {
    user: state.isSignedIn
      ? {
          id: state.userId,
          primaryEmailAddress: { emailAddress: 'test@example.com' },
          delete: async () => {},
        }
      : null,
  };
}

export function useClerk() {
  return {
    signOut: async () => __mock.signOut(),
  };
}

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return children;
}
