import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const defaults = require("../node_modules/next-pwa/cache.js");
const { createPwaRuntimeCaching } = await import("../lib/pwa-cache-policy.ts");
const runtimeCaching = createPwaRuntimeCaching(defaults, "https://api.priconpri.com/api");

function matchingRules(url, origin = "https://app.priconpri.com") {
  const previousSelf = globalThis.self;
  globalThis.self = { location: { origin }, origin };
  try {
    return runtimeCaching.filter((rule) =>
      typeof rule.urlPattern === "function"
        ? rule.urlPattern({ url: new URL(url) })
        : rule.urlPattern.test(url),
    );
  } finally {
    globalThis.self = previousSelf;
  }
}

function matchingRule(url, origin = "https://app.priconpri.com") {
  return matchingRules(url, origin)[0];
}

test("same-origin admin auth and tenant API GETs select NetworkOnly first", () => {
  const authenticatedSession = new Request("https://app.priconpri.com/api/admin/auth/session", {
    credentials: "include",
  });
  assert.equal(authenticatedSession.credentials, "include");
  assert.equal(matchingRule(authenticatedSession.url).handler, "NetworkOnly");

  for (const path of [
    "/api/admin/auth/session",
    "/api/admin/restaurant/reservations",
    "/api/auth/session",
    "/api/demo/launch",
  ]) {
    const matches = matchingRules(`https://app.priconpri.com${path}`);
    assert.equal(matches[0].handler, "NetworkOnly", path);
    assert.deepEqual(matches.map(({ handler }) => handler), ["NetworkOnly"], path);
  }
  assert.equal(runtimeCaching.some((rule) => rule.options?.cacheName === "apis"), false);
  assert.equal(runtimeCaching.some((rule) => rule.options?.cacheName === "cross-origin"), false);
});

test("cross-origin PriConPri backend requests select NetworkOnly before generic rules", () => {
  for (const url of [
    "https://api.priconpri.com/api/admin/auth/session",
    "https://api.priconpri.com/api/admin/restaurant/reservations",
    "https://api.priconpri.com/api/company/id/42",
  ]) {
    const matches = matchingRules(url);
    assert.equal(matches[0].handler, "NetworkOnly", url);
    assert.deepEqual(matches.map(({ handler }) => handler), ["NetworkOnly"], url);
  }
});

test("public static resources retain next-pwa's configured caching", () => {
  const font = matchingRule("https://fonts.gstatic.com/s/inter.woff2");
  const image = matchingRule("https://app.priconpri.com/assets/logo.png");
  assert.equal(font.handler, "CacheFirst");
  assert.equal(image.handler, "StaleWhileRevalidate");
});

test("activation deletes the legacy APIs cache and only /api entries in mixed caches", async () => {
  const entries = new Map([
    ["apis", ["https://app.priconpri.com/api/admin/auth/session"]],
    ["cross-origin", ["https://api.priconpri.com/api/admin/data", "https://cdn.example.com/logo.svg"]],
    ["static-image-assets", ["https://app.priconpri.com/api/image.png", "https://app.priconpri.com/assets/logo.png"]],
  ]);
  const deletedCaches = [];
  const caches = {
    async keys() { return [...entries.keys()]; },
    async delete(name) { deletedCaches.push(name); return entries.delete(name); },
    async open(name) {
      return {
        async keys() { return (entries.get(name) ?? []).map((url) => ({ url })); },
        async delete(request) {
          entries.set(name, (entries.get(name) ?? []).filter((url) => url !== request.url));
        },
      };
    },
  };
  let activate;
  const self = { addEventListener(type, listener) { if (type === "activate") activate = listener; } };
  const source = await readFile(new URL("../public/pwa-api-cache-migration.js", import.meta.url), "utf8");
  runInNewContext(source, { self, caches, URL });

  let migration;
  activate({ waitUntil(promise) { migration = promise; } });
  await migration;

  assert.ok(!entries.has("apis"));
  assert.deepEqual(deletedCaches, ["apis"]);
  assert.deepEqual(entries.get("cross-origin"), ["https://cdn.example.com/logo.svg"]);
  assert.deepEqual(entries.get("static-image-assets"), ["https://app.priconpri.com/assets/logo.png"]);
});
