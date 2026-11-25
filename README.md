# Angiru Retro Player

A retro gaming player for the Angiru community. A responsive web interface accepts a RetroGames.cc game page or embed URL and loads it in an embedded frame.

## Features

- Responsive desktop and mobile layout
- Portuguese, English and Spanish interface
- Accepts RetroGames.cc game URLs and `/embed/` URLs
- Fullscreen control
- Local game collection with favorites, search, filters, play and remove
- Retro theme palette options
- No game files hosted by this project

## Real game artwork

- Artwork lookup starts when a library card is near the viewport (and searches immediately in browsers without `IntersectionObserver`). The lookup queue limits the app to two concurrent searches.
- When the console can be identified confidently, **Libretro Thumbnails** is tried first using the console's `Named_Boxarts` archive. The known Super Bomberman 1–5 titles are mapped to SNES; the translated Super Bomberman 4 embed slug is normalized to its base game title.
- Candidate filenames are tried one by one and only treated as loaded after the browser successfully loads the image. If all candidates fail, the lookup continues to Wikimedia Commons and then Wikidata.
- **Wikimedia Commons** only contributes image results with licence metadata. **Wikidata** is a fallback metadata source: the match must be a high-confidence title, identify as a video game, and have a Commons image with licence metadata.
- The game name is normalized to remove common region, translation, revision and ROM tags. Sequel numbers are compared strictly to reduce mismatches. The embed slug is also used to form search terms.
- Cards link to the image/file page or archive; Commons creator/licence metadata is shown when available. Artwork URLs and attribution are saved in the local library. Images are loaded remotely and are not downloaded into this repository.
- Legacy entries that were previously marked "not found" without a timestamp are eligible for a fresh search. Failed searches are retried after 24 hours; empty results are retried after 7 days. A broken Libretro image advances to the next filename and then falls back to Commons/Wikidata. The stylized card remains the final fallback; **Retry cover** forces a new search.
- Search queries send game titles to the relevant image metadata services. No ROM or game file is uploaded.

**Copyright note:** Commons images have individual attribution/licence conditions; consult each linked file page. Libretro Thumbnails is a community-maintained thumbnail archive, not a blanket copyright licence for every game image. The player displays remote images and links to the archive; rights remain with the respective holders.

## Tests

Run the cover-search tests with Node.js:

```sh
node --test tests/cover-search.test.js
```

## Status
Prototype / Beta 0.1 — UI and embed-link loader.
