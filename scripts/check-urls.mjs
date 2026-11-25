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

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
