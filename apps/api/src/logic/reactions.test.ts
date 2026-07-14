/**
 * Testy reguł reakcji na recenzje (czysta logika, bez bazy).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ValidationError } from "../errors.js";
import {
  DISLIKE,
  LIKE,
  NONE,
  checkCanReact,
  nextReaction,
  parseReactionValue,
  reactionScore,
} from "./reactions.js";

test("checkCanReact: na cudzą recenzję można zareagować", () => {
  assert.doesNotThrow(() => checkCanReact(1, 2));
});

test("checkCanReact: na własną recenzję nie da się zareagować", () => {
  assert.throws(() => checkCanReact(7, 7), ValidationError);
});

test("parseReactionValue: przechodzą tylko 1, -1 i 0", () => {
  assert.equal(parseReactionValue(LIKE), LIKE);
  assert.equal(parseReactionValue(DISLIKE), DISLIKE);
  assert.equal(parseReactionValue(NONE), NONE);
  for (const zle of [2, -5, "1", null, undefined, 0.5]) {
    assert.throws(() => parseReactionValue(zle), ValidationError);
  }
});

test("nextReaction: klik w tę samą reakcję ją zdejmuje", () => {
  assert.equal(nextReaction(LIKE, LIKE), NONE);
  assert.equal(nextReaction(DISLIKE, DISLIKE), NONE);
});

test("nextReaction: klik w drugą reakcję przestawia (serce ↔ kciuk)", () => {
  assert.equal(nextReaction(LIKE, DISLIKE), DISLIKE);
  assert.equal(nextReaction(DISLIKE, LIKE), LIKE);
  assert.equal(nextReaction(NONE, LIKE), LIKE);
});

test("reactionScore: serca minus kciuki", () => {
  assert.equal(reactionScore({ likes: 5, dislikes: 2, myReaction: NONE }), 3);
  assert.equal(reactionScore({ likes: 0, dislikes: 3, myReaction: DISLIKE }), -3);
});
