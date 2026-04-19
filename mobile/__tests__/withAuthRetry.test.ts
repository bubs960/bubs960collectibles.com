import { withAuthRetry } from '../src/auth/withAuthRetry';
import { CollectionApiError } from '../src/api/collectionApi';

describe('withAuthRetry', () => {
  it('throws when getToken returns null (not signed in)', async () => {
    const getToken = jest.fn().mockResolvedValue(null);
    const op = jest.fn();
    await expect(withAuthRetry(getToken, op)).rejects.toThrow('not signed in');
    expect(op).not.toHaveBeenCalled();
  });

  it('returns the operation result on happy path', async () => {
    const getToken = jest.fn().mockResolvedValue('tok-1');
    const op = jest.fn().mockResolvedValue({ id: 'server-1' });
    await expect(withAuthRetry(getToken, op)).resolves.toEqual({ id: 'server-1' });
    expect(op).toHaveBeenCalledTimes(1);
    expect(op).toHaveBeenCalledWith('tok-1');
  });

  it('on CollectionApiError 401: force-refreshes and retries ONCE', async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce('stale-tok')
      .mockResolvedValueOnce('fresh-tok');
    const op = jest
      .fn()
      .mockRejectedValueOnce(new CollectionApiError(401, 'expired'))
      .mockResolvedValueOnce({ id: 'server-1' });

    await expect(withAuthRetry(getToken, op)).resolves.toEqual({ id: 'server-1' });
    expect(op).toHaveBeenCalledTimes(2);
    expect(op).toHaveBeenNthCalledWith(1, 'stale-tok');
    expect(op).toHaveBeenNthCalledWith(2, 'fresh-tok');
    // First call: no opts. Second call: forceRefresh=true.
    expect(getToken).toHaveBeenNthCalledWith(1);
    expect(getToken).toHaveBeenNthCalledWith(2, { forceRefresh: true });
  });

  it('second 401 surfaces the original error (no third attempt)', async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce('stale')
      .mockResolvedValueOnce('also-bad');
    const err = new CollectionApiError(401, 'still expired');
    const op = jest.fn().mockRejectedValue(err);

    await expect(withAuthRetry(getToken, op)).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('non-401 CollectionApiError (e.g. 500) propagates without retry', async () => {
    const getToken = jest.fn().mockResolvedValue('tok');
    const err = new CollectionApiError(500, 'internal');
    const op = jest.fn().mockRejectedValue(err);

    await expect(withAuthRetry(getToken, op)).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('non-CollectionApiError (e.g. network) propagates without retry', async () => {
    const getToken = jest.fn().mockResolvedValue('tok');
    const err = new TypeError('Network request failed');
    const op = jest.fn().mockRejectedValue(err);

    await expect(withAuthRetry(getToken, op)).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('null refresh token on retry: throws the original 401 (no third attempt)', async () => {
    const getToken = jest
      .fn()
      .mockResolvedValueOnce('stale')
      .mockResolvedValueOnce(null);
    const err = new CollectionApiError(401, 'expired');
    const op = jest.fn().mockRejectedValueOnce(err);

    await expect(withAuthRetry(getToken, op)).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });
});
