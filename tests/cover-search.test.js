const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const begin = "/* COVER_SEARCH_TESTS_BEGIN */";
const end = "/* COVER_SEARCH_TESTS_END */";
const startIndex = appSource.indexOf(begin);
const endIndex = appSource.indexOf(end, startIndex);
assert.notEqual(startIndex, -1, "cover-search test marker exists");
assert.notEqual(endIndex, -1, "cover-search end marker exists");
const helpers = appSource.slice(startIndex + begin.length, endIndex);

function createCoverApi(fetchMock) {
  const context = {
    fetch: fetchMock,
    AbortController,
    setTimeout,
    clearTimeout,
    library: [],
    libraryPersist() {},
    renderLibrary() {},
  };
  vm.createContext(context);
  vm.runInContext(
    helpers + "\nthis.coverApi = { normalizeGameTitle, normalizeCoverCandidateTitle, titleSimilarity, coverSearchQueries, searchCommonsCover, searchWikidataCover, findRealCover };",
    context
  );
  return context.coverApi;
}

function response(data, ok = true) {
  return { ok, json: async () => data };
}

function game(name = "Super Bomberman 4 English Translated") {
  return {
    name,
    url: "https://www.retrogames.cc/embed/19846-super-bomberman-4-english-translated.html",
  };
}

function commonsResult(title = "File:Super Bomberman 4 box art.png") {
  return {
    query: {
      pages: {
        "1": {
          title,
          imageinfo: [{
            thumburl: "https://upload.wikimedia.org/example/cover.png",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Cover",
            mime: "image/png",
            extmetadata: {
              Artist: { value: "<a href='#'>Artist</a>" },
              LicenseShortName: { value: "CC BY-SA 4.0" },
              LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
            },
          }],
        },
      },
    },
  };
}

test("normalization removes region/version tags and preserves sequel numbers", () => {
  const api = createCoverApi(async () => response({}));
  assert.equal(api.normalizeGameTitle("1942 (USA)"), "1942");
  assert.equal(api.normalizeGameTitle("Super Bomberman 4 English Translated"), "super bomberman 4");
  assert.equal(api.titleSimilarity("Super Bomberman 4", "Super Bomberman 5 box art.png"), 0);
});

test("title query variants are generated from the RetroGames name", () => {
  const api = createCoverApi(async () => response({}));
  assert.deepEqual(Array.from(api.coverSearchQueries(game())), [
    "super bomberman 4",
    "super bomberman 4 box art",
    "super bomberman 4 cover",
  ]);
});

test("Commons only returns licensed image results and parses attribution", async () => {
  const api = createCoverApi(async () => response(commonsResult()));
  const found = await api.searchCommonsCover("super bomberman 4 box art");
  assert.equal(found.length, 1);
  assert.equal(found[0].image, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(found[0].page, "https://commons.wikimedia.org/wiki/File:Cover");
  assert.equal(found[0].license, "CC BY-SA 4.0");
  assert.equal(found[0].artist, "Artist");
  assert.equal(found[0].licenseUrl, "https://creativecommons.org/licenses/by-sa/4.0/");
});

test("high-confidence Commons match is saved and cached", async () => {
  let requests = 0;
  const api = createCoverApi(async () => {
    requests++;
    return response(commonsResult());
  });
  const item = game();
  const url = await api.findRealCover(item);
  assert.equal(url, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(item.coverChecked, true);
  assert.equal(item.coverSearching, false);
  assert.equal(item.coverSource, "Wikimedia Commons");
  assert.equal(item.coverLicense, "CC BY-SA 4.0");
  assert.equal(item.coverArtist, "Artist");
  assert.equal(await api.findRealCover(item), url);
  assert.equal(requests, 1);
});

test("Wikidata fallback only accepts a video game with a licensed Commons image", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("generator=search")) return response({ query: { pages: {} } });
    if (url.includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Super Bomberman 4" }] });
    if (url.includes("wbgetentities")) return response({ entities: {
      Q123: { claims: {
        P31: [{ mainsnak: { datavalue: { value: { id: "Q7889" } } } }],
        P18: [{ mainsnak: { datavalue: { value: "Super Bomberman 4 (Japan).png" } } }],
      } },
    } });
    return response({ query: { pages: { "9": {
      title: "File:Super Bomberman 4 (Japan).png",
      imageinfo: [{
        thumburl: "https://upload.wikimedia.org/example/wikidata.png",
        descriptionurl: "https://commons.wikimedia.org/wiki/File:Super_Bomberman_4",
        mime: "image/png",
        extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" } },
      }],
    } } } });
  });
  const item = game();
  const url = await api.findRealCover(item);
  assert.equal(url, "https://upload.wikimedia.org/example/wikidata.png");
  assert.equal(item.coverSource, "Wikidata · Wikimedia Commons");
  assert.equal(item.coverLicense, "CC BY-SA 4.0");
});

test("no match keeps the fallback state and marks the lookup complete", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("wbsearchentities")) return response({ search: [] });
    return response({ query: { pages: {} } });
  });
  const item = game("Rare Game");
  assert.equal(await api.findRealCover(item), null);
  assert.equal(item.coverChecked, true);
  assert.equal(item.coverSearching, false);
  assert.equal(item.coverUrl, undefined);
});

test("unrelated candidates are rejected and network failures do not break the library", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("generator=search")) return response(commonsResult("File:Other unrelated title cover.png"));
    if (url.includes("wbsearchentities")) return response({ search: [] });
    return response({ query: { pages: {} } });
  });
  const item = game("Rare Game");
  assert.equal(await api.findRealCover(item), null);
  assert.equal(item.coverChecked, true);

  const broken = createCoverApi(async () => { throw new Error("network unavailable"); });
  const retryItem = game("Network Test");
  assert.equal(await broken.findRealCover(retryItem), null);
  assert.equal(retryItem.coverChecked, true);
  assert.equal(retryItem.coverSearching, false);
});
