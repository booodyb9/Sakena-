import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { isSahihGrade } from '../scripts/hadith-policy.mjs';
import { alignTafsir } from '../src/tafsirPairs.ts';
const read = path => JSON.parse(gunzipSync(fs.readFileSync(path)).toString('utf8'));

test('partial, weak, mixed and mawquf grades cannot be promoted to wholly sahih', () => {
  for (const grade of ['ضعيف', 'حسن', 'حديث أبي ذر ضعيف، وحديث معيقيب صحيح', 'صحيح دون ذكر السنين', 'صحيح موقوفًا على ابن عباس', 'إسناده صحيح']) {
    assert.equal(isSahihGrade(grade), false, grade);
  }
  assert.equal(isSahihGrade('صحيح'), true);
  assert.equal(isSahihGrade('صحيح لغيره'), true);
});
test('all indexed hadiths have matching original grades, texts and full explanations', () => {
  const index = read('public/data/hadith/index.json.gz');
  assert.equal(index.count, index.entries.length);
  assert.ok(index.count > 3000);
  const ids = new Set();
  const chunks = new Map();
  for (const entry of index.entries) {
    assert.ok(!ids.has(entry.id)); ids.add(entry.id);
    assert.ok(isSahihGrade(entry.grade));
    assert.match(entry.chunk, /^chunk-\d+\.json$/);
    if (!chunks.has(entry.chunk)) chunks.set(entry.chunk, read('public/data/hadith/' + entry.chunk + '.gz'));
    const detail = chunks.get(entry.chunk)[entry.id];
    assert.equal(detail.id, entry.id);
    assert.equal(detail.text, entry.text);
    assert.equal(detail.grade, entry.grade);
    assert.ok(detail.explanation.trim(), 'explanation ' + entry.id);
    assert.ok(Array.isArray(detail.hints));
    assert.ok(detail.words.every(word => word.word && word.meaning));
  }
});
const editions = () => [
  { number: 1, numberOfAyahs: 2, edition: { identifier: 'quran-uthmani' }, ayahs: [{ numberInSurah: 1, text: 'verse one' }, { numberInSurah: 2, text: 'verse two' }] },
  { number: 1, numberOfAyahs: 2, edition: { identifier: 'ar.muyassar' }, ayahs: [{ numberInSurah: 2, text: 'explanation two' }, { numberInSurah: 1, text: 'explanation one' }] },
];
test('tafsir aligns by ayah number, never by accidental array order', () => {
  assert.deepEqual(alignTafsir(editions(), 1, 'ar.muyassar'), [
    { number: 1, verse: 'verse one', explanation: 'explanation one' },
    { number: 2, verse: 'verse two', explanation: 'explanation two' },
  ]);
});
test('missing, duplicate or wrong-source tafsir is rejected', () => {
  const missing = editions(); missing[1].ayahs.pop();
  assert.throws(() => alignTafsir(missing, 1, 'ar.muyassar'));
  const duplicate = editions(); duplicate[1].ayahs[0].numberInSurah = 1;
  assert.throws(() => alignTafsir(duplicate, 1, 'ar.muyassar'));
  assert.throws(() => alignTafsir(editions(), 2, 'ar.muyassar'));
  assert.throws(() => alignTafsir(editions(), 1, 'ar.jalalayn'));
});
test('mushaf contains all 6236 verses once, in 604 original pages', () => {
  const book = read('public/data/mushaf.json.gz');
  assert.equal(book.pages.length, 604);
  assert.equal(book.surahs.length, 114);
  const ids = new Set();
  const counts = {};
  for (const [i, page] of book.pages.entries()) {
    assert.ok(page.length);
    for (const verse of page) {
      assert.equal(verse.page, i + 1);
      const id = verse.surah + ':' + verse.number;
      assert.ok(!ids.has(id)); ids.add(id);
      counts[verse.surah] = (counts[verse.surah] || 0) + 1;
      assert.ok(verse.text.trim());
    }
  }
  assert.equal(ids.size, 6236);
  for (const surah of book.surahs) assert.equal(counts[surah.number], surah.count);
  assert.deepEqual(book.pages[1].map(v => [v.surah, v.number]), [[2, 1], [2, 2], [2, 3], [2, 4], [2, 5]]);
  assert.equal(book.pages[2][0].number, 6);
  assert.equal(book.pages[603].at(-1).surah, 114);
  assert.equal(book.pages[603].at(-1).number, 6);
});
