/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { __mock as clerkMock } from './__mocks__/clerkExpo';
import { useAuthToken } from '../src/auth/useAuthToken';

beforeEach(() => {
  clerkMock.signOut();
  clerkMock.resetTokenFactory();
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
});
