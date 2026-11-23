import { useEffect, useState } from 'react';
export type HadithEntry = {
  id: string; title: string; text: string; grade: string;
  attribution: string; categories: string[]; chunk: string;
};
export type HadithDetail = HadithEntry & {
  explanation: string; hints: string[];
  words: { word: string; meaning: string }[]; reference: string;
};
export type HadithIndex = {
  count: number; scannedCount: number; generatedAt: string;
  categories: { id: string; title: string }[]; entries: HadithEntry[];
};
let indexPromise: Promise<HadithIndex> | undefined;
const chunks = new Map<string, Promise<Record<string, HadithDetail>>>();
async function resource(path: string) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(new URL('data/hadith/' + path, document.baseURI).href, { signal: controller.signal });
    if (!response.ok) throw new Error('hadith-resource');
    return await response.json();
  } finally { window.clearTimeout(timer); }
}
export function getHadithIndex() {
  if (!indexPromise) indexPromise = resource('index.json').then(value => {
    if (!Array.isArray(value.entries) || value.count !== value.entries.length ||
      !value.entries.every((item: HadithEntry) => /^\d+$/.test(item.id) &&
        typeof item.title === 'string' && typeof item.text === 'string' &&
        typeof item.grade === 'string' && /^chunk-\d+\.json$/.test(item.chunk))) throw new Error('invalid-index');
    return value as HadithIndex;
  }).catch(error => { indexPromise = undefined; throw error; });
  return indexPromise;
}
export async function getHadithDetail(entry: HadithEntry) {
  let request = chunks.get(entry.chunk);
  if (!request) {
    request = resource(entry.chunk).catch(error => { chunks.delete(entry.chunk); throw error; });
    chunks.set(entry.chunk, request!);
  }
  const records = await request!;
  const item = records[entry.id];
  if (!item || item.id !== entry.id || item.grade !== entry.grade ||
    typeof item.explanation !== 'string' || !Array.isArray(item.hints)) throw new Error('invalid-detail');
  return item;
}
export function useHadithIndex() {
  const [index, setIndex] = useState<HadithIndex | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    getHadithIndex().then(value => { if (active) setIndex(value); })
      .catch(() => { if (active) setError('تعذّر تحميل مكتبة الأحاديث. تحقق من الاتصال وأعد المحاولة.'); });
    return () => { active = false; };
  }, [attempt]);
  return { index, error, retry: () => setAttempt(value => value + 1) };
}
