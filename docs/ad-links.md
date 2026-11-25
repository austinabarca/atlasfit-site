# Ad links and QR codes

How to make a trackable link or QR code for any Atlas ad, flyer, or post.

## The two links

| Use it for | Link |
|------------|------|
| Getting people to download Atlas | `https://atlasfit.app/get?src=<name>` |
| Collecting "What do you train for?" stories | `https://atlasfit.app/story?src=<name>` |

`/get` sends iPhones to the App Store and Android phones and tablets to Google Play. Laptops and iPads see a page with both store buttons.

Keep the link itself in lowercase exactly as written here. `/GET` or `/Story` will not work.

## The `src` name

`src` is a label you choose. It says where the scan came from. Every different name is counted separately, so one name per ad tells you which ad performs best.

Rules:

- Lowercase letters, digits and hyphens only. No spaces.
- 40 characters at most.
- Anything that breaks the rules still works for the person scanning, but is counted under `unknown`.

Pick names you will recognise in a report six months from now. A pattern that works: `<place>-<ad>`, with a location added when the same ad runs in several places.

| Ad | Link |
|----|------|
| Crunch, bear design | `https://atlasfit.app/get?src=crunch-bear` |
| Crunch, community design | `https://atlasfit.app/get?src=crunch-community` |
| Same design, two gyms | `https://atlasfit.app/get?src=crunch-bear-downtown` and `...crunch-bear-northside` |
| Crunch, story ad | `https://atlasfit.app/story?src=crunch-story` |
| Instagram bio | `https://atlasfit.app/get?src=instagram-bio` |

Nothing needs to be set up before using a new name. Make up the name, put it in the link, and it starts being counted on the first scan.

Once a name is printed or on a screen, do not rename it. A renamed ad shows up as a new ad, and its history stays under the old name.

## Making the QR code

1. Write out the full link, including `https://` and the `src` name.
2. Paste it into any QR generator. Choose a plain, static QR code. Do not use a generator's "dynamic" or "trackable" option: those route scans through the generator's own service, which can expire or start charging. The tracking is already built into the link.
3. Export it dark on a light background, with a clear margin around it. A light-on-dark code is hard for some phones to read.
4. Scan it with an iPhone and an Android phone before it goes anywhere. For a screen or poster, test from the distance people will stand at.

## Seeing the results

**Scans per ad:** Vercel → the `atlasfit-site` project → Analytics → Events.

- `scan` is every `/get` visit. Open it and switch to the `src` tab for the count per ad. The `platform` tab splits iPhone, Android and other.
- `story_scan` is every `/story` visit, with the same two tabs.

**Stories per ad:** each story in Formspree ("Atlas Stories") includes the `src` it came from.

**Installs per ad:**

- iPhone: App Store Connect → Analytics → Campaigns. The campaign name is the `src`. Apple hides a campaign until it has a minimum number of installs, so an empty report in the first days is expected.
- Android: Play Console → Grow → Store performance → Store analysis → the traffic source / UTM breakdown. The campaign name is the `src`. The source always reads `atlasfit` and the medium `ad-link`, whichever ad it was.

## Keeping the counts working

- Scan counting depends on Vercel's Deployment Protection ("Vercel Authentication") staying off for the project. If it is turned back on, links keep working but scans stop being counted, with no error shown.
- Scan counts are slightly generous: an app that loads a preview of the link counts as a scan.
- Check the Formspree plan's monthly submission limit before a campaign. Stories sent after the limit is reached are not delivered.

Scans show how many people an ad got to act. Installs show how many of them followed through. An ad with many scans and few installs is getting attention but losing people at the store.

## If something changes

The QR codes never need reprinting. Store addresses, the Apple campaign token and the story form address all live in one file, `src/config/links.ts`. Change it there and every existing code follows.
