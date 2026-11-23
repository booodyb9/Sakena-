export type TafsirPair = { number: number; verse: string; explanation: string };
type Verse = { numberInSurah: number; text: string };
type Edition = { number: number; numberOfAyahs: number; ayahs: Verse[]; edition: { identifier: string } };
export function alignTafsir(data: Edition[], surah: number, source: string): TafsirPair[] {
  if (!Array.isArray(data)) throw new Error('Invalid editions');
  const quran = data.find(d => d.edition?.identifier === 'quran-uthmani' && d.number === surah);
  const tafsir = data.find(d => d.edition?.identifier === source && d.number === surah);
  if (!quran || !tafsir || !Array.isArray(quran.ayahs) || !Array.isArray(tafsir.ayahs) ||
    !Number.isInteger(quran.numberOfAyahs) || quran.numberOfAyahs < 1 ||
    quran.ayahs.length !== quran.numberOfAyahs || tafsir.ayahs.length !== quran.ayahs.length) throw new Error('Incomplete surah');
  const explanations = new Map(tafsir.ayahs.map(v => [v.numberInSurah, v.text]));
  if (explanations.size !== quran.ayahs.length) throw new Error('Duplicate ayah');
  return quran.ayahs.map((verse, i) => {
    const explanation = explanations.get(verse.numberInSurah);
    if (verse.numberInSurah !== i + 1 || typeof verse.text !== 'string' || !verse.text.trim() ||
      typeof explanation !== 'string' || !explanation.trim()) throw new Error('Missing ayah');
    return { number: verse.numberInSurah, verse: verse.text, explanation };
  });
}
