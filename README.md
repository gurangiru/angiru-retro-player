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

- Library cards search for artwork only when they are near the visible part of the page, limiting unnecessary requests.
- **Wikimedia Commons** is preferred for strong title matches. Its API can return the image file page, creator/credit and licence metadata when available.
- **English Wikipedia** article thumbnails are a fallback for games with no strong Commons result.
- The search uses the game title and the slug from its RetroGames.cc embed URL. A confidence threshold is used to avoid unrelated images.
- Artwork is referenced remotely (not downloaded into this repository) and the source link is shown on the card. If a match is missing, the image fails, or the request is unavailable, the existing generated retro cover remains. The “Retry cover” action allows another search.
- Game title searches are sent to Wikimedia. No ROM or game file is uploaded.

**Copyright note:** Wikimedia Commons entries can have different attribution/licence conditions; the card links to the file page and shows the licence metadata when available. Wikipedia thumbnails may have restrictions, so check the linked page before reusing an image outside this identification UI.

Libretro’s public thumbnail collection was also evaluated. It has platform-specific box art, but the RetroGames.cc embed URL stored by the player does not reliably identify the console, so it is not used yet to avoid showing covers from the wrong system.

## Tests

Run the cover-search tests with Node.js:

```sh
node --test tests/cover-search.test.js
```

## Status
Prototype / Beta 0.1 — UI and embed-link loader.
