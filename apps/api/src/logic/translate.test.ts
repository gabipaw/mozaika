/**
 * Testy warstwy tłumaczenia — bez sieci i bez klucza: `fetch` jest podmieniony,
 * więc sprawdzamy to, co naprawdę nasze: mapowanie języków na kody DeepL, cache
 * (każdy znak liczy się do miesięcznego limitu) i obsługę wyczerpanego limitu.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { translate, translateEnabled } from "./translate.js";

const realFetch = globalThis.fetch;

interface Call {
  target: string;
  text: string;
}

/** Podstawia DeepL-a: zapisuje, o co pytaliśmy, i oddaje ustaloną odpowiedź. */
function stubDeepl(calls: Call[], status = 200, translated = "cześć") {
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { text: string[]; target_lang: string };
    calls.push({ target: body.target_lang, text: body.text[0] });
    return {
      ok: status === 200,
      status,
      json: async () => ({
        translations: [{ text: translated, detected_source_language: "EN" }],
      }),
    };
  }) as unknown as typeof globalThis.fetch;
}

beforeEach(() => {
  process.env.DEEPL_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.DEEPL_API_KEY;
});

test("bez klucza tłumaczenie jest wyłączone (front nie pokaże przycisku)", () => {
  delete process.env.DEEPL_API_KEY;
  assert.equal(translateEnabled(), false);
  process.env.DEEPL_API_KEY = "x";
  assert.equal(translateEnabled(), true);
});

test("nasze kody języków idą do DeepL jako JEGO kody (pt → PT-BR, en → EN-US)", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);
  await translate("hello world pt", "pt");
  await translate("hello world en", "en");
  await translate("hello world ja", "ja");
  assert.deepEqual(
    calls.map((c) => c.target),
    ["PT-BR", "EN-US", "JA"],
  );
});

test("zwraca tłumaczenie i wykryty język źródłowy małymi literami", async () => {
  stubDeepl([], 200, "witaj świecie");
  const r = await translate("hello world detected", "pl");
  assert.equal(r.text, "witaj świecie");
  assert.equal(r.from, "en"); // DeepL oddaje "EN"
});

test("ten sam tekst nie pyta DeepL-a dwa razy — cache oszczędza limit", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);
  await translate("dokladnie ten sam tekst", "pl");
  await translate("dokladnie ten sam tekst", "pl");
  assert.equal(calls.length, 1);
});

test("cache jest per język — ten sam tekst na dwa języki to dwa zapytania", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);
  await translate("tekst na dwa jezyki", "pl");
  await translate("tekst na dwa jezyki", "de");
  assert.equal(calls.length, 2);
});

test("wyczerpany limit DeepL (456) to czytelny komunikat, nie goły błąd", async () => {
  stubDeepl([], 456);
  await assert.rejects(() => translate("limit wyczerpany test", "pl"), /limit/i);
});

test("pusty tekst i przydługi tekst odrzucamy bez pytania DeepL-a", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);
  await assert.rejects(() => translate("   ", "pl"));
  await assert.rejects(() => translate("x".repeat(2001), "pl"), /za długi/i);
  assert.equal(calls.length, 0);
});
