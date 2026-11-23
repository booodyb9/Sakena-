import { useEffect, useState } from 'react';
import { BookOpen, Bookmark, Search } from 'lucide-react';
import { getHadithDetail, useHadithIndex } from './hadithData';
import type { HadithEntry, HadithDetail } from './hadithData';
import { normalizeSearch } from './tafsirService';

type Props = { favorites: string[]; onFavorite: (id: string) => void; initialId?: string; savedOnly?: boolean };
function Details({ entry }: { entry: HadithEntry }) {
  const [data, setData] = useState<HadithDetail | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    getHadithDetail(entry).then(value => { if (active) setData(value); })
      .catch(() => { if (active) setError('تعذّر تحميل الشرح. أعد المحاولة عند توفر الاتصال.'); });
    return () => { active = false; };
  }, [entry, attempt]);
  if (error) return <div className="error" role="alert">{error}<button className="text-button" onClick={() => setAttempt(attempt + 1)}>إعادة تحميل شرح الحديث</button></div>;
  if (!data) return <p role="status">جارٍ تحميل الشرح والمراجع…</p>;
  return <div className="hadith-full-details">
    <h4>شرح الحديث</h4><p>{data.explanation || 'لم يورد المصدر شرحًا لهذا الحديث.'}</p>
    <h4>فوائد الحديث وأحكامه الواردة في المصدر</h4>
    {data.hints.length ? <ul>{data.hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul> : <p>لم يورد المصدر فوائد أو أحكامًا مستقلة لهذا الحديث.</p>}
    {!!data.words.length && <><h4>معاني الكلمات</h4><dl>{data.words.map((item, i) => <div key={i}><dt>{item.word}</dt><dd>{item.meaning}</dd></div>)}</dl></>}
    <h4>التخريج والمراجع</h4><p className="hadith-references">{data.reference || data.attribution}</p>
    <a className="text-button" href={'https://hadeethenc.com/ar/browse/hadith/' + data.id} target="_blank" rel="noreferrer">الحديث والشرح في المصدر الأصلي</a>
    <p className="source">النص والدرجة والشرح والفوائد من موسوعة الأحاديث النبوية. الأحكام المعروضة نقل عن المصدر، وليست فتوى شخصية.</p>
  </div>;
}
export default function HadithLibrary({ favorites, onFavorite, initialId, savedOnly = false }: Props) {
  const { index, error, retry } = useHadithIndex();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [book, setBook] = useState('all');
  const [limit, setLimit] = useState(20);
  const [opened, setOpened] = useState<string[]>(initialId ? [initialId] : []);
  const [focused, setFocused] = useState(initialId || '');
  const entries = (index?.entries || []).filter(entry => {
    if (savedOnly && !favorites.includes('he-' + entry.id)) return false;
    if (focused && entry.id !== focused) return false;
    if (category !== 'all' && !entry.categories.includes(category)) return false;
    if (book !== 'all' && !entry.attribution.includes(book) &&
      !((book === 'البخاري' || book === 'مسلم') && entry.attribution.includes('متفق عليه'))) return false;
    return normalizeSearch(entry.title + ' ' + entry.text + ' ' + entry.attribution + ' ' + entry.id).includes(normalizeSearch(query));
  });
  function reset() { setLimit(20); setFocused(''); }
  return <section className="hadith-library" aria-label={savedOnly ? 'الأحاديث الموسوعية المحفوظة' : 'مكتبة الأحاديث الصحيحة'}>
    <div className="learning-intro"><BookOpen size={28} /><div>
      <h2>{savedOnly ? 'أحاديثك المحفوظة' : 'الصحيح من موسوعة الأحاديث النبوية'}</h2>
      <p>{index ? index.count.toLocaleString('ar-EG') + ' حديثًا مطابقًا لدرجات التصحيح في المصدر، مع الشروح والفوائد والمراجع.' : 'جارٍ فتح مكتبة الأحاديث…'}</p>
    </div></div>
    <p className="library-scope">هذه جميع المواد المطابقة لفلتر الصحيح في نسخة الموسوعة المدرجة، وليست حصرًا لكل الأحاديث الصحيحة أو نسخة كاملة من الصحيحين.
      {index && <> آخر جلب للمصدر: <time dateTime={index.generatedAt}>{index.generatedAt.slice(0, 10)}</time>.</>}
    </p>
    {error && <div className="error" role="alert">{error}<button className="primary small" onClick={retry}>إعادة تحميل المكتبة</button></div>}
    {!index && !error && <p role="status" className="empty">جارٍ تحميل فهرس الأحاديث…</p>}
    {index && <>
      <label className="search-box"><Search size={19} /><input aria-label="البحث في مكتبة الأحاديث" placeholder="ابحث في نص الحديث أو عنوانه أو رقمه…" value={query} onChange={e => { reset(); setQuery(e.target.value); }} /></label>
      <div className="hadith-library-filters">
        <label>الموضوع<select aria-label="موضوع الحديث" value={category} onChange={e => { reset(); setCategory(e.target.value); }}>
          <option value="all">كل الموضوعات</option>{index.categories.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label>
        <label>التخريج<select aria-label="مصدر تخريج الحديث" value={book} onChange={e => { reset(); setBook(e.target.value); }}>
          <option value="all">جميع المصادر</option><option value="البخاري">رواه البخاري</option><option value="مسلم">رواه مسلم</option><option value="متفق عليه">متفق عليه</option>
        </select></label>
      </div>
      {focused && <button className="text-button" onClick={() => setFocused('')}>عرض جميع أحاديث المكتبة</button>}
      <p className="source" role="status">{entries.length.toLocaleString('ar-EG')} حديثًا في النتائج</p>
      <div className="hadith-library-list">{entries.slice(0, limit).map(entry => {
        const saved = favorites.includes('he-' + entry.id);
        const expanded = opened.includes(entry.id);
        return <article className="entry-card" key={entry.id}>
          <div className="entry-top"><span className="pill">الدرجة: {entry.grade}</span>
            <button className={'icon-button ' + (saved ? 'saved' : '')} aria-label={(saved ? 'إزالة من المفضلة: ' : 'حفظ في المفضلة: ') + entry.title} onClick={() => onFavorite('he-' + entry.id)}><Bookmark size={19} fill={saved ? 'currentColor' : 'none'} /></button>
          </div>
          <h3>{entry.title}</h3><p className="religious">{entry.text}</p>
          <p className="source">{entry.attribution} · حكم موسوعة الأحاديث النبوية · رقم الموسوعة {entry.id}</p>
          <button className="text-button" aria-expanded={expanded} onClick={() => setOpened(value => expanded ? value.filter(id => id !== entry.id) : [...value, entry.id])}>{expanded ? 'إخفاء الشرح والأحكام' : 'شرح الحديث وأحكامه'}</button>
          {expanded && <Details entry={entry} />}
        </article>;
      })}</div>
      {!entries.length && <div className="empty">{savedOnly && !query && category === 'all' && book === 'all' ? 'لم تحفظ أحاديث من المكتبة بعد.' : 'لا توجد أحاديث تطابق البحث والفلاتر.'}</div>}
      {entries.length > limit && <button className="primary more-results" onClick={() => setLimit(limit + 20)}>عرض المزيد من الأحاديث</button>}
    </>}
  </section>;
}
