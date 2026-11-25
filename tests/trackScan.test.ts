import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics/server', () => ({ track: vi.fn() }));
vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));

import { track } from '@vercel/analytics/server';
import { waitUntil } from '@vercel/functions';
import { trackScan } from '../src/lib/trackScan';

const req = new Request('https://atlasfit.app/get?src=crunch-bear');
const event = { route: 'get', src: 'crunch-bear', platform: 'ios' } as const;

describe('trackScan', () => {
  beforeEach(() => {
    vi.mocked(track).mockReset().mockResolvedValue(undefined);
    vi.mocked(waitUntil).mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns synchronously and hands the work to waitUntil', () => {
    vi.mocked(track).mockReturnValue(new Promise(() => {}));
    const result = trackScan(event, req);
    expect(result).toBeUndefined();
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  // The Vercel plan allows two properties per event, so the route is carried
  // by the event name.
  it('sends /get scans as "scan" with two properties', () => {
    trackScan(event, req);
    expect(track).toHaveBeenCalledWith(
      'scan',
      { src: 'crunch-bear', platform: 'ios' },
      expect.anything(),
    );
  });

  it('sends /story scans as "story_scan" with two properties', () => {
    trackScan({ route: 'story', src: 'crunch-story', platform: 'android' }, req);
    expect(track).toHaveBeenCalledWith(
      'story_scan',
      { src: 'crunch-story', platform: 'android' },
      expect.anything(),
    );
  });

  it('swallows a rejected track call', async () => {
    vi.mocked(track).mockRejectedValue(new Error('analytics down'));
    trackScan(event, req);
    const handedOff = vi.mocked(waitUntil).mock.calls[0][0];
    await expect(handedOff).resolves.toBeUndefined();
  });

  it('swallows a throwing waitUntil', () => {
    vi.mocked(waitUntil).mockImplementation(() => {
      throw new Error('no request context');
    });
    expect(() => trackScan(event, req)).not.toThrow();
  });

  it('swallows a synchronously throwing track', () => {
    vi.mocked(track).mockImplementation(() => {
      throw new Error('bad config');
    });
    expect(() => trackScan(event, req)).not.toThrow();
  });

  // Link-preview bots and uptime checkers send HEAD; a person's phone sends GET.
  it.each(['HEAD', 'POST'])('does not count a %s request', (method) => {
    trackScan(event, new Request('https://atlasfit.app/get?src=crunch-bear', { method }));
    expect(track).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('logs one JSON line per scan', () => {
    trackScan(event, req);
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({ type: 'scan', route: 'get', src: 'crunch-bear', platform: 'ios' }),
    );
  });
});
