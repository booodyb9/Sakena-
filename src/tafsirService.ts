export const tafsirSources = [
  { id: 'ar.muyassar', name: 'التفسير الميسّر', author: 'مجمع الملك فهد لطباعة المصحف الشريف' },
  { id: 'ar.jalalayn', name: 'تفسير الجلالين', author: 'جلال الدين المحلي وجلال الدين السيوطي' },
];
export type TafsirMatch = {
  number: number;
  numberInSurah: number;
  text: string;
  surah: { number: number; name: string };
};
export function normalizeSearch(value: string) {
  return value.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
export async function fetchQuranResource(path: string, signal: AbortSignal) {
  const response = await fetch('https://api.alquran.cloud/v1/' + path, { signal });
  const body = await response.json();
  if (response.status === 404 && path.startsWith('search/') &&
      /no results|returned no/i.test(String(body.data || body.status))) {
    return { count: 0, matches: [] };
  }
  if (!response.ok || body.code !== 200 || !body.data) throw new Error('quran-provider');
  return body.data;
}
