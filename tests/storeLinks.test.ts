import { describe, expect, it } from 'vitest';
import { detectPlatform, sanitizeSrc, storeUrl } from '../src/lib/storeLinks';

describe('sanitizeSrc', () => {
  it.each([
    ['crunch-bear', 'crunch-bear'],
    ['  Crunch-Bear ', 'crunch-bear'],
    ['a'.repeat(40), 'a'.repeat(40)],
    ['a'.repeat(41), 'unknown'],
    ['', 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
    ['crunch bear', 'unknown'],
    ['a&referrer=x', 'unknown'],
    ['crunch_bear', 'unknown'],
    ['🔥', 'unknown'],
  ])('%j -> %j', (raw, out) => expect(sanitizeSrc(raw)).toBe(out));
});

describe('detectPlatform', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', 'ios'],
    ['Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)', 'ios'],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', 'android'],
    ['Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', 'android'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 'other'],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'other'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'other'],
    ['', 'other'],
    [null, 'other'],
    [undefined, 'other'],
  ])('%j -> %j', (ua, out) => expect(detectPlatform(ua)).toBe(out));
});

describe('storeUrl', () => {
  it('android carries the campaign', () =>
    expect(storeUrl('android', 'crunch-bear')).toBe(
      'https://play.google.com/store/apps/details?id=app.atlasfit.mobile&referrer=utm_source%3Dcrunch%26utm_medium%3Dqr%26utm_campaign%3Dcrunch-bear',
    ));
  it('ios without a token is the bare listing', () =>
    expect(storeUrl('ios', 'crunch-bear', '')).toBe(
      'https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147',
    ));
  it('ios with a token carries the campaign', () =>
    expect(storeUrl('ios', 'crunch-bear', '123456')).toBe(
      'https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147?pt=123456&ct=crunch-bear&mt=8',
    ));
});
