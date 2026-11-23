export type SurahProgress = { current: number; memorized: number[] };
export type QuranJourney = {
  lastSurah: number | null;
  surahs: Record<number, SurahProgress>;
};

export const PROGRESS_KEY = 'sakina-quran-journey';

export function parseJourney(value: string | null): QuranJourney {
  const empty: QuranJourney = { lastSurah: null, surahs: {} };
  try {
    const raw = JSON.parse(value || 'null');
    if (!raw || !raw.surahs || typeof raw.surahs !== 'object') return empty;
    const surahs: Record<number, SurahProgress> = {};
    for (const [key, value] of Object.entries(raw.surahs)) {
      const id = Number(key);
      const item = value as SurahProgress;
      if (!Number.isInteger(id) || id < 1 || id > 114 || !item) continue;
      if (!Number.isInteger(item.current) || item.current < 1 || item.current > 286) continue;
      surahs[id] = {
        current: item.current,
        memorized: Array.isArray(item.memorized)
          ? [...new Set(item.memorized.filter(n => Number.isInteger(n) && n >= 1 && n <= 286))]
          : [],
      };
    }
    const lastSurah = Number(raw.lastSurah);
    return { surahs, lastSurah: surahs[lastSurah] ? lastSurah : null };
  } catch {
    return empty;
  }
}

export function readJourney(): QuranJourney {
  try {
    return parseJourney(localStorage.getItem(PROGRESS_KEY));
  } catch {
    return { lastSurah: null, surahs: {} };
  }
}

export function normalizeProgress(progress: SurahProgress, total: number): SurahProgress {
  return {
    current: Math.max(1, Math.min(total, progress.current)),
    memorized: [...new Set(progress.memorized.filter(n => Number.isInteger(n) && n >= 1 && n <= total))]
      .sort((a, b) => a - b),
  };
}
