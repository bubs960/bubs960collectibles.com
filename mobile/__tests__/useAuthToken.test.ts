/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import {
  __mock as clerkMock,
  __getTokenCalls,
  __clearTokenCalls,
} from './__mocks__/clerkExpo';
import { useAuthToken } from '../src/auth/useAuthToken';

beforeEach(() => {
  clerkMock.signOut();
  clerkMock.resetTokenFactory();
  __clearTokenCalls();
});

describe('useAuthToken', () => {
  it('returns null when signed out without calling Clerk', async () => {
    const { result } = renderHook(() => useAuthToken());
    await expect(result.current()).resolves.toBeNull();
  });

  it('resolves to the session token when signed in', async () => {
    clerkMock.signIn('user_a', 'jwt-abc');
    const { result } = renderHook(() => useAuthToken());
    await expect(result.current()).resolves.toBe('jwt-abc');
  });

  it('returns null on getToken failure (network / Clerk error) rather than throwing', async () => {
    clerkMock.signIn('user_a');
    clerkMock.tokenFactory(async () => {
      throw new Error('clerk refresh failed');
    });
    const { result } = renderHook(() => useAuthToken());
    await expect(result.current()).resolves.toBeNull();
  });

  it('retains a stable identity across renders when auth state is unchanged', () => {
    clerkMock.signIn('user_a');
    const { result, rerender } = renderHook(() => useAuthToken());
    const firstRef = result.current;
    rerender();
    expect(result.current).toBe(firstRef);
  });

  it('v1 default: calls getToken() with NO template option (engineer 2026-04-19 — default session token is enough)', async () => {
    clerkMock.signIn('user_a');
    const { result } = renderHook(() => useAuthToken());
    await result.current();
    const calls = __getTokenCalls();
    expect(calls.length).toBeGreaterThan(0);
    // No template passed at all — getToken() called bare.
    expect(calls[0].template).toBeUndefined();
  });
});
