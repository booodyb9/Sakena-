import { gzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { acceptedGrades, isSahihGrade } from './hadith-policy.mjs';

const API = 'https://hadeethenc.com/api/v1/';
const cache = '.cache/hadeethenc';
const output = 'public/data/hadith';
await fs.mkdir(cache, { recursive: true });
await fs.mkdir(output, { recursive: true });
async function json(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}
const categories = await json(API + 'categories/list/?language=ar');
const roots = categories.filter(c => c.parent_id === null);
const ids = new Set();
for (const category of roots) {
  let page = 1;
  let last = 1;
  do {
    const result = await json(API + 'hadeeths/list/?language=ar&category_id=' + category.id + '&per_page=200&page=' + page);
    if (!Array.isArray(result.data) || !result.meta) throw new Error('Invalid index');
    for (const item of result.data) {
      if (!/^\d+$/.test(item.id)) throw new Error('Invalid hadith ID');
      ids.add(item.id);
    }
    last = Number(result.meta.last_page);
    if (!Number.isInteger(last) || last < 1 || last > 100) throw new Error('Invalid pagination');
    page++;
  } while (page <= last);
}
const ordered = [...ids].sort((a, b) => Number(a) - Number(b));
console.log('INDEX', ordered.length);
let next = 0;
let done = 0;
const records = [];
const failures = [];
async function worker() {
  while (next < ordered.length) {
    const id = ordered[next++];
    try {
      const filename = path.join(cache, id + '.json');
      let item;
      try { item = JSON.parse(await fs.readFile(filename, 'utf8')); }
      catch { item = await json(API + 'hadeeths/one/?language=ar&id=' + id); await fs.writeFile(filename, JSON.stringify(item)); }
      if (String(item.id) !== id || typeof item.hadeeth !== 'string' || typeof item.grade !== 'string' || typeof item.explanation !== 'string') throw new Error('Invalid detail ' + id);
      records.push(item);
    } catch (error) { failures.push({ id, error: String(error) }); }
    done++;
    if (done % 250 === 0) console.log('DETAILS', done, '/', ordered.length);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
if (failures.length) {
  await fs.writeFile(path.join(cache, 'failures.json'), JSON.stringify(failures, null, 2));
  throw new Error('Incomplete download: ' + failures.length + ' failures. Rerun to resume.');
}
await fs.writeFile(path.join(cache, 'all.json'), JSON.stringify(records));
const selected = records.filter(item => isSahihGrade(item.grade)).sort((a, b) => Number(a.id) - Number(b.id));
const categoriesById = new Map(categories.map(c => [String(c.id), c]));
function rootCategories(sourceIds) {
  const result = new Set();
  for (let id of sourceIds || []) {
    id = String(id);
    const seen = new Set();
    while (categoriesById.has(id) && !seen.has(id)) {
      seen.add(id);
      const category = categoriesById.get(id);
      if (category.parent_id === null) { result.add(id); break; }
      id = String(category.parent_id);
    }
  }
  return [...result];
}
const entries = [];
for (let offset = 0; offset < selected.length; offset += 50) {
  const chunk = 'chunk-' + Math.floor(offset / 50) + '.json';
  const details = {};
  for (const item of selected.slice(offset, offset + 50)) {
    const entry = {
      id: String(item.id), title: item.title, text: item.hadeeth, grade: item.grade,
      attribution: item.attribution, categories: rootCategories(item.categories), chunk,
    };
    entries.push(entry);
    details[item.id] = {
      ...entry, explanation: item.explanation,
      hints: Array.isArray(item.hints) ? item.hints.filter(h => typeof h === 'string' && h.trim()) : [],
      words: Array.isArray(item.words_meanings) ? item.words_meanings
        .filter(w => typeof w.word === 'string' && w.word.trim() && typeof w.meaning === 'string' && w.meaning.trim())
        .map(w => ({ word: w.word, meaning: w.meaning })) : [],
      reference: typeof item.reference === 'string' ? item.reference : '',
    };
  }
  await fs.writeFile(path.join(output, chunk + '.gz'), gzipSync(JSON.stringify(details), { level: 9 }));
}
const index = {
  generatedAt: new Date().toISOString(), source: 'https://hadeethenc.com/ar/home',
  scannedCount: records.length, count: entries.length,
  gradePolicy: 'مطابقة قائمة درجات صريحة لتصحيح النص كاملًا؛ تستبعد الأحكام المختلطة والموقوفة والتصحيح الجزئي.',
  acceptedGrades: [...acceptedGrades],
  categories: roots.map(c => ({ id: String(c.id), title: c.title })), entries,
};
await fs.writeFile(path.join(output, 'index.json.gz'), gzipSync(JSON.stringify(index), { level: 9 }));
console.log('COMPLETE', JSON.stringify({ scanned: records.length, selected: entries.length }));
