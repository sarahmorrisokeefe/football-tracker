import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cachedFetch, clearCache } from './api-football';

describe('cachedFetch', () => {
  beforeEach(() => clearCache());

  it('calls fn on first request', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const result = await cachedFetch('key-a', fn, 60_000);
    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('result');
  });

  it('returns cached value without calling fn again', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    await cachedFetch('key-b', fn, 60_000);
    const result = await cachedFetch('key-b', fn, 60_000);
    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe('result');
  });

  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue('result');
    await cachedFetch('key-c', fn, 1_000);
    vi.advanceTimersByTime(1_001);
    await cachedFetch('key-c', fn, 1_000);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('uses separate cache entries per key', async () => {
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');
    const r1 = await cachedFetch('key-d', fn1, 60_000);
    const r2 = await cachedFetch('key-e', fn2, 60_000);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
  });
});
