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
  const context = { fetch: fetchMock, library: [], libraryPersist() {}, renderLibrary() {} };
  vm.createContext(context);
  vm.runInContext(
    helpers + "\nthis.coverApi = { normalizeGameTitle, titleSimilarity, coverSearchQueries, searchCommonsCover, searchWikidataCover, findRealCover };",
    context
  );
  return context.coverApi;
}

function response(data) { return { ok: true, json: async () => data }; }
function game(name = "Super Bomberman 4 English Translated") {
  return { name, url: "https://www.retrogames.cc/embed/19846-super-bomberman-4-english-translated.html" };
}
function commonsResult(title = "File:Super Bomberman 4 box art.png", license = "CC BY-SA 4.0") {
  return { query: { pages: { "1": { title, imageinfo: [{
    thumburl: "https://upload.wikimedia.org/example/cover.png",
    descriptionurl: "https://commons.wikimedia.org/wiki/File:Cover",
    mime: "image/png",
    extmetadata: {
      Artist: { value: "<a href='#'>Artist</a>" },
      LicenseShortName: { value: license },
      LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
    },
  }] } } } };
}
function emptyCommons() { return response({ query: { pages: {} } }); }

test("normalization removes ROM labels and preserves numeric titles/sequels", () => {
  const api = createCoverApi(async () => response({}));
  assert.equal(api.normalizeGameTitle("1942 (USA)"), "1942");
  assert.equal(api.normalizeGameTitle("Super Bomberman 4 English Translated (Europe) [T+Eng]"), "super bomberman 4");
  assert.equal(api.normalizeGameTitle("Super Mario World"), "super mario world");
  assert.equal(api.titleSimilarity("Super Bomberman 4", "Super Bomberman 3 box art.png"), 0);
  assert.equal(api.titleSimilarity("Super Bomberman 4", "Super Bomberman 4 box art.png"), 1);
});

test("the embed slug supplies an alternate query when the saved name differs", () => {
  const api = createCoverApi(async () => response({}));
  assert.deepEqual(Array.from(api.coverSearchQueries({ name: "Friendly Title", url: game().url })),
    ["friendly title", "super bomberman 4", "friendly title box art", "friendly title cover"]);
});

test("Commons results include image, source page and licence/artist metadata", async () => {
  const api = createCoverApi(async () => response(commonsResult()));
  const found = await api.searchCommonsCover("super bomberman 4");
  assert.equal(found.length, 1);
  assert.equal(found[0].image, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(found[0].page, "https://commons.wikimedia.org/wiki/File:Cover");
  assert.equal(found[0].license, "CC BY-SA 4.0");
  assert.equal(found[0].artist, "Artist");
});

test("strong licensed Commons match is stored and cached", async () => {
  let requests = 0;
  const api = createCoverApi(async () => { requests++; return response(commonsResult()); });
  const item = game();
  const url = await api.findRealCover(item);
  assert.equal(url, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(item.coverChecked, true);
  assert.equal(item.coverSearching, false);
  assert.equal(item.coverSearchFailed, false);
  assert.equal(item.coverSource, "Wikimedia Commons");
  assert.equal(item.coverLicense, "CC BY-SA 4.0");
  assert.equal(item.coverArtist, "Artist");
  assert.equal(await api.findRealCover(item), url);
  assert.equal(requests, 1);
});

test("wrong sequel is rejected and manual retry can accept exact licensed art", async () => {
  let title = "File:Super Bomberman 3 box art.png";
  const api = createCoverApi(async url => {
    if (url.includes("commons.wikimedia.org")) return response(commonsResult(title));
    if (url.includes("wbsearchentities")) return response({ search: [] });
    throw new Error("Unexpected API");
  });
  const item = game();
  assert.equal(await api.findRealCover(item), null);
  assert.equal(item.coverChecked, true);
  title = "File:Super Bomberman 4 box art.png";
  const found = await api.findRealCover(item, true);
  assert.equal(found, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(item.coverLicense, "CC BY-SA 4.0");
});

test("Wikidata fallback requires a game item and a licensed Commons image", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Super Bomberman 4" }] });
    if (url.includes("wbgetentities")) return response({ entities: { Q123: { claims: {
      P31: [{ mainsnak: { datavalue: { value: { id: "Q7889" } } } }],
      P18: [{ mainsnak: { datavalue: { value: "Super Bomberman 4 cover.png" } } }],
    } } } });
    if (url.includes("titles=")) return response(commonsResult("File:Wikidata image.png", "CC0"));
    if (url.includes("commons.wikimedia.org")) return emptyCommons();
    throw new Error("Unexpected API");
  });
  const item = game("Super Bomberman 4");
  const found = await api.findRealCover(item);
  assert.equal(found, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(item.coverSource, "Wikidata · Wikimedia Commons");
  assert.equal(item.coverLicense, "CC0");
});

test("Commons images without licence metadata are rejected", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("commons.wikimedia.org")) return response(commonsResult("File:Super Bomberman 4 box art.png", ""));
    if (url.includes("wbsearchentities")) return response({ search: [] });
    throw new Error("Unexpected API");
  });
  const item = game();
  assert.equal(await api.findRealCover(item), null);
  assert.equal(item.coverChecked, true);
  assert.equal(item.coverSearchFailed, false);
});

test("no match uses fallback; network failures signal retry", async () => {
  const noMatch = createCoverApi(async () => emptyCommons());
  const item = game("Rare Game");
  assert.equal(await noMatch.findRealCover(item), null);
  assert.equal(item.coverChecked, true);
  assert.equal(item.coverSearching, false);
  assert.equal(item.coverSearchFailed, false);

  const failed = createCoverApi(async () => { throw new Error("offline"); });
  const retryItem = game("Network Test");
  assert.equal(await failed.findRealCover(retryItem), null);
  assert.equal(retryItem.coverSearchFailed, true);
  assert.equal(retryItem.coverChecked, true);
});
