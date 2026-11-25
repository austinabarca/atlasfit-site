# Astro Lift and Ad Links (Phases 1–3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the existing site on Astro and Vercel unchanged, add the `/get` smart link and `/story` form, and switch atlasfit.app over before the Crunch ads go live on 2026-11-27.

**Architecture:** An Astro project at the repo root. The legacy HTML pages are served as-is from `public/`. `/get` and `/story` are the only server-rendered routes, running as Vercel functions. All redirect logic is in pure functions with unit tests, and one script checks the spec's URL contract against any deployed URL.

**Tech Stack:** Astro (current stable), `@astrojs/vercel`, `@vercel/analytics`, `@vercel/functions`, Vitest, Node 24, Formspree.

**Spec:** `docs/superpowers/specs/2026-11-25-astro-migration-and-ad-links-design.md`

This plan covers spec Phases 1 to 3. Phases 4 and 5 (page conversion, clean-up) get their own plan after launch.

## Global Constraints

- Legacy pages move into `public/` byte-for-byte. No edits to their content.
- Every row of the spec's URL contract must pass on the preview URL and on atlasfit.app.
- `/get` redirects are `302` with `Cache-Control: no-store`. Never `301` or `308`.
- A failure to record a scan must never block or delay a redirect.
- `src` accepted form: lowercase letters, digits, hyphens, 1 to 40 characters. Anything else is `unknown`. (Plan decision: input is trimmed and lowercased before the check, so `Crunch-Bear` counts as `crunch-bear`.)
- App Store URL: `https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147`
- Play URL: `https://play.google.com/store/apps/details?id=app.atlasfit.mobile`
- Play campaign tag: `&referrer=utm_source%3Dcrunch%26utm_medium%3Dqr%26utm_campaign%3D<src>`
- App Store campaign tag: `?pt=<token>&ct=<src>&mt=8`, omitted entirely while the token is empty.
- `/get`, `/story` and the not-found page carry `<meta name="robots" content="noindex">`.
- New pages use the visual style of the existing `404.html` card (dark `#0A0A0A`, Inter, red/gold accents).
- Work happens on the `astro-migration` branch. `main` is not touched until Task 7.
- Pushes, the merge, and all Vercel, Namecheap, GitHub and Formspree dashboard steps are done by or confirmed with the owner.

## Review Focus

1. **No `User-Agent` header, or an empty one:** `/get` shows the two-button page. It does not error. (Test in Task 3.)
2. **Hostile or sloppy `src`** (`?src=a&referrer=x`, 500 characters, spaces, emoji, repeated `src` params): treated as `unknown` or the first value, never copied raw into a store URL. (Tests in Task 3.)
3. **Analytics is down or slow:** the redirect still returns immediately. (Test in Task 4.)
4. **iPad and desktop Safari** (report as `Macintosh`), and Android tablets: iPad and desktop get the two-button page, Android tablets go to Play. (Tests in Task 3.)
5. **Formspree rejects or the network drops on `/story`:** the person sees an error, keeps what they typed, and can retry. (Manual check in Task 5.)

---

## File structure

| File | Responsibility |
|------|----------------|
| `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore` | project setup |
| `vercel.json` | clean URLs, content type for the `.well-known` files |
| `public/**` | legacy pages, `atlas-qr-beta.png`, `.well-known/`, served as-is |
| `src/pages/404.astro` | the legacy `404.html`, verbatim, so Astro wires it as the not-found page |
| `src/config/links.ts` | store URLs, provider token, Formspree story endpoint |
| `src/lib/storeLinks.ts` | `sanitizeSrc`, `detectPlatform`, `storeUrl` |
| `src/lib/trackScan.ts` | records one scan event without blocking |
| `src/pages/get.astro` | smart link and two-button fallback page |
| `src/pages/story.astro` | story form |
| `tests/storeLinks.test.ts`, `tests/trackScan.test.ts` | unit tests |
| `scripts/check-urls.mjs` | URL contract and redirect check against a base URL |

`CNAME`, `.nojekyll` and `docs/` stay at the repo root. They are not in `public/`, so Vercel does not serve them.

---

### Task 1: Scaffold Astro and lift the legacy site

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `vercel.json`, `src/pages/404.astro`, `scripts/check-urls.mjs`
- Move (with `git mv`): `index.html`, `beta.html`, `vendors.html`, `support.html`, `privacy.html`, `terms.html`, `delete-account.html`, `child-safety.html`, `confirmed/`, `atlas-qr-beta.png`, `.well-known/` → `public/`
- Move: `404.html` → `src/pages/404.astro`

**Interfaces:**
- Produces: `npm run build`, `npm run dev`, `npm test`, and `node scripts/check-urls.mjs <baseUrl>` (exit code 0 when every check passes, 1 otherwise, one line printed per check).

- [ ] **Step 1: Initialise the project**

`npm init -y`, then install `astro`, `@astrojs/vercel`, `@vercel/analytics`, `@vercel/functions`, and `vitest` as a dev dependency. Set `"type": "module"` and the scripts `dev: astro dev`, `build: astro build`, `test: vitest run`. `.gitignore` lists `node_modules`, `dist`, `.astro`, `.vercel`.

- [ ] **Step 2: Write `astro.config.mjs`**

`site: 'https://atlasfit.app'`, the Vercel adapter, default static output. `tsconfig.json` extends `astro/tsconfigs/strict`.

- [ ] **Step 3: Move the legacy files into `public/` with `git mv`**

Verify: `git diff --cached -M --stat` shows only renames with 100% similarity.

- [ ] **Step 4: Create `src/pages/404.astro` from `404.html`**

`git mv 404.html src/pages/404.astro`. Add `is:inline` to its `<style>` and `<script>` tags so Astro leaves them exactly as written. No other change.

- [ ] **Step 5: Write `vercel.json`**

```json
{
  "cleanUrls": true,
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    }
  ]
}
```

- [ ] **Step 6: Write `scripts/check-urls.mjs`**

Takes a base URL. Follows redirects unless stated. For each legacy page it reads the expected `<title>` from the local file in `public/` and compares it with the fetched page's `<title>`. Checks:

| Request | Passes when |
|---------|-------------|
| `/` | 200, title equals `public/index.html` title |
| `/beta`, `/vendors`, `/support`, `/privacy`, `/terms`, `/delete-account`, `/child-safety`, and each with `.html` | 200 after redirects, title equals the matching local file |
| `/confirmed`, `/confirmed/` | 200 after redirects, title equals `public/confirmed/index.html` |
| `/templates/abc123` | body contains `Shared Workout` and `atlas://templates/` |
| `/no-such-page-xyz` | status 404, body contains `Page Not Found` |
| `/.well-known/apple-app-site-association` | 200, no redirect, `content-type` starts with `application/json`, body parses as JSON with `applinks` |
| `/.well-known/assetlinks.json` | 200, no redirect, `content-type` starts with `application/json`, body parses as JSON |
| `/atlas-qr-beta.png` | 200, `content-type` is `image/png` |

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 8: Commit**

`git commit -m "Scaffold Astro and lift legacy pages into public/"`

---

### Task 2: First Vercel preview (owner and Claude together)

**Files:** none, unless Step 4 fails.

- [ ] **Step 1 (owner): Import the repo into Vercel**

In Vercel: Add New → Project → import `austinabarca/atlasfit-site`. Framework preset: Astro. Leave build settings at their defaults. Do not add the domain yet.

- [ ] **Step 2 (owner): Make previews reachable**

Project → Settings → Deployment Protection → turn off Vercel Authentication for preview deployments, so the check script and phones can load the preview URL.

- [ ] **Step 3: Push the branch**

`git push -u origin astro-migration`. Vercel builds a preview and shows its URL.

- [ ] **Step 4: Run the contract check**

Run: `node scripts/check-urls.mjs <preview URL>`
Expected: every line passes, exit code 0.

If the extensionless or `.html` rows fail, `cleanUrls` is not being applied alongside the adapter: replace it in `vercel.json` with one explicit `rewrites` entry per page (`/beta` → `/beta.html`, and so on), push, and re-run. Do not continue until the check is green.

- [ ] **Step 5 (owner): Look at it**

Open the preview URL and atlasfit.app side by side on a laptop and a phone. Every page should look identical.

---

### Task 3: Store link logic

**Files:**
- Create: `src/config/links.ts`, `src/lib/storeLinks.ts`
- Test: `tests/storeLinks.test.ts`

**Interfaces:**
- Produces, from `src/config/links.ts`: `APP_STORE_URL`, `PLAY_URL` (the two constants in Global Constraints), `APP_STORE_PROVIDER_TOKEN = ''`, `STORY_FORM_ENDPOINT = 'https://formspree.io/f/YOUR_STORY_FORM_ID'`.
- Produces, from `src/lib/storeLinks.ts`:
  - `type Platform = 'ios' | 'android' | 'other'`
  - `sanitizeSrc(raw: string | null | undefined): string`
  - `detectPlatform(userAgent: string | null | undefined): Platform`
  - `storeUrl(platform: 'ios' | 'android', src: string, providerToken?: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
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
      'https://play.google.com/store/apps/details?id=app.atlasfit.mobile&referrer=utm_source%3Dcrunch%26utm_medium%3Dqr%26utm_campaign%3Dcrunch-bear'));
  it('ios without a token is the bare listing', () =>
    expect(storeUrl('ios', 'crunch-bear', '')).toBe(
      'https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147'));
  it('ios with a token carries the campaign', () =>
    expect(storeUrl('ios', 'crunch-bear', '123456')).toBe(
      'https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147?pt=123456&ct=crunch-bear&mt=8'));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL, module `src/lib/storeLinks` not found.

- [ ] **Step 3: Implement `src/config/links.ts` and the three functions**

`storeUrl`'s `providerToken` defaults to `APP_STORE_PROVIDER_TOKEN`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "Add store link logic for the /get smart link"`

---

### Task 4: `/get` route and scan counting

**Files:**
- Create: `src/lib/trackScan.ts`, `src/pages/get.astro`
- Modify: `scripts/check-urls.mjs`
- Test: `tests/trackScan.test.ts`

**Interfaces:**
- Consumes: everything Task 3 produces.
- Produces: `trackScan(event: { route: 'get' | 'story'; src: string; platform: Platform }, request: Request): void`

- [ ] **Step 1: Write the failing tests for `trackScan`**

Mock `@vercel/analytics/server` and `@vercel/functions`.

```ts
it('returns synchronously and hands the work to waitUntil', () => {
  // track mocked to a promise that never resolves
  const result = trackScan({ route: 'get', src: 'crunch-bear', platform: 'ios' }, req);
  expect(result).toBeUndefined();
  expect(waitUntil).toHaveBeenCalledTimes(1);
});
it('sends the event name and properties', async () => {
  expect(track).toHaveBeenCalledWith(
    'scan', { route: 'get', src: 'crunch-bear', platform: 'ios' }, expect.anything());
});
it('swallows a rejected track call', async () => {
  // track mocked to reject; awaiting the promise given to waitUntil must not throw
});
it('swallows a throwing waitUntil', () => {
  // waitUntil mocked to throw; trackScan must not throw
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL, module `src/lib/trackScan` not found.

- [ ] **Step 3: Implement `trackScan`**

Calls `track('scan', event, { request })` from `@vercel/analytics/server` inside `waitUntil` from `@vercel/functions`, all wrapped so nothing escapes. Also writes one `console.log(JSON.stringify({ type: 'scan', ...event }))` line, so scans are visible in Vercel's function logs even if analytics is misconfigured. Confirm the `track` options argument against the installed package's types.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement `src/pages/get.astro`**

`export const prerender = false`. In the frontmatter: read `src` with `Astro.url.searchParams.get('src')` (first value), sanitise it, detect the platform from the `user-agent` header, call `trackScan` with `route: 'get'`. For `ios` and `android` return a `Response` with status `302`, `Location: storeUrl(...)` and `Cache-Control: no-store`. For `other`, set `Cache-Control: no-store` and render the fallback page:

- 404.html card style, `noindex`, title `Get Atlas`.
- Heading: `Get Atlas`. Sub-line: `Track workouts, train with AI coaching, and connect with lifters.`
- Two buttons: `Download on the App Store` → `storeUrl('ios', src)`, `Get it on Google Play` → `storeUrl('android', src)`.

- [ ] **Step 6: Extend `scripts/check-urls.mjs`**

Add these checks, each fetched with `redirect: 'manual'` and the user-agents from Task 3's tests:

| Request | Passes when |
|---------|-------------|
| `/get?src=check-ios`, iPhone UA | 302, `location` starts with `https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147`, `cache-control` contains `no-store` |
| `/get?src=check-android`, Android UA | 302, `location` equals `storeUrl('android', 'check-android')` as written in Global Constraints |
| `/get?src=check-desktop`, Mac UA | 200, body contains both store URLs and `noindex` |
| `/get`, no `user-agent` header | 200 |
| `/get?src=A%26referrer%3Dx`, Android UA | 302, `location` ends with `utm_campaign%3Dunknown` |

- [ ] **Step 7: Run locally**

Run: `npm run dev`, then `node scripts/check-urls.mjs http://localhost:4321`
Expected: the five `/get` checks pass. Legacy-page rows may fail locally because clean URLs are a Vercel feature. That is expected here and is checked on the preview in Task 6.

- [ ] **Step 8: Commit**

`git commit -m "Add /get smart link with per-ad scan counting"`

---

### Task 5: `/story` page

**Files:**
- Create: `src/pages/story.astro`
- Modify: `scripts/check-urls.mjs`

**Interfaces:**
- Consumes: `sanitizeSrc`, `detectPlatform`, `trackScan`, `STORY_FORM_ENDPOINT`.

- [ ] **Step 1: Add the failing check to `scripts/check-urls.mjs`**

| Request | Passes when |
|---------|-------------|
| `/story?src=check-story` | 200, body contains `What do you train for?`, `social@atlasfit.app`, `noindex`, and an `<input` with `name="src"` and `value="check-story"` |

Run against `http://localhost:4321`. Expected: this row FAILS (404).

- [ ] **Step 2: Implement `src/pages/story.astro`**

`export const prerender = false`. Frontmatter: sanitise `src`, call `trackScan` with `route: 'story'`, set `Cache-Control: no-store`. Page in the 404.html card style, `noindex`, title `Share Your Story | Atlas`.

Exact copy:

- Heading: `What do you train for?`
- Intro: `Tell us what drives you: how you started, something that changed you, or who you're working to become. Funny, inspiring, raw, or a single word. It all counts. Your story could be featured in the Atlas community, and we'll always check with you before we share it. Send a photo to social@atlasfit.app if you want to add one with your story.` (`social@atlasfit.app` is a `mailto:` link.)
- Submit button: `Share my story`
- Thank-you state: `Thank you. We read every story, and we'll be in touch before we share yours.` followed by a `Get Atlas` link to `/get?src=story-page`.
- Under the form: `See our Privacy Policy.` linking to `/privacy`.

Form posts to `STORY_FORM_ENDPOINT`. Fields, all required:

| Label | `name` | Type |
|-------|--------|------|
| First name | `first_name` | text, `autocomplete="given-name"` |
| Email or Instagram handle | `contact` | text |
| Your story | `story` | textarea, `maxlength="2000"` |
| I am 16 or older | `age_16_plus` | checkbox, value `yes` |
| I consent to my story being shared by Atlas. We'll check with you first. | `consent_share` | checkbox, value `yes` |
| (hidden) | `src` | hidden, value is the sanitised `src` |

Submission uses the same async pattern as `public/beta.html` lines 389–423 (fetch with `Accept: application/json`, inline success state), with two differences: errors show as inline text under the button, not `alert()`, and the form keeps its values on failure. The button is disabled while sending, so a double tap sends once.

- [ ] **Step 3: Run the check**

Run: `node scripts/check-urls.mjs http://localhost:4321`
Expected: the `/story` row passes.

- [ ] **Step 4: Check the failure path by hand**

In `npm run dev`, with the placeholder endpoint still in place, fill in and submit the form. Expected: the inline error appears, the typed story is still in the box, and the button is usable again.

- [ ] **Step 5: Commit**

`git commit -m "Add /story form for the Share Your Story ad"`

---

### Task 6: Verify Phase 2 on the preview

**Files:**
- Modify: `src/config/links.ts` (real Formspree endpoint)

- [ ] **Step 1 (owner): Create the Formspree story form**

New form named `Atlas Stories`. Give Claude the endpoint. Set `STORY_FORM_ENDPOINT` to it and commit: `git commit -m "Point /story at the real Formspree form"`.

- [ ] **Step 2 (owner): Turn on Web Analytics**

Vercel project → Analytics → Enable Web Analytics.

- [ ] **Step 3: Push and run the full check**

`git push`, wait for the preview, then run: `node scripts/check-urls.mjs <preview URL>`
Expected: every line passes, exit code 0.

- [ ] **Step 4 (owner): Test on real phones**

On an iPhone and an Android phone, open `<preview URL>/get?src=preview-test`. Each must land in its own store on the Atlas listing. Open it on a laptop: two buttons. Submit a test story at `<preview URL>/story?src=preview-test` and confirm it arrives in Formspree with `src` filled in.

- [ ] **Step 5: Confirm scans are recorded**

In Vercel → Analytics → Events, a `scan` event shows with `src: preview-test` and the right `platform`. Events can take a few minutes to appear. If none appear, check the function logs for the `{"type":"scan",...}` lines: if those are present the route is working and only the analytics hookup needs fixing, which must be done before Task 7.

---

### Task 7: Cutover (2026-11-26, owner and Claude together)

**Files:** none.

- [ ] **Step 1: Save the legacy site**

`git branch legacy-pages main` and `git push origin legacy-pages`.

- [ ] **Step 2 (owner): Point GitHub Pages at the legacy branch**

GitHub repo → Settings → Pages → Source branch: `legacy-pages`. Wait for the Pages build, then confirm atlasfit.app still loads. This keeps the old site live and available as a fallback while `main` changes.

- [ ] **Step 3: Merge**

Open a pull request from `astro-migration` to `main`, confirm the Vercel preview check is green, and merge. Vercel builds production from `main`.

- [ ] **Step 4: Check production on the Vercel URL**

Run: `node scripts/check-urls.mjs <project>.vercel.app`
Expected: every line passes.

- [ ] **Step 5 (owner): Add the domain in Vercel**

Project → Settings → Domains → add `atlasfit.app` and `www.atlasfit.app`, with `www` redirecting to the bare domain. Vercel displays the DNS records it needs.

- [ ] **Step 6 (owner): Switch DNS at Namecheap**

Domain List → atlasfit.app → Advanced DNS. Replace the GitHub Pages `A` records for `@` and the `www` `CNAME` with the values Vercel displayed in Step 5. Leave the mail (MX, TXT) records alone.

- [ ] **Step 7 (owner): Release the domain from GitHub Pages**

GitHub repo → Settings → Pages → remove the custom domain. Pages keeps building `legacy-pages` at its github.io address.

- [ ] **Step 8: Verify on the real domain**

Wait until Vercel shows the domain as valid with a certificate, then run: `node scripts/check-urls.mjs https://atlasfit.app`
Expected: every line passes.

- [ ] **Step 9 (owner): Verify on phones**

- A shared-workout link (`https://atlasfit.app/templates/<real id>`) opens the Atlas app on a phone that has it installed.
- The existing beta QR lands on the beta page.
- `https://atlasfit.app/get?src=launch-test` goes to the right store on iPhone and Android.

- [ ] **Step 10 (owner): Hand the links to the designer**

`https://atlasfit.app/get?src=<ad name>` for each store ad and `https://atlasfit.app/story?src=<ad name>` for the story ad, with ad names in lowercase letters, digits and hyphens.

- [ ] **Step 11 (owner, 2026-11-27): Screen test**

Scan each finished ad's QR from about two metres, on an iPhone and an Android phone, on a real Crunch screen. Then confirm the scans appear in Vercel Analytics under the right `src`.

---

### Task 8: Vendor form (spec Phase 3b, before 2026-11-27)

**Files:**
- Modify: `public/vendors.html:796`, `:877`, `:932`

- [ ] **Step 1 (owner): Supply the values**

A new Formspree form for vendor applications and its endpoint. The Google Form link, or the decision to remove both Google Form buttons.

- [ ] **Step 2: Replace the placeholders**

Line 877: form `action` becomes the vendor endpoint. Lines 796 and 932: `href` becomes the Google Form link, or the two buttons (and the "Prefer a Google Form?" text beside the second) are removed. Remove the three `<!-- TODO -->` comments. Nothing else on the page changes.

- [ ] **Step 3: Verify**

Run: `grep -n "YOUR_" public/vendors.html`
Expected: no output.

After deploy, submit a test application on `/vendors` and confirm it arrives in Formspree.

- [ ] **Step 4: Commit**

`git commit -m "Wire up the vendor application form"`

---

**Rollback before ads are live:** in Namecheap, restore the GitHub Pages records, then re-add the custom domain in GitHub Pages. **After ads are live:** do not roll back DNS, since `/get` and `/story` only exist on Vercel. Use Vercel → Deployments → Promote on the last good deployment.
