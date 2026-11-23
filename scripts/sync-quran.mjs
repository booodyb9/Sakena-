import { gzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani', { signal: AbortSignal.timeout(60000) });
const body = await response.json();
if (!response.ok || body.code !== 200 || body.data.surahs.length !== 114) throw new Error('Quran provider');
const pages = Array.from({ length: 604 }, () => []);
const surahs = [];
for (const surah of body.data.surahs) {
  surahs.push({ number: surah.number, name: surah.name, firstPage: surah.ayahs[0].page, lastPage: surah.ayahs.at(-1).page, count: surah.ayahs.length });
  for (const verse of surah.ayahs) {
    if (!Number.isInteger(verse.page) || verse.page < 1 || verse.page > 604) throw new Error('Invalid page');
    pages[verse.page - 1].push({ surah: surah.number, number: verse.numberInSurah, text: verse.text, page: verse.page });
  }
}
if (pages.some(p => !p.length) || pages.flat().length !== 6236) throw new Error('Incomplete Quran');
await fs.mkdir('public/data', { recursive: true });
await fs.writeFile('public/data/mushaf.json.gz', gzipSync(JSON.stringify({ source: 'AlQuran Cloud • quran-uthmani', pageCount: 604, verseCount: 6236, surahs, pages }), { level: 9 }));
console.log('QURAN_COMPLETE', pages.length, pages.flat().length);
