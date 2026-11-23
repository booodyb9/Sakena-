import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { surahNames } from './audioCatalog';
import { fetchQuranResource, tafsirSources } from './tafsirService';

type Verse = { numberInSurah: number; text: string };
type Edition = { number: number; ayahs: Verse[]; edition: { identifier: string } };
type Pair = { number: number; verse: string; explanation: string };
type Props = { initialSurah?: number; initialAyah?: number; initialSource?: string; onRead: (surah: number) => void };
export default function TafsirReader({ initialSurah = 1, initialAyah = 1, initialSource = 'ar.muyassar', onRead }: Props) {
  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(initialAyah);
  const [source, setSource] = useState(initialSource);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const sourceInfo = tafsirSources.find(s => s.id === source) || tafsirSources[0];

  useEffect(() => {
    const controller = new AbortController();
    const cacheKey = 'sakina-tafsir-' + source + '-' + surah;
    let cached: Pair[] = [];
    try {
      const value = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (Array.isArray(value) && value.length && value.every(v => Number.isInteger(v.number) && typeof v.verse === 'string' && typeof v.explanation === 'string')) cached = value;
    } catch { /* Cache is optional. */ }
    setPairs(cached); setError(''); setLoading(!cached.length);
    const timer = window.setTimeout(() => controller.abort(), 15000);
    async function load() {
      try {
        const data: Edition[] = await fetchQuranResource('surah/' + surah + '/editions/quran-uthmani,' + source, controller.signal);
        const quran = data.find(d => d.edition?.identifier === 'quran-uthmani' && d.number === surah);
        const tafsir = data.find(d => d.edition?.identifier === source && d.number === surah);
        if (!quran?.ayahs?.length || !tafsir?.ayahs?.length) throw new Error('invalid');
        const result = quran.ayahs.map(v => {
          const match = tafsir.ayahs.find(t => t.numberInSurah === v.numberInSurah);
          if (!match || typeof match.text !== 'string') throw new Error('missing-ayah');
          return { number: v.numberInSurah, verse: v.text, explanation: match.text };
        });
        if (!controller.signal.aborted) {
          setPairs(result);
          try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* Quota is optional. */ }
        }
      } catch {
        if (!cancelled) setError(cached.length
          ? 'تعذّر تحديث التفسير؛ تُعرض النسخة المحفوظة على جهازك.'
          : 'تعذّر تحميل التفسير. تحقق من الإنترنت ثم أعد المحاولة.');
      } finally {
        if (!cancelled) setLoading(false);
        window.clearTimeout(timer);
      }
    }
    let cancelled = false;
    void load();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [surah, source, retry]);
  const current = pairs.find(p => p.number === ayah);
  return <section className="tafsir-reader">
    <div className="learning-intro"><BookOpen size={28} /><div><h2>تدبّر معاني القرآن</h2><p>اختر السورة والآية، ثم اقرأ التفسير مع النص القرآني ومصدره.</p></div></div>
    <div className="tafsir-selectors">
      <label>السورة<select aria-label="سورة التفسير" value={surah} onChange={e => { setSurah(Number(e.target.value)); setAyah(1); setPairs([]); }}>{surahNames.map((name, i) => <option key={i + 1} value={i + 1}>{i + 1}. {name}</option>)}</select></label>
      <label>المصدر<select aria-label="مصدر التفسير" value={source} onChange={e => { setPairs([]); setSource(e.target.value); }}>{tafsirSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>الآية<select aria-label="آية التفسير" value={ayah} disabled={!pairs.length} onChange={e => setAyah(Number(e.target.value))}>
        {!pairs.length && <option value={ayah}>{ayah}</option>}
        {pairs.map(p => <option key={p.number} value={p.number}>الآية {p.number.toLocaleString('ar-EG')}</option>)}
      </select></label>
    </div>
    {loading && <p className="empty" role="status">جارٍ تحميل الآيات والتفسير…</p>}
    {error && <div className="error" role="alert"><span>{error}</span><button className="primary small" onClick={() => setRetry(retry + 1)}>إعادة تحميل التفسير</button></div>}
    {current && <article className="tafsir-ayah-card">
      <div className="tafsir-reference">سورة {surahNames[surah - 1]} · الآية {ayah.toLocaleString('ar-EG')}</div>
      <p className="religious tafsir-verse">{current.verse}</p>
      <div className="tafsir-explanation"><h3>{sourceInfo.name}</h3><p>{current.explanation}</p></div>
      <p className="source">{sourceInfo.author} · النص عبر <a href={'https://api.alquran.cloud/v1/ayah/' + surah + ':' + ayah + '/' + source} target="_blank" rel="noreferrer">AlQuran Cloud</a></p>
      <div className="tafsir-navigation">
        <button className="text-button" disabled={ayah <= 1} onClick={() => setAyah(ayah - 1)}><ChevronRight size={18} />الآية السابقة</button>
        <button className="text-button" onClick={() => onRead(surah)}>قراءة السورة</button>
        <button className="text-button" disabled={ayah >= pairs.length} onClick={() => setAyah(ayah + 1)}>الآية التالية<ChevronLeft size={18} /></button>
      </div>
    </article>}
    {!loading && !error && pairs.length > 0 && !current && <div className="empty">هذه الآية غير موجودة في السورة المختارة.<button className="text-button" onClick={() => setAyah(1)}>العودة لأول آية</button></div>}
    <p className="source centered">يُحفظ التفسير المفتوح على جهازك عند توفر مساحة، ويمكن العودة إليه دون اتصال.</p>
  </section>;
}
