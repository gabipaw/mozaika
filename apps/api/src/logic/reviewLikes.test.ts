/**
 * Testy reguł polubień recenzji (czysta logika, bez bazy).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ValidationError } from "../errors.js";
import { checkCanLike } from "./reviewLikes.js";

test("checkCanLike: cudzą recenzję można polubić", () => {
  assert.doesNotThrow(() => checkCanLike(1, 2));
});

test("checkCanLike: własnej recenzji polubić się nie da", () => {
  assert.throws(() => checkCanLike(7, 7), ValidationError);
});
