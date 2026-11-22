# Angiru Retro Player

A retro gaming player for the Angiru community. The first prototype is a responsive web interface that accepts a RetroGames.cc game page or embed URL and loads it in an embedded frame.

## Prototype features
- Responsive desktop and mobile layout
- Portuguese, English and Spanish interface
- Accepts RetroGames.cc regular game URLs and `/embed/` URLs
- Fullscreen control
- No external game files hosted by this project

## Try it
Paste a game URL from RetroGames.cc, for example:
`https://www.retrogames.cc/embed/19846-super-bomberman-4-english-translated.html`

## Important
This is an early prototype. Games are loaded from RetroGames.cc, and whether a game can run depends on their embed support, browser restrictions and device compatibility. This project does not host ROMs or game files.

## Real game artwork

- Artwork lookup starts when a library card is near the viewport (and searches immediately in browsers without `IntersectionObserver`). The lookup queue limits the app to two concurrent searches.
- **Wikimedia Commons** is searched first. Only image results with licence metadata are eligible.
- **Wikidata** is a fallback metadata source: the match must be a high-confidence title, identify as a video game, and have a Commons image with licence metadata.
- The game name is normalized to remove common region, translation, revision and ROM tags. Sequel numbers are compared strictly to reduce mismatches. The embed slug is also used to form search terms.
- Cards link to the image/file page and licence; creator/artist metadata is included when available.
- Artwork URLs and attribution are saved in the local library. Images are not downloaded into this repository. If no confident/licensed match exists, the request fails, or an image breaks, the stylized fallback remains; **Retry cover** searches again.
- Search queries send game titles to Wikimedia/Wikidata. No ROM or game file is uploaded.

**Copyright note:** Commons images have individual attribution/licence conditions. Check the linked file page before reusing artwork elsewhere. The player intentionally avoids unlicensed or uncertain matches.

Libretro's public box-art thumbnails were also evaluated. The saved RetroGames.cc embed link does not reliably identify the console/platform, so that source is not used yet to avoid incorrect covers.

## Tests

Run the cover-search tests with Node.js:

```sh
node --test tests/cover-search.test.js
```

## Status
Prototype / Beta 0.1 — UI and embed-link loader.
