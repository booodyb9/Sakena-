import { readCompressedJson } from './compressedJson';
import { useEffect, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { surahNames } from './audioCatalog';

type Verse = { surah: number; number: number; text: string; page: number };
type Mushaf = {
  pageCount: number; verseCount: number;
  surahs: { number: number; name: string; firstPage: number; lastPage: number; count: number }[];
  pages: Verse[][];
};
export type ReadingMark = { surah: number; ayah: number; page: number };
const MARK_KEY = 'sakina-reading-mark';
const PAGE_KEY = 'sakina-reading-page';
export function readReadingMark(): ReadingMark | null {
  try {
    const mark = JSON.parse(localStorage.getItem(MARK_KEY) || 'null');
    return mark && Number.isInteger(mark.surah) && mark.surah >= 1 && mark.surah <= 114 &&
      Number.isInteger(mark.ayah) && mark.ayah >= 1 && mark.ayah <= 286 &&
      Number.isInteger(mark.page) && mark.page >= 1 && mark.page <= 604 ? mark : null;
  } catch { return null; }
}
export function readReadingPage(): number | null {
  try {
    const page = Number(localStorage.getItem(PAGE_KEY));
    return Number.isInteger(page) && page >= 1 && page <= 604 ? page : null;
  } catch { return null; }
}
let bookPromise: Promise<Mushaf> | undefined;
export function getMushaf() {
  if (!bookPromise) bookPromise = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(new URL('data/mushaf.json.gz', document.baseURI), { signal: controller.signal });
      if (!response.ok) throw new Error('mushaf');
      const data: Mushaf = await readCompressedJson(response);
      if (data.pageCount !== 604 || data.verseCount !== 6236 || data.pages.length !== 604 || data.surahs.length !== 114) throw new Error('invalid-mushaf');
      return data;
    } finally { window.clearTimeout(timer); }
  })().catch(error => { bookPromise = undefined; throw error; });
  return bookPromise;
}
type Props = {
  initialSurah: number; resumePage?: number; mark: ReadingMark | null; fontSize: number;
  onMark: (mark: ReadingMark) => void; onPage: (page: number) => void;
  onTafsir: (surah: number, ayah: number) => void;
};
export default function MushafReader({ initialSurah, resumePage, mark, fontSize, onMark, onPage, onTafsir }: Props) {
  const [book, setBook] = useState<Mushaf | null>(null);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('1');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    getMushaf().then(data => {
      if (!active) return;
      setBook(data);
      const target = resumePage || data.surahs[initialSurah - 1].firstPage;
      setPage(target); setInput(String(target));
      onPage(target);
      try { localStorage.setItem(PAGE_KEY, String(target)); }
      catch { setStorageError('تعذّر حفظ آخر صفحة على الجهاز.'); }
    }).catch(() => { if (active) setError('تعذّر تحميل صفحات المصحف. تحقق من الاتصال وأعد المحاولة.'); });
    return () => { active = false; };
  }, [initialSurah, resumePage, attempt]);
  useEffect(() => {
    if (!book || !mark || mark.page !== page) return;
    document.getElementById('mushaf-' + mark.surah + '-' + mark.ayah)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [book, page, mark]);
  function move(target: number) {
    if (!Number.isInteger(target) || target < 1 || target > 604) {
      setMessage('رقم الصفحة يجب أن يكون من ١ إلى ٦٠٤.'); return;
    }
    setPage(target); setInput(String(target)); setMessage('');
    try { localStorage.setItem(PAGE_KEY, String(target)); setStorageError(''); }
    catch { setStorageError('تعذّر حفظ آخر صفحة على الجهاز.'); }
    onPage(target);
    document.getElementById('mushaf-page-top')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function bookmark(verse: Verse) {
    const value = { surah: verse.surah, ayah: verse.number, page: verse.page };
    onMark(value);
    try {
      localStorage.setItem(MARK_KEY, JSON.stringify(value));
      localStorage.setItem(PAGE_KEY, String(page));
      setStorageError(''); setMessage('تم حفظ علامة الوقوف عند سورة ' + surahNames[verse.surah - 1] + '، الآية ' + verse.number.toLocaleString('ar-EG') + '.');
    } catch { setStorageError('تعذّر حفظ العلامة على الجهاز؛ قد لا تبقى بعد إغلاق الصفحة.'); }
  }
  if (error) return <div className="error" role="alert">{error}<button className="primary small" onClick={() => setAttempt(attempt + 1)}>إعادة تحميل المصحف</button></div>;
  if (!book) return <p className="empty" role="status">جارٍ تحميل المصحف بصفحاته الأصلية…</p>;
  const verses = book.pages[page - 1];
  return <section className="mushaf-reader" aria-label="صفحات المصحف">
    <div id="mushaf-page-top" className="mushaf-page-controls">
      <button className="text-button" disabled={page === 1} onClick={() => move(page - 1)}><ChevronRight size={18} />الصفحة السابقة</button>
      <strong>صفحة {page.toLocaleString('ar-EG')} / ٦٠٤</strong>
      <button className="text-button" disabled={page === 604} onClick={() => move(page + 1)}>الصفحة التالية<ChevronLeft size={18} /></button>
    </div>
    <form className="mushaf-jump" onSubmit={e => { e.preventDefault(); move(Number(input.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))); }}>
      <label>اذهب إلى صفحة<input aria-label="رقم صفحة المصحف" inputMode="numeric" value={input} onChange={e => setInput(e.target.value)} /></label>
      <button className="primary small">انتقال</button>
      {mark && <button type="button" className="text-button" onClick={() => move(mark.page)}><Bookmark size={17} />العودة لعلامة الوقوف</button>}
    </form>
    <p className="mushaf-note">اضغط رقم الآية لحفظ علامة الوقوف. تُحفظ آخر صفحة عند التنقل تلقائيًا، وتبقى علامة الآية حتى تختار موضعًا آخر.</p>
    {message && <p role="status" className="notice">{message}</p>}
    {storageError && <p role="alert" className="error">{storageError}</p>}
    <article className="mushaf-paper" style={{ fontSize }}>
      {verses.map((verse, i) => {
        const marked = mark?.surah === verse.surah && mark.ayah === verse.number;
        const startsSurah = verse.number === 1;
        return <span key={verse.surah + ':' + verse.number}>
          {(startsSurah || i === 0) && <span className="mushaf-surah-title">{book.surahs[verse.surah - 1].name}{!startsSurah ? ' • متابعة' : ''}</span>}
          <span id={'mushaf-' + verse.surah + '-' + verse.number} className={'mushaf-verse ' + (marked ? 'reading-mark' : '')}>
            {verse.text}{' '}
            <button className="ayah-number" aria-pressed={marked}
              aria-label={'علامة وقوف: سورة ' + surahNames[verse.surah - 1] + ' الآية ' + verse.number}
              onClick={() => bookmark(verse)}>{verse.number.toLocaleString('ar-EG')}{marked && <Bookmark size={13} fill="currentColor" />}</button>{' '}
          </span>
        </span>;
      })}
    </article>
    {mark && mark.page === page && <div className="mushaf-mark-caption">
      <Bookmark size={18} fill="currentColor" /> وقفت عند سورة {surahNames[mark.surah - 1]}، الآية {mark.ayah.toLocaleString('ar-EG')}
      <button className="text-button" onClick={() => onTafsir(mark.surah, mark.ayah)}>تفسير الآية المحددة</button>
    </div>}
    <div className="mushaf-page-controls">
      <button className="text-button" disabled={page === 1} onClick={() => move(page - 1)}>الصفحة السابقة</button>
      <span>{page.toLocaleString('ar-EG')}</span>
      <button className="text-button" disabled={page === 604} onClick={() => move(page + 1)}>الصفحة التالية</button>
    </div>
    <p className="source">حدود الصفحات حسب ترقيم مصحف المدينة (٦٠٤ صفحات)، من بيانات AlQuran Cloud بالرسم العثماني. توزيع السطور يتكيّف مع الشاشة وحجم الخط.</p>
  </section>;
}
