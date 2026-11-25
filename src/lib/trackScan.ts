import { track } from '@vercel/analytics/server';
import { waitUntil } from '@vercel/functions';
import type { Platform } from './storeLinks';

export interface ScanEvent {
  route: 'get' | 'story';
  src: string;
  platform: Platform;
}

// The Vercel plan allows two properties per custom event, so the route is
// carried by the event name and the properties are src and platform.
const EVENT_NAME = { get: 'scan', story: 'story_scan' } as const;

/**
 * Records one QR scan. Returns immediately: the analytics call finishes in the
 * background, and no failure here may ever block or delay the response.
 */
export function trackScan(event: ScanEvent, request: Request): void {
  try {
    // Also visible in Vercel's function logs if analytics is misconfigured.
    console.log(JSON.stringify({ type: 'scan', ...event }));
    const { route, src, platform } = event;
    const sent = (async () => track(EVENT_NAME[route], { src, platform }, { request }))().catch(() => {});
    waitUntil(sent);
  } catch {
    // Counting is best-effort.
  }
}
