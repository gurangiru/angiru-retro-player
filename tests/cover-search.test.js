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
    helpers + "\nthis.coverApi = { normalizeGameTitle, titleSimilarity, coverSearchQueries, searchCommonsCover, searchWikiCover, findRealCover };",
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

test("normalization removes region/version labels but keeps game numbers like 1942", () => {
  const api = createCoverApi(async () => response({}));
  assert.equal(api.normalizeGameTitle("1942 (USA)"), "1942");
  assert.equal(api.normalizeGameTitle("Super Bomberman 4 English Translated"), "super bomberman 4");
});

test("the embed slug supplies a title query when the saved display name differs", () => {
  const api = createCoverApi(async () => response({}));
  assert.deepEqual(
    Array.from(api.coverSearchQueries({ name: "Friendly Title", url: game().url })),
    ["friendly title", "super bomberman 4"]
  );
});

test("Commons results include image, source page, licence and artist metadata", async () => {
  const api = createCoverApi(async () => response(commonsResult()));
  const found = await api.searchCommonsCover("super bomberman 4");
  assert.equal(found.length, 1);
  assert.equal(found[0].image, "https://upload.wikimedia.org/example/cover.png");
  assert.equal(found[0].page, "https://commons.wikimedia.org/wiki/File:Cover");
  assert.equal(found[0].license, "CC BY-SA 4.0");
  assert.equal(found[0].credit, "Artist");
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
  assert.equal(item.coverCredit, "Artist");
  assert.equal(await api.findRealCover(item), url);
  assert.equal(requests, 1);
});

test("Wikipedia article thumbnail is used only as a matching fallback", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("commons.wikimedia.org")) return response({ query: { pages: {} } });
    return response({ query: { pages: {
      "7": { title: "Super Bomberman 4", fullurl: "https://en.wikipedia.org/wiki/Super_Bomberman_4", thumbnail: { source: "https://upload.wikimedia.org/example/wiki.png" } },
    } } });
  });
  const item = game();
  const url = await api.findRealCover(item);
  assert.equal(url, "https://upload.wikimedia.org/example/wiki.png");
  assert.equal(item.coverSource, "Wikipedia");
  assert.equal(item.coverPage, "https://en.wikipedia.org/wiki/Super_Bomberman_4");
});

test("no match falls back cleanly and records a completed search", async () => {
  const api = createCoverApi(async () => response({ query: { pages: {} } }));
  const item = game("Rare Game");
  assert.equal(await api.findRealCover(item), null);
  assert.equal(item.coverChecked, true);
  assert.equal(item.coverSearching, false);
  assert.equal(item.coverSearchFailed, false);
  assert.equal(item.coverUrl, undefined);
});

test("unrelated results are rejected; request failures are retryable", async () => {
  const api = createCoverApi(async url => {
    if (url.includes("commons.wikimedia.org")) return response(commonsResult("File:Other title unrelated cover.png"));
    return response({ query: { pages: { "1": { title: "An unrelated article", fullurl: "https://en.wikipedia.org/wiki/Other", thumbnail: { source: "https://upload.wikimedia.org/example/other.png" } } } } });
  });
  const item = game("Rare Game");
  assert.equal(await api.findRealCover(item), null);
  assert.equal(item.coverChecked, true);

  const broken = createCoverApi(async () => { throw new Error("network unavailable"); });
  const retryItem = game("Network Test");
  assert.equal(await broken.findRealCover(retryItem), null);
  assert.equal(retryItem.coverSearchFailed, true);
  assert.equal(retryItem.coverChecked, true);
});
