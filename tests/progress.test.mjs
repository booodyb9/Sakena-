import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJourney, normalizeProgress } from '../src/quranProgress.ts';

test('missing or corrupt storage starts a clean journey', () => {
  for (const value of [null, '{broken', 'null', '{}', '{"surahs":null}']) {
    assert.deepEqual(parseJourney(value), { lastSurah: null, surahs: {} });
  }
});

test('position and memorization remain separate through a storage round trip', () => {
  const journey = { lastSurah: 1, surahs: { 1: { current: 3, memorized: [1] } } };
  assert.deepEqual(parseJourney(JSON.stringify(journey)), journey);
});

test('each surah retains its own progress', () => {
  const journey = { lastSurah: 112, surahs: {
    1: { current: 3, memorized: [1, 2] },
    112: { current: 2, memorized: [] },
  } };
  assert.deepEqual(parseJourney(JSON.stringify(journey)), journey);
});

test('invalid data cannot create nonexistent surahs or duplicate completed verses', () => {
  const result = parseJourney(JSON.stringify({ lastSurah: 999, surahs: {
    1: { current: 2, memorized: [1, 1, -1, 0, 300, '2', 2.2] },
    2: { current: -1, memorized: [] },
    115: { current: 1, memorized: [] },
  } }));
  assert.deepEqual(result, { lastSurah: null, surahs: { 1: { current: 2, memorized: [1] } } });
});

test('loaded surah bounds constrain the current verse and completion count', () => {
  assert.deepEqual(normalizeProgress({ current: 286, memorized: [7, 1, 7, 8] }, 7),
    { current: 7, memorized: [1, 7] });
});
