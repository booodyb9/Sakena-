import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { alignTafsir } from '../src/tafsirPairs.ts';

const book = JSON.parse(gunzipSync(fs.readFileSync('public/data/mushaf.json.gz')));
for (const source of ['ar.muyassar', 'ar.jalalayn']) {
  const response = await fetch('https://api.alquran.cloud/v1/quran/' + source, { signal: AbortSignal.timeout(60000) });
  const body = await response.json();
  if (!response.ok || body.code !== 200 || body.data.surahs.length !== 114) throw new Error('Missing tafsir ' + source);
  let total = 0;
  for (const surah of body.data.surahs) {
    const ayahs = book.pages.flat().filter(v => v.surah === surah.number).map(v => ({ numberInSurah: v.number, text: v.text }));
    const quran = { number: surah.number, numberOfAyahs: ayahs.length, ayahs, edition: { identifier: 'quran-uthmani' } };
    const tafsir = { ...surah, numberOfAyahs: surah.ayahs.length, edition: { identifier: source } };
    total += alignTafsir([quran, tafsir], surah.number, source).length;
  }
  if (total !== 6236) throw new Error('Incomplete coverage ' + source);
  console.log(source + ': 114 surahs, 6236 aligned verses');
}
