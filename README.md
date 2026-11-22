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

- Searches **Wikimedia Commons** first through its public MediaWiki API.
- If Commons does not find a strong title match, it checks **Wikidata** for an exact game-title entity, verifies that it is a video game (`P31: Q7889`), then uses its Commons image (`P18`) if the file has licence metadata.
- Normalizes ROM names by removing region, translation, hack/bootleg, revision, release-code and hash markers. It also tries the saved title and the embed URL slug.
- Uses a strict title score and checks numeric sequel titles. Images without a licence label or weak matches are rejected.
- Displays the Commons file/source link and licence label (with a separate licence link when supplied), and uses the stylized fallback if no safe match is found.
- **Retry cover** lets the user re-run the search. The small status text indicates searching, found, no match, or a request failure.
- Searches are client-side, key-free, CORS-enabled, and limited to two concurrent lookups. No ROM or game file is uploaded.

The RetroArch/libretro thumbnail repositories were considered but are not used: the saved RetroGames.cc URL does not reliably identify the console, and the artwork's reuse licence was not verified for this project. Coverage is limited and Commons metadata can be incomplete; users should still review the linked file page's attribution/licence requirements.

## Try it

Paste a game URL from RetroGames.cc, for example:

`https://www.retrogames.cc/embed/19846-super-bomberman-4-english-translated.html`

## Tests

Run the cover-search tests with Node.js:

```sh
node --test tests/cover-search.test.js
```

## Important

Games are loaded from RetroGames.cc. Whether a game runs depends on its embed support, browser restrictions and device compatibility. This project does not host ROMs or game files.

## Status

Prototype / Beta 0.1 — UI, embed-link loader and local collection.
