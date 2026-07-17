/**
 * Testy warstwy tłumaczenia — bez sieci i bez klucza: `fetch` jest podmieniony,
 * więc sprawdzamy to, co naprawdę nasze: mapowanie języków na kody DeepL, cache
 * (każdy znak liczy się do miesięcznego limitu) i obsługę wyczerpanego limitu.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  localizeMessage,
  translate,
  translateEnabled,
  translateMany,
} from "./translate.js";

const realFetch = globalThis.fetch;

interface Call {
  url: string;
  target: string;
  text: string;
}

/** Podstawia DeepL-a: zapisuje, o co pytaliśmy, i oddaje ustaloną odpowiedź. */
function stubDeepl(calls: Call[], status = 200, translated = "cześć") {
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { text: string[]; target_lang: string };
    calls.push({ url: String(url), target: body.target_lang, text: body.text[0] });
    return {
      ok: status === 200,
      status,
      json: async () => ({
        // Tyle tlumaczen, ile tekstow — DeepL oddaje je w tej samej kolejnosci.
        translations: body.text.map((t) => ({
          text: body.text.length > 1 ? `${translated} [${t}]` : translated,
          detected_source_language: "EN",
        })),
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

test("adres DeepL wynika z klucza: ':fx' → api-free, Pro → api", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);

  process.env.DEEPL_API_KEY = "abc-123:fx"; // plan free
  await translate("tekst na planie free", "pl");
  assert.match(calls[0].url, /^https:\/\/api-free\.deepl\.com\//);

  process.env.DEEPL_API_KEY = "abc-123"; // plan Pro
  await translate("tekst na planie pro", "pl");
  assert.match(calls[1].url, /^https:\/\/api\.deepl\.com\//);
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

// --- komunikaty błędów ---

test("po polsku komunikat idzie bez ruszania DeepL-a", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);
  const msg = "Masz już 4 ulubione w tej kategorii.";
  assert.equal(await localizeMessage(msg, "pl"), msg);
  assert.equal(calls.length, 0);
});

test("w innym języku komunikat jest tłumaczony", async () => {
  stubDeepl([], 200, "You already have 4 favourites in this category.");
  const out = await localizeMessage("Masz już 4 ulubione w tej kategorii.", "en");
  assert.equal(out, "You already have 4 favourites in this category.");
});

test("awaria tłumaczenia NIE gubi błędu — zostaje polski oryginał", async () => {
  const msg = "Nie ma takiego konta.";
  // Padnięta sieć.
  globalThis.fetch = (() => Promise.reject(new Error("ETIMEDOUT"))) as never;
  assert.equal(await localizeMessage(msg, "en"), msg);
  // Wyczerpany limit DeepL.
  stubDeepl([], 456);
  assert.equal(await localizeMessage(msg, "de"), msg);
  // Brak klucza.
  delete process.env.DEEPL_API_KEY;
  assert.equal(await localizeMessage(msg, "ja"), msg);
});

// --- tryb wsadowy (auto-tłumaczenie całego widoku) ---

test("wiele tekstów = JEDNO zapytanie do DeepL, kolejność zachowana", async () => {
  const bodies: string[] = [];
  globalThis.fetch = (async (_u: string, init: { body: string }) => {
    bodies.push(init.body);
    const t = JSON.parse(init.body).text as string[];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        translations: t.map((x) => ({
          text: `PL(${x})`,
          detected_source_language: "EN",
        })),
      }),
    };
  }) as never;

  const out = await translateMany(["one", "two", "three"], "pl");
  assert.equal(bodies.length, 1, "ma być jedno zapytanie, nie trzy");
  assert.deepEqual(
    out.map((o) => o.text),
    ["PL(one)", "PL(two)", "PL(three)"],
  );
});

test("powtórki we wsadzie idą do DeepL raz — znaki kosztują", async () => {
  const bodies: string[] = [];
  globalThis.fetch = (async (_u: string, init: { body: string }) => {
    bodies.push(init.body);
    const t = JSON.parse(init.body).text as string[];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        translations: t.map((x) => ({
          text: `PL(${x})`,
          detected_source_language: "EN",
        })),
      }),
    };
  }) as never;

  const out = await translateMany(["ok", "hey", "ok", "ok"], "pl");
  assert.deepEqual(JSON.parse(bodies[0]).text, ["ok", "hey"], "bez powtórek");
  // …ale każdy tekst dostaje swoje tłumaczenie z powrotem.
  assert.deepEqual(
    out.map((o) => o.text),
    ["PL(ok)", "PL(hey)", "PL(ok)", "PL(ok)"],
  );
});

test("wsad korzysta z cache — drugi raz nie pyta o nic", async () => {
  const bodies: string[] = [];
  globalThis.fetch = (async (_u: string, init: { body: string }) => {
    bodies.push(init.body);
    const t = JSON.parse(init.body).text as string[];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        translations: t.map((x) => ({
          text: `PL(${x})`,
          detected_source_language: "EN",
        })),
      }),
    };
  }) as never;

  await translateMany(["wsad cache jeden", "wsad cache dwa"], "pl");
  await translateMany(["wsad cache jeden", "wsad cache dwa"], "pl");
  assert.equal(bodies.length, 1);
});

test("za duży wsad odrzucamy bez pytania DeepL-a", async () => {
  const calls: Call[] = [];
  stubDeepl(calls);
  const many = Array.from({ length: 51 }, (_, i) => `tekst numer ${i}`);
  await assert.rejects(() => translateMany(many, "pl"), /maksymalnie 50/i);
  assert.equal(calls.length, 0);
});
