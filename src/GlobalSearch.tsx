import { useEffect, useMemo, useState } from 'react';
import { Search, Headphones, BookOpen, ArrowLeft } from 'lucide-react';
import { initialCatalog, surahNames } from './audioCatalog';
import type { Reciter } from './audioCatalog';
import { useHadithIndex } from './hadithData';
import { fetchQuranResource, normalizeSearch, tafsirSources } from './tafsirService';
import type { TafsirMatch } from './tafsirService';

type Props = {
  onReciter: (id: number) => void;
  onSurah: (number: number) => void;
  onTafsir: (surah: number, ayah?: number, source?: string) => void;
  onHadith: (id: string) => void;
};
const tabs = ['الكل', 'القرّاء', 'السور', 'التفاسير', 'الأحاديث'];
function match(text: string, query: string) {
  return normalizeSearch(text).replace(/\s/g, '').includes(normalizeSearch(query).replace(/\s/g, ''));
}
export default function GlobalSearch({ onReciter, onSurah, onTafsir, onHadith }: Props) {
  const { index: hadithIndex, error: hadithError, retry: retryHadith } = useHadithIndex();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('الكل');
  const [source, setSource] = useState('ar.muyassar');
  const [submitted, setSubmitted] = useState('');
  const [remote, setRemote] = useState<TafsirMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [limit, setLimit] = useState(12);
  const [retry, setRetry] = useState(0);
  const readers = useMemo(() => {
    try {
      const cached: Reciter[] = JSON.parse(localStorage.getItem('sakina-audio-catalog') || 'null');
      if (Array.isArray(cached) && cached.length && cached.every(r => Number.isInteger(r.id) && typeof r.name === 'string')) return cached;
    } catch { /* Use the bundled catalog. */ }
    return initialCatalog;
  }, []);
  const normalized = normalizeSearch(query);
  const surahQuery = normalized.replace(/^(سورة|سوره)\s*/, '');
  const readerResults = normalized ? readers.filter(r => match(r.name, query)) : [];
  const surahResults = normalized ? surahNames.map((name, i) => ({ name, number: i + 1 }))
    .filter(s => match(s.name, surahQuery) || String(s.number) === surahQuery) : [];
  const hadithResults = normalized ? (hadithIndex?.entries || []).filter(h => match(h.title + ' ' + h.text + ' ' + h.attribution + ' ' + h.id, query)) : [];
  const show = (type: string) => tab === 'الكل' || tab === type;

  useEffect(() => {
    setRemote([]); setError(''); setSearched(false);
    if (normalizeSearch(submitted).length < 2) { setLoading(false); return; }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => controller.abort(), 15000);
    async function searchTafsir() {
      try {
        const data = await fetchQuranResource('search/' + encodeURIComponent(submitted) + '/all/' + source, controller.signal);
        if (!Array.isArray(data.matches)) throw new Error('invalid-matches');
        if (!cancelled) {
          setRemote(data.matches.filter((m: TafsirMatch) => typeof m.text === 'string' &&
            Number.isInteger(m.surah?.number) && m.surah.number >= 1 && m.surah.number <= 114 &&
            Number.isInteger(m.numberInSurah)));
          setSearched(true);
        }
      } catch {
        if (!cancelled) setError('تعذّر البحث في التفسير عبر الإنترنت. نتائج القرّاء والسور والأحاديث ما زالت متاحة.');
      } finally {
        window.clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }
    void searchTafsir();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [submitted, source, retry]);
  function changeQuery(value: string) {
    setQuery(value); setSubmitted(''); setLimit(12);
    setRemote([]); setError(''); setSearched(false);
  }
  function runSearch() {
    if (!normalized) return;
    setSubmitted(query.trim()); setRetry(retry + 1); setLimit(12);
  }
  const sourceName = tafsirSources.find(s => s.id === source)?.name;
  const localEmpty = !readerResults.length && !surahResults.length && !hadithResults.length;
  return <section className="global-search">
    <form className="unified-search-form" onSubmit={e => { e.preventDefault(); runSearch(); }}>
      <Search size={21} />
      <input aria-label="البحث الشامل" value={query} placeholder="قارئ، سورة، تفسير أو حديث…" onChange={e => changeQuery(e.target.value)} />
      <button className="primary small" type="submit" disabled={!normalized}>بحث</button>
    </form>
    <div className="filters search-tabs" aria-label="نوع نتائج البحث">
      {tabs.map(t => <button key={t} aria-pressed={tab === t} className={tab === t ? 'selected' : ''} onClick={() => {
        setTab(t); setLimit(12);
        if (t === 'التفاسير' && normalized.length >= 2) setSubmitted(query.trim());
      }}>{t}</button>)}
    </div>
    {show('التفاسير') && <div className="search-source">
      <label>التفسير المستخدم في البحث<select aria-label="مصدر البحث في التفاسير" value={source} onChange={e => { setSource(e.target.value); if (normalized.length >= 2) setSubmitted(query.trim()); }}>{tafsirSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <p>أسماء القرّاء والسور والأحاديث تظهر أثناء الكتابة. للبحث في نصوص التفسير اكتب حرفين على الأقل واضغط «بحث».</p>
    </div>}
    {!normalized && <div className="search-welcome"><Search size={35} /><h2>كل ما تبحث عنه، في مكان واحد</h2><p>جرّب البحث عن قارئك المفضل، أو معنى آية، أو حديث.</p><div className="search-suggestions">{['الحصري', 'البقرة', 'الرحمة', 'الرفق'].map(s => <button key={s} onClick={() => { changeQuery(s); setSubmitted(s); }}>{s}</button>)}</div></div>}
    {!!normalized && <>
      {show('القرّاء') && <section className="result-section"><h2><Headphones size={20} /> القرّاء <span>{readerResults.length.toLocaleString('ar-EG')}</span></h2>
        {readerResults.slice(0, limit).map(r => <button className="search-result result-link" key={r.id} onClick={() => onReciter(r.id)}><span><strong>{r.name}</strong><small>اختيار القارئ وتصفّح تلاواته</small></span><ArrowLeft size={18} /></button>)}
        {!readerResults.length && tab === 'القرّاء' && <p className="search-empty">لا يوجد قارئ مطابق في المكتبة.</p>}
      </section>}
      {show('السور') && <section className="result-section"><h2><BookOpen size={20} /> السور <span>{surahResults.length.toLocaleString('ar-EG')}</span></h2>
        {surahResults.slice(0, limit).map(s => <article className="search-result" key={s.number}><div><strong>سورة {s.name}</strong><small>السورة {s.number.toLocaleString('ar-EG')}</small></div><div className="result-actions"><button className="text-button" onClick={() => onSurah(s.number)}>قراءة السورة</button><button className="text-button" onClick={() => onTafsir(s.number)}>تفسير السورة</button></div></article>)}
        {!surahResults.length && tab === 'السور' && <p className="search-empty">لا توجد سورة مطابقة. جرّب الاسم أو رقم السورة.</p>}
      </section>}
      {show('الأحاديث') && <section className="result-section"><h2><BookOpen size={20} /> الأحاديث وشروحها <span>{hadithResults.length.toLocaleString('ar-EG')}</span></h2>
        {hadithResults.slice(0, limit).map(h => <article className="search-result hadith-result" key={h.id}><strong>{h.title}</strong><p className="religious">{h.text}</p><small>{h.attribution} · الدرجة: {h.grade}</small><button className="text-button" onClick={() => onHadith('he-' + h.id)}>قراءة الحديث وشرحه <ArrowLeft size={17} /></button></article>)}
        {hadithError && <div className="error" role="alert">{hadithError}<button className="text-button" onClick={retryHadith}>إعادة تحميل الأحاديث</button></div>}
        {!hadithIndex && !hadithError && <p role="status">جارٍ تحميل مكتبة الأحاديث…</p>}
        {hadithIndex && !hadithResults.length && tab === 'الأحاديث' && <p className="search-empty">لا توجد نتيجة في نصوص مكتبة الأحاديث الصحيحة المدرجة.</p>}
      </section>}
      {show('التفاسير') && <section className="result-section"><h2><BookOpen size={20} /> نصوص التفسير <span>{searched ? remote.length.toLocaleString('ar-EG') : '—'}</span></h2>
        {loading && <p role="status" className="search-empty">جارٍ البحث في {sourceName}…</p>}
        {error && <div className="error" role="alert"><span>{error}</span><button className="primary small" onClick={runSearch}>إعادة البحث</button></div>}
        {remote.slice(0, limit).map(m => <article className="search-result tafsir-result" key={m.number}><strong>سورة {surahNames[m.surah.number - 1]} · الآية {m.numberInSurah.toLocaleString('ar-EG')}</strong><p>{m.text.length > 260 ? m.text.slice(0, 260) + '…' : m.text}</p><small>{sourceName}</small><button className="text-button" onClick={() => onTafsir(m.surah.number, m.numberInSurah, source)}>قراءة الآية وتفسيرها <ArrowLeft size={17} /></button></article>)}
        {searched && !remote.length && !loading && !error && <p className="search-empty">لا توجد نتائج في {sourceName} لهذه العبارة.</p>}
        {!submitted && <p className="search-empty">اضغط «بحث» لعرض نتائج نصوص التفسير.</p>}
      </section>}
      {tab === 'الكل' && localEmpty && !remote.length && !loading && <p className="search-empty">{error ? 'لم نجد نتائج محلية، وتعذّر الاتصال بمصدر التفسير.' : searched ? 'لا توجد نتائج. جرّب كلمة أخرى.' : 'لا توجد نتائج محلية؛ اضغط بحث للبحث في التفسير.'}</p>}
      {(show('القرّاء') && readerResults.length > limit || show('السور') && surahResults.length > limit || show('الأحاديث') && hadithResults.length > limit || show('التفاسير') && remote.length > limit) && <button className="primary more-results" onClick={() => setLimit(limit + 12)}>عرض المزيد من النتائج</button>}
    </>}
    <p className="source centered">القرّاء من MP3Quran · التفاسير عبر AlQuran Cloud · الأحاديث الصحيحة وشروحها من موسوعة الأحاديث النبوية.</p>
  </section>;
}
