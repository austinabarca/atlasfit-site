import { APP_STORE_PROVIDER_TOKEN, APP_STORE_URL, PLAY_URL } from '../config/links';

export type Platform = 'ios' | 'android' | 'other';

const SRC_PATTERN = /^[a-z0-9-]{1,40}$/;

/** The ad name from `?src=`, or `unknown` when it is missing or malformed. */
export function sanitizeSrc(raw: string | null | undefined): string {
  const src = (raw ?? '').trim().toLowerCase();
  return SRC_PATTERN.test(src) ? src : 'unknown';
}

export function detectPlatform(userAgent: string | null | undefined): Platform {
  const ua = userAgent ?? '';
  if (/iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

/** Store listing URL carrying the ad name as a campaign tag. `src` must already be sanitised. */
export function storeUrl(
  platform: 'ios' | 'android',
  src: string,
  providerToken: string = APP_STORE_PROVIDER_TOKEN,
): string {
  if (platform === 'android') {
    const referrer = `utm_source=crunch&utm_medium=qr&utm_campaign=${src}`;
    return `${PLAY_URL}&referrer=${encodeURIComponent(referrer)}`;
  }
  if (!providerToken) return APP_STORE_URL;
  return `${APP_STORE_URL}?pt=${encodeURIComponent(providerToken)}&ct=${src}&mt=8`;
}
