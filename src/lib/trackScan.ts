import { track } from '@vercel/analytics/server';
import { waitUntil } from '@vercel/functions';
import type { Platform } from './storeLinks';

export interface ScanEvent {
  route: 'get' | 'story';
  src: string;
  platform: Platform;
  // Index signature so the event can be passed to track() as its properties.
  [key: string]: string;
}

/**
 * Records one QR scan. Returns immediately: the analytics call finishes in the
 * background, and no failure here may ever block or delay the response.
 */
export function trackScan(event: ScanEvent, request: Request): void {
  try {
    // Also visible in Vercel's function logs if analytics is misconfigured.
    console.log(JSON.stringify({ type: 'scan', ...event }));
    const sent = (async () => track('scan', event, { request }))().catch(() => {});
    waitUntil(sent);
  } catch {
    // Counting is best-effort.
  }
}
