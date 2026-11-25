# Astro Migration and Ad Links (`/get`, `/story`) — Design Spec

**Date:** 2026-11-25
**Author:** Atlas team (via Claude)
**Status:** Approved (2026-11-25)

## Purpose

Atlas is starting paid marketing with ads on gym TV screens (Crunch). Each ad
carries one QR code. The site has to give the designer permanent links on
atlasfit.app that:

- send a phone straight to the right app store (`/get`),
- collect member stories for the "Share your story" ad (`/story`),
- report how many scans each ad design produced.

At the same time the site moves from GitHub Pages to Astro on Vercel. The
reason for the move is SEO and server-side redirects. The owner also wants to
learn the process so it can be repeated for other clients, so every phase ends
in something that can be seen and checked.

## Context: the site today

- Static site on GitHub Pages: `CNAME` (atlasfit.app), `.nojekyll`, no build
  step, no analytics.
- Ten pages, all plain HTML with inline CSS and small inline scripts:
  `index.html`, `beta.html`, `vendors.html`, `support.html`, `privacy.html`,
  `terms.html`, `delete-account.html`, `child-safety.html`,
  `confirmed/index.html`, `404.html`.
- `404.html` does double duty. For `/templates/<id>` it shows a "shared
  workout" view and tries to open the app with `atlas://templates/<id>`. For
  anything else it shows a not-found view.
- `.well-known/apple-app-site-association` and `.well-known/assetlinks.json`
  make `/templates/*` links open the installed app (iOS app ID
  `RQRU6Y495Z.app.atlasfit.mobile`, Android package `app.atlasfit.mobile`).
- Forms post to Formspree (`beta.html`, `vendors.html`).
- `atlas-qr-beta.png` encodes `https://atlasfit.app/beta`. That URL works
  today without the `.html` extension, and so do the other pages.
- iOS listing: `https://apps.apple.com/us/app/atlas-social-and-fitness/id6760980147`.
- Android is live (owner confirmed). The site still says "Google Play coming
  soon" on `index.html` and `support.html` and has no Play link.

## Deadline

The Crunch ads go live on **2026-11-27**. Phases 0 to 3 must be finished by
then. Phases 4 and 5 have no deadline and start after launch.

- 2026-11-25: Phase 1 and Phase 2 on a preview URL. Owner sets up Vercel and
  the Formspree story form, and lowers the DNS TTL at Namecheap so the switch
  takes effect quickly.
- 2026-11-26: Phase 3 cutover, as early in the day as possible, to leave time
  for DNS and certificate issues.
- 2026-11-27: QR test on a real Crunch screen, then ads live.

If anything in Phase 2 threatens the date, `/get` takes priority over
`/story`.

## Goals

1. `/get` and `/story` live on atlasfit.app before any page conversion starts.
2. Every URL that works today keeps working, with the same content.
3. Scans are counted per ad, and installs are attributable per ad in App
   Store Connect and Play Console.
4. The site ends up as proper Astro pages with a shared layout and SEO basics.
5. Each phase is small, checkable on a preview URL, and reversible.

## Non-goals

- No visual redesign. Page bodies must look the same as the originals. The
  one approved change is a shared nav and footer (see Phase 4).
- No change to the wording of the legal pages (`privacy`, `terms`,
  `child-safety`, `delete-account`). The app stores reviewed that text.
- No CMS, blog, or new marketing pages.
- No third-party app-link service (Branch, AppsFlyer).
- No changes to `/beta`. It is the beta-testers page and stays as it is.

## Anti-goals

- A QR code already on a screen that stops working, for any reason.
- Shared-workout links that stop opening the app after the move.
- An ad link that passes through a visible interim page on a phone.

## Approaches considered

1. **Lift, then convert (chosen).** Create the Astro project, serve the ten
   existing pages untouched from it, build `/get` and `/story` first, switch
   DNS, then convert pages one at a time. The site is a mix of old and new
   files for a while. In return the ad links ship in the first deploy and
   every later step is small.
2. **Full conversion, then cut over.** Cleanest end state with no mixed
   period, but the ad links wait on the whole migration and the single
   cutover is harder to verify.
3. **Links on GitHub Pages now, migrate later.** Fastest start, but the
   redirect and the scan counting get built twice, and the browser-side
   version counts scans less reliably.

The owner picked 1 because the QR codes are time-sensitive and the SEO work
is not.

## Decisions made by the owner

- Framework: Astro. Host: Vercel.
- Convert the existing site by hand. No Lovable rebuild.
- Same look after the move.
- Option 1 ordering, delivered in phases.

## Design

### URL contract

These must all return the same content as today, at these exact paths, on the
preview deployment and after cutover. This list is the acceptance test for
Phases 1, 3 and 4.

| Path | Must serve |
|------|------------|
| `/` | home page |
| `/beta` and `/beta.html` | beta page |
| `/vendors`, `/support`, `/privacy`, `/terms`, `/delete-account`, `/child-safety` (each also with `.html`) | the matching page |
| `/confirmed` and `/confirmed/` | email confirmation page |
| `/templates/<any id>` | shared-workout view, with the `atlas://` hand-off |
| any unknown path | not-found view |
| `/.well-known/apple-app-site-association` | the JSON file, `Content-Type: application/json`, no redirect |
| `/.well-known/assetlinks.json` | the JSON file, `Content-Type: application/json`, no redirect |
| `/atlas-qr-beta.png` | the image |

New paths: `/get`, `/story`.

How the extensionless and `.html` forms are both served (Vercel clean URLs,
redirects, or Astro config) is left to the builder. The table is what has to
pass.

### `/get`: the smart link

- A server-rendered route. It reads the `User-Agent` header on the server.
- iPhone or iPod: `302` to the App Store listing.
- Android: `302` to `https://play.google.com/store/apps/details?id=app.atlasfit.mobile`.
- Anything else (laptops, tablets, iPads that report as Mac, unknown): render
  a small page at `/get` with both store buttons, in the site's existing
  style.
- The redirect is `302` with `Cache-Control: no-store`. A permanent redirect
  would be cached by phones, which would stop repeat scans being counted and
  would make the destination impossible to change later.
- `?src=<name>` identifies the ad. Accepted form: lowercase letters, digits
  and hyphens, up to 40 characters. Anything else, or no `src`, is treated as
  `unknown`. The redirect still happens.
- The `src` is passed on to the store as a campaign tag:
  - App Store: `?pt=<provider token>&ct=<src>&mt=8`. If the provider token
    is not configured yet, the App Store link goes out without campaign
    tags. iOS installs are then unattributed until the token is added, and
    scans are still counted.
  - Google Play: `&referrer=utm_source%3Dcrunch%26utm_medium%3Dqr%26utm_campaign%3D<src>`
- Store URLs and the provider token live in one config file, so a changed
  listing is a one-line edit and every QR on a screen keeps working.

### Scan counting

- Each `/get` request records one event, `scan`, with `src` and `platform`
  (`ios`, `android`, `other`), before redirecting.
- Each `/story` request records the same `scan` event with `route: story`, so
  the story ad is counted from day one like the others. This makes `/story`
  server-rendered too. Its URL does not change. (My call.)
- Events go to Vercel Web Analytics as server-side custom events. This is my
  call: the site will be on Vercel anyway, and it avoids a second vendor.
  Custom events need a paid Vercel plan, which a commercial site needs
  regardless.
- A failure to record must never block or delay the redirect.
- Scans show how many people pointed a phone at each ad. The store campaign
  tags show how many of them installed. The two are read together.

### `/story`: the story form

- A normal Astro page in the site's existing style: short headline, the form,
  and an inline thank-you state. Same async Formspree pattern as `beta.html`.
- Intro copy (owner's brief, wording tightened):

  > **What do you train for?**
  > Tell us what drives you: how you started, something that changed you, or
  > who you're working to become. Funny, inspiring, raw, or a single word.
  > It all counts. Your story could be featured in the Atlas community, and
  > we'll always check with you before we share it. Send a photo to
  > social@atlasfit.app if you want to add one with your story.

- Photos come in by email to social@atlasfit.app (owner's decision). The form
  has no upload field.
- Fields (owner approved):
  - First name (required)
  - Email or Instagram handle (required)
  - Your story (required, text box)
  - Checkbox: "I am 16 or older" (required)
  - Checkbox: "I consent to my story being shared by Atlas. We'll check with
    you first." (required)
  - Hidden `src`, copied from the query string
- A link to the existing privacy policy sits under the form. The policy text
  itself is not changed by this work.
- Stories may be used in future ads. The consent wording and the "we'll check
  with you first" promise are what make that possible, so both stay.
- It posts to a new Formspree form, separate from the beta and vendor forms.
  Until the owner supplies the endpoint, the page is built with a placeholder.
  The real endpoint must be in place before the Phase 3 cutover.
- It does not redirect to a store. A "Get Atlas" link to `/get` sits under the
  thank-you message.

### Project layout

- The Astro project lives at the root of this repo.
- Legacy pages sit in Astro's `public/` folder, which is served as-is. A page
  leaves `public/` at the moment its Astro version replaces it, in the same
  commit, so a path is never served by two files.
- `/get` and `/story` are the only server-rendered routes. Everything else is
  static.
- Repo layout beyond this is left to the builder.

### Rollback

- Before the Astro restructure merges, the current site is kept on a branch
  (`legacy-pages`) that GitHub Pages can serve.
- Until Phase 5, going back is a DNS change to GitHub Pages plus pointing
  Pages at that branch.
- `/get` and `/story` do not exist on the legacy site. Once ads are live,
  rolling back breaks the ad links, so after Phase 3 fixes go forward on
  Vercel (instant rollback to a previous deployment) and the DNS rollback is
  a last resort.

## Phases

Each phase ends with a check the owner can run personally.

### Phase 0: Owner prerequisites

Nothing is built. The owner gathers:

- A Vercel account on a paid plan, connected to the GitHub repo.
- Access to the DNS settings for atlasfit.app.
- A new Formspree form for stories, and its endpoint.
- The App Store Connect provider token (for the `pt` campaign tag).
- Confirmation of the Google Play URL above.
- From the designer: the list of ads, to agree `src` names.

Only the first three block the build. The provider token can be added after
launch, and `src` accepts any well-formed name, so no agreed list is needed
for the links to work.

The link formats are final as of this doc: `https://atlasfit.app/get?src=<ad>`
and `https://atlasfit.app/story?src=<ad>`. The designer can generate QR codes
from them now. They start working at the Phase 3 cutover.

**Check:** the first three items are written into this doc.

### Phase 1: Scaffold and lift

- Create the Astro project with the Vercel adapter on a branch.
- Move the ten pages, the image and `.well-known` into `public/`, unchanged.
- Deploy to a Vercel preview URL. The live site is untouched.

**Check:** every row of the URL contract passes on the preview URL, and pages
look identical to production side by side.

**What this phase teaches:** project scaffolding, what a build step is,
preview deployments, and how static files are served.

### Phase 2: `/get` and `/story`

- Build both routes and the scan event on the same branch.

**Check:** on the preview URL, requests with an iPhone, an Android and a
desktop user-agent each land in the right place, with the campaign tag
present. A real iPhone and a real Android phone are tested by hand. A test
story arrives in Formspree. Scan events appear in Vercel Analytics with the
right `src`.

**What this phase teaches:** static pages versus server-rendered routes,
redirects and status codes, and campaign attribution.

### Phase 3: Cutover

- Save the legacy site to the `legacy-pages` branch.
- Merge, add atlasfit.app to the Vercel project, switch DNS.
- Send the designer the final links.

**Check:** the URL contract passes on atlasfit.app. A shared-workout link
opens the app on a phone with Atlas installed. The existing beta QR still
lands on the beta page. Each ad QR is scanned from about two metres on an
iPhone and an Android phone, on a real Crunch screen, before the ads go live.

**What this phase teaches:** DNS, domains and certificates, and how to cut
over with a way back.

### Phase 4: Convert the pages

- Build one shared layout: document head, SEO tags, nav and footer. The
  owner approved sharing the nav and footer where it is practical and better
  for the business. It is: one place to edit, consistent navigation, and
  every page links to the others, which helps SEO.
  - `index`, `vendors` and `support` use the shared nav and footer, based on
    the ones in `index.html`. Each page keeps its own call-to-action button
    ("Get Atlas", "Apply Now", "Contact Us").
  - The four legal pages gain the shared nav and footer around their text.
    The legal wording itself is not touched.
  - `beta`, `confirmed`, `404`, `/get` and `/story` stay without nav or
    footer. People arrive on them from a QR code, an email or the app to do
    one thing, and extra links pull them away from it.
  - Everything inside the page body keeps its current look.
- Convert one page per step, in this order: `index`, `support`, `vendors`,
  the four legal pages, `confirmed`, `beta`, `404`.
- Add SEO basics as pages convert: unique titles and descriptions, canonical
  URLs, Open Graph tags, `sitemap.xml`, `robots.txt`. `/get`, `/story`,
  `/confirmed` and the not-found page stay out of the index.
- Two content fixes ride along, since Android is live: replace the "Google
  Play coming soon" copy on `index` and `support`, and make the Play buttons
  real links.

**Check, per page:** the page body matches the original side by side at
phone and desktop width, the nav and footer are as listed above, and its URL
contract row still passes.

**What this phase teaches:** layouts and components, and what on-page SEO
consists of.

### Phase 5: Clean up

- Turn off GitHub Pages and remove `CNAME` and `.nojekyll`.
- Turn on page-view analytics for the static pages.
- Delete the `legacy-pages` branch once the site has been stable for two
  weeks.

**Check:** nothing is left in `public/` except files meant to be served
as-is (`.well-known`, images).

## Left to the builder

- Astro and adapter versions (current stable).
- How legacy `.html` and extensionless paths are both served.
- How `/templates/<id>` reaches the shared-workout view on Vercel.
- How the `.well-known` files get the right content type.
- File and component names, and the exact user-agent matching.
- Automated checks for the URL contract, if useful.

## Open items for the owner

These are filled in during Phase 0.

| Item | Value |
|------|-------|
| Vercel plan and team | paid plan, owner setting up |
| DNS provider for atlasfit.app | Namecheap, owner has access |
| Formspree story form endpoint | needed before Phase 3 cutover |
| App Store provider token (`pt`) | after launch; steps to be provided to the owner |
| Google Play URL confirmed | `https://play.google.com/store/apps/details?id=app.atlasfit.mobile` (confirmed; the `hl=en_US` part is left off so the store uses the phone's language) |
| Ad `src` names | from the designer; not blocking |
