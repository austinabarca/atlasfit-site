// Checks the URL contract from the design spec against a deployed site.
// Usage: node scripts/check-urls.mjs <baseUrl>
import { readFileSync } from 'node:fs';

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('Usage: node scripts/check-urls.mjs <baseUrl>');
  process.exit(1);
}

const PUBLIC_DIR = new URL('../public/', import.meta.url);
const LEGACY_PAGES = ['beta', 'vendors', 'support', 'privacy', 'terms', 'delete-account', 'child-safety'];

const titleOf = (html) => (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
const localTitle = (file) => titleOf(readFileSync(new URL(file, PUBLIC_DIR), 'utf8'));

let failures = 0;

async function check(name, run) {
  try {
    const problem = await run();
    if (problem) {
      failures++;
      console.log(`FAIL  ${name}: ${problem}`);
    } else {
      console.log(`ok    ${name}`);
    }
  } catch (err) {
    failures++;
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}

const get = (path, options = {}) => fetch(base + path, options);

function pageCheck(path, localFile) {
  return check(path, async () => {
    const res = await get(path);
    if (res.status !== 200) return `status ${res.status}`;
    const expected = localTitle(localFile);
    const actual = titleOf(await res.text());
    if (actual !== expected) return `title "${actual}", expected "${expected}"`;
  });
}

function jsonFileCheck(path, requiredKey) {
  return check(path, async () => {
    const res = await get(path, { redirect: 'manual' });
    if (res.status !== 200) return `status ${res.status} (must be 200 with no redirect)`;
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('application/json')) return `content-type "${type}"`;
    const data = JSON.parse(await res.text());
    if (requiredKey && !(requiredKey in data)) return `missing "${requiredKey}"`;
  });
}

await pageCheck('/', 'index.html');
for (const page of LEGACY_PAGES) {
  await pageCheck(`/${page}`, `${page}.html`);
  await pageCheck(`/${page}.html`, `${page}.html`);
}
await pageCheck('/confirmed', 'confirmed/index.html');
await pageCheck('/confirmed/', 'confirmed/index.html');

await check('/templates/abc123', async () => {
  const body = await (await get('/templates/abc123')).text();
  if (!body.includes('Shared Workout')) return 'missing "Shared Workout"';
  if (!body.includes('atlas://templates/')) return 'missing atlas:// hand-off';
});

await check('/no-such-page-xyz', async () => {
  const res = await get('/no-such-page-xyz');
  if (res.status !== 404) return `status ${res.status}, expected 404`;
  if (!(await res.text()).includes('Page Not Found')) return 'missing "Page Not Found"';
});

await jsonFileCheck('/.well-known/apple-app-site-association', 'applinks');
await jsonFileCheck('/.well-known/assetlinks.json');

await check('/atlas-qr-beta.png', async () => {
  const res = await get('/atlas-qr-beta.png');
  if (res.status !== 200) return `status ${res.status}`;
  const type = res.headers.get('content-type') ?? '';
  if (type !== 'image/png') return `content-type "${type}"`;
});

// --- /get smart link ---

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
};
const APP_STORE = 'https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147';
const PLAY = 'https://play.google.com/store/apps/details?id=app.atlasfit.mobile';
const playCampaign = (src) => `${PLAY}&referrer=utm_source%3Datlasfit%26utm_medium%3Dad-link%26utm_campaign%3D${src}`;

const getAs = (path, userAgent) =>
  get(path, { redirect: 'manual', headers: { 'user-agent': userAgent } });

function redirectProblem(res, locationOk, expected) {
  if (res.status !== 302) return `status ${res.status}, expected 302`;
  const location = res.headers.get('location') ?? '';
  if (!locationOk(location)) return `location "${location}", expected ${expected}`;
  const cache = res.headers.get('cache-control') ?? '';
  if (!cache.includes('no-store')) return `cache-control "${cache}"`;
}

await check('/get on iPhone', async () => {
  const res = await getAs('/get?src=check-ios', UA.iphone);
  const expected = `${APP_STORE}?pt=128689965&ct=check-ios&mt=8`;
  return redirectProblem(res, (l) => l === expected, expected);
});

await check('/get on Android', async () => {
  const res = await getAs('/get?src=check-android', UA.android);
  const expected = playCampaign('check-android');
  return redirectProblem(res, (l) => l === expected, expected);
});

await check('/get on desktop', async () => {
  const res = await getAs('/get?src=check-desktop', UA.mac);
  if (res.status !== 200) return `status ${res.status}`;
  const body = (await res.text()).replaceAll('&amp;', '&').replaceAll('&#38;', '&');
  if (!body.includes(APP_STORE)) return 'missing App Store link';
  if (!body.includes(playCampaign('check-desktop'))) return 'missing Play link with campaign';
  if (!body.includes('noindex')) return 'missing noindex';
});

await check('/get with no user-agent', async () => {
  const res = await getAs('/get', '');
  if (res.status !== 200) return `status ${res.status}`;
});

await check('/get with a malformed src', async () => {
  const res = await getAs('/get?src=A%26referrer%3Dx', UA.android);
  return redirectProblem(res, (l) => l.endsWith('utm_campaign%3Dunknown'), 'to end with utm_campaign%3Dunknown');
});

// --- /story form ---

await check('/story', async () => {
  const res = await get('/story?src=check-story');
  if (res.status !== 200) return `status ${res.status}`;
  const body = await res.text();
  // The heading wraps part of its text in a span, so compare against visible text.
  const visible = body.replace(/<[^>]+>/g, '');
  for (const text of ['What do you train for?', 'social@atlasfit.app']) {
    if (!visible.includes(text)) return `missing "${text}"`;
  }
  if (!body.includes('noindex')) return 'missing noindex';
  const srcInput = body.match(/<input[^>]*name="src"[^>]*>/)?.[0] ?? '';
  if (!srcInput.includes('value="check-story"')) return 'hidden src field does not carry the ad name';
  if (!/<input[^>]*name="anonymous"/.test(body)) return 'missing the anonymous checkbox';
  if (!body.includes('href="/get?src=check-story"')) return 'Get Atlas link does not carry the ad name';
});

const summary = failures ? `\n${failures} check(s) failed` : '\nAll checks passed';
console.log(summary);
process.exit(failures ? 1 : 0);

