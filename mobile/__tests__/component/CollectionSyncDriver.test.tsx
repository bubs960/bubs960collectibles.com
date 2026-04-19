/**
 * Run with jest-expo only.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

// Spy useCollectionSync so we can assert the driver invokes it exactly once.
const syncHook = jest.fn(() => ({
  syncing: false,
  lastSyncAt: null,
  error: null,
  sync: jest.fn(),
}));
jest.mock('../../src/hooks/useCollectionSync', () => ({
  useCollectionSync: () => syncHook(),
}));

import { CollectionSyncDriver } from '../../src/auth/CollectionSyncDriver';

describe('CollectionSyncDriver', () => {
  beforeEach(() => {
    syncHook.mockClear();
  });

  it('invokes useCollectionSync once on mount', () => {
    render(<CollectionSyncDriver />);
    expect(syncHook).toHaveBeenCalledTimes(1);
  });

  it('renders null (no visible UI)', () => {
    const { toJSON } = render(<CollectionSyncDriver />);
    expect(toJSON()).toBeNull();
  });
});
