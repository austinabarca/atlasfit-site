# Vendor Sign-Up Page — Design Spec

**Date:** 2026-07-06
**Author:** Atlas team (via Claude)
**Status:** Approved

## Purpose

Give vendors met at an in-person event a clean, on-brand page to apply to sell
through the Atlas marketplace. Must support two paths: submit a native form on
the site, OR jump to an external Google Form.

## Context

- Static site on GitHub Pages (`.nojekyll`, `CNAME`).
- Existing design system lives inline in `index.html`: dark `#0A0A0A` theme,
  red→gold gradients, Inter font, rounded cards (`.feature-card`,
  `.social-card`), pill CTAs.
- Native form submission already proven in `beta.html` via Formspree
  (async POST, inline success state, no reload).

## Inspiration

Modeled on established "sell with us" onboarding pages: Faire ("Sell on Faire"),
Etsy ("Sell on Etsy"), Shopify, Whatnot seller onboarding. Shared pattern:
value-prop hero → benefits → simple "how it works" steps → short application form.

## Page: `vendors.html`

Standalone page matching the `index.html` design system. Structure:

1. **Nav** — brand + link back to home / to form.
2. **Hero** — badge ("Now onboarding vendors"), headline **"Become an Atlas
   Vendor"**, subtext, two CTAs: **Apply Now** (scrolls to form) and **Open
   Google Form** (opens placeholder link in new tab).
3. **Why sell with Atlas** — benefit cards (Reach engaged lifters, No upfront
   cost, Built-in marketing, Simple payouts). Reuses `.feature-card` styling.
4. **How it works** — 3 numbered steps: Apply → Get approved → Start selling.
   Reuses `.social-card` numbered style.
5. **Sign-up form** (`#apply`) — native Formspree form, same JS pattern as
   `beta.html`. Fields:
   - Business / brand name
   - Contact name
   - Email (required)
   - Phone
   - Product category (dropdown: Apparel, Supplements, Equipment, Accessories,
     Nutrition/Food, Other)
   - Website / social handle
   - Short "about your products" text box

   Below form: "Prefer a Google Form?" alternate button.
6. **Footer** — same as `index.html`.

## Placeholders to swap post-launch (marked with `<!-- TODO -->`)

- Formspree endpoint: `https://formspree.io/f/YOUR_VENDOR_FORM_ID`
- Google Form URL: `YOUR_GOOGLE_FORM_LINK`

## Other changes

- Add a **Vendors** link to the nav in `index.html` (only the nav is touched;
  existing uncommitted index.html changes left alone).

## Out of scope

- Real Formspree/Google Form provisioning (owner will paste real values).
- Vendor auth, dashboards, or actual marketplace listing flow.
