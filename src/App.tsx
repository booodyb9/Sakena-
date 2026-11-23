import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Home,
  Heart,
  Clock3,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Bell,
  Search,
  ArrowLeft,
  Bookmark,
  Download,
  MapPin,
  Check,
  RotateCcw,
  Menu,
  X,
  Sparkles,
  ChevronLeft,
  Headphones,
} from 'lucide-react';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import AudioLibrary from './AudioLibrary';
import QuranArtwork, { MosqueBackdrop, CornerOrnament } from './QuranArtwork';
import './reference-theme.css';
import './learning.css';
import GlobalSearch from './GlobalSearch';
import TafsirReader from './TafsirReader';
import { hadith } from './religiousContent';
import type { ReligiousEntry as Entry } from './religiousContent';
import { surahNames } from './audioCatalog';
import MemorizationReader from './MemorizationReader';
import { readJourney, PROGRESS_KEY } from './quranProgress';
import type { SurahProgress } from './quranProgress';

type Page = 'home' | 'quran' | 'hadith' | 'dua' | 'prayer' | 'saved' | 'audio' | 'search' | 'tafsir';
type Surah = {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
};
type Verse = { numberInSurah: number; text: string };
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const cities = [
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357, zone: 'Africa/Cairo' },
  { name: 'الإسكندرية', lat: 31.2001, lng: 29.9187, zone: 'Africa/Cairo' },
  { name: 'مكة المكرمة', lat: 21.4225, lng: 39.8262, zone: 'Asia/Riyadh' },
  { name: 'الرياض', lat: 24.7136, lng: 46.6753, zone: 'Asia/Riyadh' },
  { name: 'دبي', lat: 25.2048, lng: 55.2708, zone: 'Asia/Dubai' },
  { name: 'القدس', lat: 31.7683, lng: 35.2137, zone: 'Asia/Jerusalem' },
];
const duas: Entry[] = [
  {
    id: 'd1',
    title: 'خير الدنيا والآخرة',
    text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    source: 'سورة البقرة، الآية ٢٠١',
    category: 'أدعية قرآنية',
  },
  {
    id: 'd2',
    title: 'طلب العلم',
    text: 'رَبِّ زِدْنِي عِلْمًا',
    source: 'سورة طه، الآية ١١٤',
    category: 'أدعية قرآنية',
  },
  {
    id: 'd3',
    title: 'دعاء يونس عليه السلام',
    text: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    source: 'سورة الأنبياء، الآية ٨٧',
    category: 'أدعية قرآنية',
  },
  {
    id: 'd4',
    title: 'ذكر الصباح والمساء',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    source: 'صحيح مسلم، حديث ٢٦٩٢ — مائة مرة صباحًا ومساءً',
    category: 'أذكار يومية',
    total: 100,
  },
  {
    id: 'd5',
    title: 'التسبيح بعد الصلاة',
    text: 'سُبْحَانَ اللَّهِ',
    source: 'من أذكار دبر الصلاة: صحيح مسلم، حديث ٥٩٧',
    category: 'بعد الصلاة',
    total: 33,
  },
  {
    id: 'd6',
    title: 'الحمد بعد الصلاة',
    text: 'الْحَمْدُ لِلَّهِ',
    source: 'من أذكار دبر الصلاة: صحيح مسلم، حديث ٥٩٧',
    category: 'بعد الصلاة',
    total: 33,
  },
];
const fatiha: Verse[] = [
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  'الرَّحْمَٰنِ الرَّحِيمِ',
  'مَالِكِ يَوْمِ الدِّينِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
  'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
].map((text, i) => ({ numberInSurah: i + 1, text }));
const ar = (n: number) => n.toLocaleString('ar-EG');
const normalize = (s: string) =>
  s
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي');
function read<T>(key: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem('sakina-' + key) || 'null') ?? fallback
    );
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem('sakina-' + key, JSON.stringify(value));
  } catch {
    /* Storage may be unavailable. */
  }
}
async function getQuran(path: string) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://api.alquran.cloud/v1/' + path, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('network');
    const body = await response.json();
    if (body.code !== 200 || !body.data) throw new Error('data');
    return body.data;
  } finally {
    window.clearTimeout(timer);
  }
}
const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'quran', label: 'القرآن الكريم', icon: BookOpen },
  { id: 'tafsir', label: 'تفسير القرآن', icon: BookOpen },
  { id: 'audio', label: 'القرّاء والتلاوات', icon: Headphones },
  { id: 'hadith', label: 'الأحاديث النبوية', icon: BookOpen },
  { id: 'dua', label: 'الأدعية والأذكار', icon: Heart },
  { id: 'prayer', label: 'مواقيت الصلاة', icon: Clock3 },
  { id: 'saved', label: 'المفضلة', icon: Bookmark },
  { id: 'search', label: 'البحث الشامل', icon: Search },
];
export default function App() {
  const [page, setPage] = useState<Page>(() => window.location.hash === '#audio' ? 'audio' : window.location.hash === '#search' ? 'search' : window.location.hash === '#tafsir' ? 'tafsir' : 'home');
  const [menu, setMenu] = useState(false);
  const [homePlayerTarget, setHomePlayerTarget] = useState<HTMLDivElement | null>(null);
  const [requestedReciter, setRequestedReciter] = useState<{ id: number; key: number } | null>(null);
  const [tafsirTarget, setTafsirTarget] = useState({ surah: 1, ayah: 1, source: 'ar.muyassar', key: 0 });
  const [expandedHadith, setExpandedHadith] = useState<string[]>([]);
  const [cityIndex, setCityIndex] = useState(() =>
    Math.max(0, Math.min(5, Number(read('city', 0)) || 0))
  );
  const [method, setMethod] = useState(() => read('method', 'Egyptian'));
  const [now, setNow] = useState(new Date());
  const [favorites, setFavorites] = useState<string[]>(() =>
    read('favorites', [])
  );
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    read('counts', {})
  );
  const [last, setLast] = useState(() =>
    read('last', { number: 1, name: 'سورة الفاتحة' })
  );
  const [surahs, setSurahs] = useState<Surah[]>(() => read('surahs', []));
  const [selected, setSelected] = useState<{
    number: number;
    name: string;
  } | null>(null);
  const [journey, setJourney] = useState(readJourney);
  const [studyMode, setStudyMode] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [qError, setQError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [fontSize, setFontSize] = useState(28);
  const [notifications, setNotifications] = useState(() =>
    read('notifications', false)
  );
  const [notice, setNotice] = useState('');
  const [installHelp, setInstallHelp] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null
  );
  const requestId = useRef(0);
  const city = cities[cityIndex];
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: city.zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find(p => p.type === type)?.value);
  const date = new Date(part('year'), part('month') - 1, part('day'));
  const params =
    method === 'UmmAlQura'
      ? CalculationMethod.UmmAlQura()
      : method === 'MuslimWorldLeague'
        ? CalculationMethod.MuslimWorldLeague()
        : CalculationMethod.Egyptian();
  params.madhab = Madhab.Shafi;
  const times = new PrayerTimes(
    new Coordinates(city.lat, city.lng),
    date,
    params
  );
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = new PrayerTimes(
    new Coordinates(city.lat, city.lng),
    tomorrow,
    params
  );
  const prayers = [
    { name: 'الفجر', time: times.fajr, icon: Sunrise },
    { name: 'الشروق', time: times.sunrise, icon: Sun },
    { name: 'الظهر', time: times.dhuhr, icon: Sun },
    { name: 'العصر', time: times.asr, icon: Sun },
    { name: 'المغرب', time: times.maghrib, icon: Sunset },
    { name: 'العشاء', time: times.isha, icon: Moon },
  ];
  const next = prayers
    .filter(p => p.name !== 'الشروق')
    .find(p => p.time > now) || {
    name: 'الفجر',
    time: tomorrowTimes.fajr,
    icon: Sunrise,
  };
  const remaining = Math.max(
    0,
    Math.floor((next.time.getTime() - now.getTime()) / 1000)
  );
  const countdown = [
    Math.floor(remaining / 3600),
    Math.floor(remaining / 60) % 60,
    remaining % 60,
  ]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
  const formatTime = (time: Date) =>
    new Intl.DateTimeFormat('ar-EG', {
      timeZone: city.zone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(time);
  const dateLabel = new Intl.DateTimeFormat('ar-EG', {
    timeZone: city.zone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    timeZone: city.zone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);
  useEffect(() => {
    if (!notifications) return;
    for (const prayer of prayers) {
      const delta = now.getTime() - prayer.time.getTime();
      const key = city.name + '-' + prayer.name + '-' + date.toDateString();
      if (
        prayer.name === 'الشروق' ||
        delta < 0 ||
        delta > 60000 ||
        read('notified', '') === key
      )
        continue;
      write('notified', key);
      setNotice('حان الآن وقت صلاة ' + prayer.name + ' في ' + city.name);
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker
          ?.getRegistration()
          .then(reg => {
            if (reg)
              return reg.showNotification('سكينة • صلاة ' + prayer.name, {
                body: 'حان وقت الصلاة في ' + city.name,
                tag: key,
              });
            new Notification('حان وقت صلاة ' + prayer.name);
          })
          .catch(() => {});
      }
    }
  }, [now, notifications, cityIndex, method]);
  function openTafsir(surah: number, ayah = 1, source = 'ar.muyassar') {
    go('tafsir');
    setTafsirTarget(previous => ({ surah, ayah, source, key: previous.key + 1 }));
  }
  function openReaderFromSearch(surah: number) {
    void openSurah({ number: surah, name: 'سورة ' + surahNames[surah - 1] });
  }
  function openHadithFromSearch(id: string) {
    const item = hadith.find(h => h.id === id);
    if (!item) return;
    go('hadith');
    setSearch(item.title);
    setExpandedHadith(previous => previous.includes(id) ? previous : [...previous, id]);
  }
  function go(nextPage: Page) {
    requestId.current += 1;
    setPage(nextPage);
    setMenu(false);
    setSearch('');
    setCategory('الكل');
    setSelected(null);
    setQError('');
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (nextPage === 'quran' && !surahs.length) void loadSurahs();
  }
  async function loadSurahs() {
    const id = ++requestId.current;
    setLoading(true);
    setQError('');
    try {
      const data = await getQuran('surah');
      if (!Array.isArray(data) || data.length !== 114) throw new Error('data');
      if (id === requestId.current) {
        setSurahs(data);
        write('surahs', data);
      }
    } catch {
      if (id === requestId.current)
        setQError(
          'تعذّر تحميل فهرس السور. تحقق من الإنترنت وأعد المحاولة. سورة الفاتحة متاحة دون اتصال.'
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }
  function updateMemorization(surah: number, progress: SurahProgress) {
    const updated = { lastSurah: surah, surahs: { ...journey.surahs, [surah]: progress } };
    setJourney(updated);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
      setProgressError('');
    } catch {
      setProgressError('تعذّر حفظ تقدّمك على الجهاز. موضعك متاح الآن، لكنه قد لا يبقى بعد إغلاق الصفحة.');
    }
  }
  async function openSurah(surah: { number: number; name: string }, study = false) {
    setStudyMode(study);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (study) updateMemorization(surah.number, journey.surahs[surah.number] || { current: 1, memorized: [] });
    const id = ++requestId.current;
    setPage('quran');
    setSelected(surah);
    setSearch('');
    setQError('');
    setVerses([]);
    setLoading(true);
    const cached = read<Verse[]>(
      'surah-' + surah.number,
      surah.number === 1 ? fatiha : []
    );
    if (cached.length) {
      setVerses(cached);
      setLast(surah);
      write('last', surah);
      setLoading(false);
      return;
    }
    try {
      const data = await getQuran('surah/' + surah.number + '/quran-uthmani');
      if (!Array.isArray(data.ayahs) || !data.ayahs.length)
        throw new Error('data');
      if (id === requestId.current) {
        setVerses(data.ayahs);
        write('surah-' + surah.number, data.ayahs);
        setLast(surah);
        write('last', surah);
      }
    } catch {
      if (id === requestId.current)
        setQError(
          'تعذّر تحميل السورة. تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.'
        );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }
  function favorite(id: string) {
    const value = favorites.includes(id)
      ? favorites.filter(x => x !== id)
      : [...favorites, id];
    setFavorites(value);
    write('favorites', value);
  }
  function count(id: string, value: number) {
    const updated = { ...counts, [id]: value };
    setCounts(updated);
    write('counts', updated);
  }
  async function toggleNotifications() {
    if (notifications) {
      setNotifications(false);
      write('notifications', false);
      return;
    }
    if (!('Notification' in window)) {
      setNotice('هذا المتصفح لا يدعم الإشعارات. جرّب Chrome على أندرويد.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotice('لم يُسمح بالإشعارات. يمكنك السماح بها من إعدادات المتصفح.');
        return;
      }
      setNotifications(true);
      write('notifications', true);
      setNotice(
        'تم تفعيل التنبيهات أثناء فتح التطبيق. قد تتوقف عند إغلاقه أو إيقافه في الخلفية.'
      );
    } catch {
      setNotice('تعذّر تفعيل الإشعارات في هذا المتصفح.');
    }
  }
  async function install() {
    if (!installPrompt) {
      setInstallHelp(true);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  function entryCard(entry: Entry) {
    const saved = favorites.includes(entry.id);
    const current = counts[entry.id] || 0;
    return (
      <article className="entry-card" key={entry.id}>
        <div className="entry-top">
          <span className="pill">{entry.category}</span>
          <button
            className={'icon-button ' + (saved ? 'saved' : '')}
            aria-label={
              (saved ? 'إزالة من المفضلة: ' : 'حفظ في المفضلة: ') + entry.title
            }
            onClick={() => favorite(entry.id)}
          >
            <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <h3>{entry.title}</h3>
        <p className="religious">{entry.text}</p>
        <p className="source">{entry.source}</p>
        {entry.explanation && <div className="hadith-explanation-block">
          <button className="text-button" aria-expanded={expandedHadith.includes(entry.id)}
            onClick={() => setExpandedHadith(current => current.includes(entry.id)
              ? current.filter(id => id !== entry.id) : [...current, entry.id])}>
            <BookOpen size={17} /> {expandedHadith.includes(entry.id) ? 'إخفاء شرح الحديث' : 'شرح الحديث'}
          </button>
          {expandedHadith.includes(entry.id) && <div className="hadith-explanation">
            <p>{entry.explanation}</p>
            <a href={entry.explanationUrl} target="_blank" rel="noreferrer">ملخص بالمعنى من موسوعة الأحاديث النبوية — اقرأ الشرح الأصلي</a>
          </div>}
        </div>}
        {entry.total && (
          <div className="counter-row">
            <button
              className="primary small"
              disabled={current >= entry.total}
              onClick={() =>
                count(entry.id, Math.min(entry.total!, current + 1))
              }
            >
              {current >= entry.total ? (
                <>
                  <Check size={17} /> اكتمل الذكر
                </>
              ) : (
                'اضغط للتسبيح'
              )}{' '}
              <span>
                {ar(current)} / {ar(entry.total)}
              </span>
            </button>
            <button
              className="icon-button"
              aria-label={'إعادة عداد ' + entry.title}
              onClick={() => count(entry.id, 0)}
            >
              <RotateCcw size={18} />
            </button>
          </div>
        )}
      </article>
    );
  }
  const allEntries = [...hadith, ...duas];
  const collection =
    page === 'hadith'
      ? hadith
      : page === 'saved'
        ? allEntries.filter(x => favorites.includes(x.id))
        : duas;
  const filtered = collection.filter(
    x =>
      (category === 'الكل' || x.category === category) &&
      normalize(x.title + x.text + (x.explanation || '')).includes(normalize(search))
  );
  const title = navItems.find(x => x.id === page)?.label;
  return (
    <div dir="rtl" className="app-shell reference-theme">
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <button
          className="brand"
          onClick={() => go('home')}
          aria-label="سكينة الرئيسية"
        >
          <span className="brand-icon">
            <Moon size={27} />
          </span>
          <span>
            سكينة<small>رفيق رحلتك الإيمانية</small>
          </span>
        </button>
        <div className="side-label">مساحتك اليومية</div>
        <nav>
          {navItems.map(item => (
            <button
              key={item.id}
              className={'nav-item ' + (page === item.id ? 'active' : '')}
              onClick={() => go(item.id)}
            >
              <item.icon size={21} />
              <span>{item.label}</span>
              {page === item.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-verse">
          <Sparkles size={23} />
          <p>
            أَلَا بِذِكْرِ اللَّهِ
            <br />
            تَطْمَئِنُّ الْقُلُوبُ
          </p>
          <small>سورة الرعد • الآية ٢٨</small>
        </div>
        <button className="install-button" onClick={install}>
          <Download size={19} />
          <span>
            ثبّت سكينة على جهازك<small>قريب منك، في كل وقت</small>
          </span>
        </button>
        <div className="side-bottom">لحظات صغيرة، وأثر يبقى</div>
      </aside>
      {menu && (
        <button
          className="overlay"
          aria-label="إغلاق القائمة"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <CornerOrnament /><CornerOrnament mirrored />
          <button className="mobile-brand" aria-label="سكينة الرئيسية" onClick={() => go('home')}>
            <span className="gold-crescent">☾</span><span>سكينة</span>
          </button>
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="فتح القائمة"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>سكينة</span>
            <ChevronLeft size={15} />
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <button className="location-button" onClick={() => go('prayer')}>
              <MapPin size={16} />
              {city.name}
            </button>
            <span className="top-divider" />
            <button
              className="icon-button"
              aria-label="إعدادات تنبيهات الصلاة"
              onClick={() => go('prayer')}
            >
              <Bell size={20} />
              <i className="notification-dot" />
            </button>
          </div>
        </header>
        <main className={page === 'home' ? 'home-page' : ''}>
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="إغلاق الرسالة"
                onClick={() => setNotice('')}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {page === 'home' ? (
            <>
              <section className="welcome">
                <MosqueBackdrop />
                <div>
                  <div className="eyebrow">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                  <h1>
                    السلام عليكم ورحمة الله{' '}
                    <span className="greeting-star">✧</span>
                  </h1>
                  <p>مرحبًا بك في سكينة، رفيقك اليومي في طاعة الله وذكره.</p>
                </div>
                <div className="date-box">
                  <strong>{hijri}</strong>
                  <span>{dateLabel}</span>
                </div>
              </section>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <span /> لحظة مع القرآن
                  </span>
                  <h2>
                    وَاجْعَلْ لِقَلْبِكَ
                    <br />
                    مِنَ الْقُرْآنِ نُورًا
                  </h2>
                  <p>
                    آية تتدبّرها، وسكينة ترافق يومك.
                    <br />
                    عد إلى وردك، فكل حرف بداية خير.
                  </p>
                  <button className="light-button" onClick={() => go('quran')}>
                    <BookOpen size={19} /> اقرأ القرآن الكريم{' '}
                    <ArrowLeft size={18} />
                  </button>
                  <button className="audio-entry-button" onClick={() => go('audio')}>
                    <Headphones size={18} /> استمع بصوت قارئك المفضل <ArrowLeft size={16} />
                  </button>
                </div>
                <div className="reference-hero-art"><QuranArtwork /></div>
              </section>
              <section className="prayer-strip">
                <div className="next-prayer">
                  <span className="round-icon">
                    <Clock3 size={24} />
                  </span>
                  <div>
                    <small>الصلاة القادمة</small>
                    <strong>
                      {next.name} <span>{formatTime(next.time)}</span>
                    </strong>
                  </div>
                </div>
                <div className="countdown">
                  <small>متبقي على الأذان</small>
                  <strong dir="ltr">{countdown}</strong>
                </div>
                <div className="mini-prayers">
                  {prayers
                    .filter(p => p.name !== 'الشروق')
                    .map(p => (
                      <div
                        className={p.name === next.name ? 'next' : ''}
                        key={p.name}
                      >
                        <span>{p.name}</span>
                        <strong>{formatTime(p.time)}</strong>
                      </div>
                    ))}
                </div>
                <button
                  className="icon-button"
                  aria-label="عرض مواقيت الصلاة"
                  onClick={() => go('prayer')}
                >
                  <ArrowLeft size={20} />
                </button>
              </section>
              <div ref={setHomePlayerTarget} className="home-player-slot" />
              <div className="section-heading">
                <h2>خيرٌ يرافق يومك</h2>
                <span>خطوات بسيطة، وأجر عظيم</span>
              </div>
              <section className="quick-grid">
                {[
                  {
                    id: 'quran' as Page,
                    icon: BookOpen,
                    label: 'القرآن الكريم',
                    sub: 'تلاوة وتدبّر',
                    color: 'green',
                  },
                  {
                    id: 'hadith' as Page,
                    icon: BookOpen,
                    label: 'الأحاديث النبوية',
                    sub: 'من هدي النبي ﷺ',
                    color: 'gold',
                  },
                  {
                    id: 'dua' as Page,
                    icon: Heart,
                    label: 'الأدعية والأذكار',
                    sub: 'ذكرٌ يطمئن القلب',
                    color: 'rose',
                  },
                  {
                    id: 'prayer' as Page,
                    icon: Clock3,
                    label: 'مواقيت الصلاة',
                    sub: 'على صلاتك حافظ',
                    color: 'blue',
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    className="quick-card"
                    onClick={() => go(item.id)}
                  >
                    <span className={'quick-icon ' + item.color}>
                      <item.icon size={25} />
                    </span>
                    <h3>{item.label}</h3>
                    <p>{item.sub}</p>
                    <ArrowLeft className="quick-arrow" size={18} />
                  </button>
                ))}
              </section>
              <section className="bottom-grid">
                <article className="daily-card">
                  <div className="card-heading">
                    <span className="gold-dot" /> حديث يضيء يومك{' '}
                    <span className="pill">حديث صحيح</span>
                  </div>
                  <p className="religious">
                    «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
                  </p>
                  <div className="card-footer">
                    <span>رواه البخاري • ٥٠٢٧</span>
                    <button
                      className="text-button"
                      onClick={() => go('hadith')}
                    >
                      تصفّح الأحاديث <ArrowLeft size={16} />
                    </button>
                  </div>
                </article>
                <article className="continue-card">
                  <span className="round-icon">
                    <Bookmark size={22} />
                  </span>
                  <div>
                    <small>لا تنسَ وردك اليومي</small>
                    <h3>{journey.lastSurah ? 'سورة ' + surahNames[journey.lastSurah - 1] : last.name}</h3>
                    <p>{journey.lastSurah ? 'علامة الحفظ عند الآية ' + ar(journey.surahs[journey.lastSurah].current) + ' • تم حفظ ' + ar(journey.surahs[journey.lastSurah].memorized.length) + ' آيات' : 'ابدأ رحلة الحفظ آية بآية، وسنتذكر موضعك.'}</p>
                  </div>
                  <button
                    className="primary small"
                    onClick={() => openSurah(last)}
                  >
                    متابعة القراءة <ArrowLeft size={16} />
                  </button>
                  <button className="primary small" onClick={() => {
                    const number = journey.lastSurah || last.number;
                    void openSurah({ number, name: 'سورة ' + surahNames[number - 1] }, true);
                  }}>
                    {journey.lastSurah ? 'متابعة الحفظ' : 'ابدأ الحفظ آية بآية'} <Bookmark size={16} />
                  </button>
                </article>
              </section>
              <p className="quiet-footer">
                «أحب الأعمال إلى الله أدومها وإن قل»{' '}
                <span>صحيح البخاري، ٦٤٦٤</span>
              </p>
            </>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">رفيق رحلتك الإيمانية</div>
                  <h1>{title}</h1>
                  <p>
                    {page === 'search'
                      ? 'ابحث عن القرّاء والسور والتفاسير والأحاديث وشروحها.'
                      : page === 'tafsir'
                      ? 'اقرأ الآيات مع تفسيرها ومصدرها.'
                      : page === 'audio'
                      ? 'اختر قارئك، واستمع إلى ما تيسّر من القرآن.'
                      : page === 'quran'
                      ? 'اقرأ بتأنٍّ، واجعل لك من كل يوم وردًا.'
                      : page === 'prayer'
                        ? 'إن الصلاة كانت على المؤمنين كتابًا موقوتًا.'
                        : page === 'saved'
                          ? 'أحاديث وأدعية اخترتها لتعود إليها.'
                          : 'كلمات من نور، ومعانٍ تبقى معك.'}
                  </p>
                </div>
              </section>
              {page === 'search' && <GlobalSearch
                onReciter={id => { go('audio'); setRequestedReciter(previous => ({ id, key: (previous?.key || 0) + 1 })); }}
                onSurah={openReaderFromSearch} onTafsir={openTafsir} onHadith={openHadithFromSearch}
              />}
              {page === 'tafsir' && <TafsirReader key={tafsirTarget.key}
                initialSurah={tafsirTarget.surah} initialAyah={tafsirTarget.ayah}
                initialSource={tafsirTarget.source} onRead={openReaderFromSearch}
              />}
              {page === 'quran' && (
                <>
                  {selected ? (
                    <>
                      <div className="reader-toolbar">
                        <button
                          className="text-button"
                          onClick={() => go('quran')}
                        >
                          → فهرس السور
                        </button>
                        <h2>{selected.name}</h2>
                        <button className="text-button" onClick={() => openTafsir(selected.number)}>تفسير السورة</button>
                        <div className="font-controls">
                          <button
                            aria-label="تصغير خط القرآن"
                            onClick={() =>
                              setFontSize(Math.max(20, fontSize - 2))
                            }
                          >
                            أ−
                          </button>
                          <button
                            aria-label="تكبير خط القرآن"
                            onClick={() =>
                              setFontSize(Math.min(44, fontSize + 2))
                            }
                          >
                            أ+
                          </button>
                        </div>
                      </div>
                      {loading && (
                        <p role="status" className="empty">
                          جارٍ تحميل السورة…
                        </p>
                      )}
                      {qError && (
                        <div className="error" role="alert">
                          {qError}
                          <button
                            className="primary small"
                            onClick={() => openSurah(selected, studyMode)}
                          >
                            إعادة المحاولة
                          </button>
                        </div>
                      )}
                      {!!verses.length && <>
                        <div className="reading-mode-tabs" aria-label="طريقة قراءة القرآن">
                          <button aria-pressed={!studyMode} onClick={() => setStudyMode(false)}>قراءة السورة</button>
                          <button aria-pressed={studyMode} onClick={() => {
                            setStudyMode(true);
                            updateMemorization(selected.number, journey.surahs[selected.number] || { current: 1, memorized: [] });
                          }}>الحفظ آية بآية</button>
                        </div>
                        {progressError && <p className="error" role="alert">{progressError}</p>}
                        {studyMode && <MemorizationReader key={selected.number} surah={selected} verses={verses}
                          progress={journey.surahs[selected.number] || { current: 1, memorized: [] }} fontSize={fontSize}
                          onChange={value => updateMemorization(selected.number, value)}
                          onTafsir={ayah => openTafsir(selected.number, ayah)} />}
                      </>}
                      {!!verses.length && !studyMode && (
                        <article className="quran-reader">
                          <div className="reader-ornament">۞</div>
                          <div style={{ fontSize }}>
                            {verses.map(v => (
                              <span key={v.numberInSurah}>
                                {v.text}{' '}
                                <button className="ayah-number ayah-tafsir-button"
                                  aria-label={'تفسير الآية ' + v.numberInSurah}
                                  onClick={() => openTafsir(selected.number, v.numberInSurah)}>
                                  {ar(v.numberInSurah)}
                                </button>{' '}
                              </span>
                            ))}
                          </div>
                          <p className="reader-source">اضغط رقم الآية لقراءة تفسيرها.<br />
                            النص:{' '}
                            {selected.number === 1
                              ? 'سورة الفاتحة • نص مضمّن للقراءة دون اتصال'
                              : 'AlQuran Cloud • الرسم العثماني'}
                            <br />
                            تُحفظ السور المفتوحة على هذا الجهاز للعودة إليها دون
                            اتصال.
                          </p>
                        </article>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="search-box">
                        <Search size={19} />
                        <input
                          aria-label="البحث عن سورة"
                          placeholder="ابحث عن سورة بالاسم أو الرقم…"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                        <span>١١٤ سورة</span>
                      </div>
                      {loading && (
                        <p role="status" className="empty">
                          جارٍ تحميل فهرس السور…
                        </p>
                      )}
                      {qError && (
                        <div className="error" role="alert">
                          {qError}
                          <button
                            className="primary small"
                            onClick={loadSurahs}
                          >
                            إعادة المحاولة
                          </button>
                        </div>
                      )}
                      <div className="surah-grid">
                        {(surahs.length
                          ? surahs
                          : [
                              {
                                number: 1,
                                name: 'سورة الفاتحة',
                                englishName: 'Al-Faatiha',
                                numberOfAyahs: 7,
                                revelationType: 'Meccan',
                              },
                            ]
                        )
                          .filter(s =>
                            normalize(
                              s.name + s.englishName + s.number + ar(s.number)
                            ).includes(normalize(search))
                          )
                          .map(s => (
                            <button
                              className="surah-card"
                              key={s.number}
                              onClick={() => openSurah(s)}
                            >
                              <span className="surah-number">
                                {ar(s.number)}
                              </span>
                              <span>
                                <strong>{s.name}</strong>
                                <small>
                                  {s.revelationType === 'Meccan'
                                    ? 'مكية'
                                    : 'مدنية'}{' '}
                                  • {ar(s.numberOfAyahs)} آيات
                                </small>
                                {journey.surahs[s.number] && <small className="surah-progress-label">حفظت {ar(journey.surahs[s.number].memorized.length)} آيات • توقفت عند {ar(journey.surahs[s.number].current)}</small>}
                              </span>
                              <BookOpen size={19} />
                            </button>
                          ))}
                      </div>
                      {surahs.length > 0 &&
                        !surahs.some(s =>
                          normalize(
                            s.name + s.englishName + s.number + ar(s.number)
                          ).includes(normalize(search))
                        ) && (
                          <div className="empty">
                            لا توجد سورة بهذا الاسم. جرّب كلمة أخرى.
                          </div>
                        )}
                      <p className="source centered">
                        فهرس القرآن ونصوص السور: AlQuran Cloud. تحتاج السورة إلى
                        الإنترنت عند فتحها لأول مرة.
                      </p>
                    </>
                  )}
                </>
              )}
              {(page === 'hadith' || page === 'dua' || page === 'saved') && (
                <>
                  <div className="search-box">
                    <Search size={19} />
                    <input
                      aria-label="البحث في النصوص"
                      placeholder="ابحث في العناوين والنصوص…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="filters">
                    {[
                      'الكل',
                      ...Array.from(new Set(collection.map(x => x.category))),
                    ].map(c => (
                      <button
                        className={category === c ? 'selected' : ''}
                        key={c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="entries-grid">{filtered.map(entryCard)}</div>
                  {!filtered.length && (
                    <div className="empty">
                      <Bookmark size={30} />
                      <h3>
                        {page === 'saved' && !favorites.length
                          ? 'مفضلتك تنتظر أول اختيار'
                          : 'لا توجد نتائج'}
                      </h3>
                      <p>
                        {page === 'saved' && !favorites.length
                          ? 'اضغط علامة الحفظ بجانب أي حديث أو دعاء.'
                          : 'جرّب تعديل البحث أو اختيار تصنيف آخر.'}
                      </p>
                    </div>
                  )}
                  {page === 'hadith' && (
                    <p className="source centered">
                      مجموعة مختارة من الصحيحين. يُذكر مصدر كل حديث، وتُوضّح
                      المقتطفات.
                    </p>
                  )}
                  {page === 'dua' && (
                    <p className="source centered">
                      مختارات من الأدعية والأذكار، وليست جميع أذكار اليوم أو
                      الصلاة.
                    </p>
                  )}
                </>
              )}
              {page === 'prayer' && (
                <>
                  <div className="settings-card">
                    <label>
                      المدينة
                      <select
                        value={cityIndex}
                        onChange={e => {
                          setCityIndex(Number(e.target.value));
                          write('city', Number(e.target.value));
                        }}
                      >
                        {cities.map((c, i) => (
                          <option key={c.name} value={i}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      طريقة حساب المواقيت
                      <select
                        value={method}
                        onChange={e => {
                          setMethod(e.target.value);
                          write('method', e.target.value);
                        }}
                      >
                        <option value="Egyptian">
                          الهيئة المصرية العامة للمساحة
                        </option>
                        <option value="UmmAlQura">أم القرى</option>
                        <option value="MuslimWorldLeague">
                          رابطة العالم الإسلامي
                        </option>
                      </select>
                    </label>
                  </div>
                  <section className="prayer-hero">
                    <div>
                      <span>الصلاة القادمة في {city.name}</span>
                      <h2>
                        {next.name} <small>{formatTime(next.time)}</small>
                      </h2>
                      <p>
                        {hijri} • {dateLabel}
                      </p>
                    </div>
                    <div>
                      <small>متبقي على الأذان</small>
                      <strong dir="ltr">{countdown}</strong>
                    </div>
                  </section>
                  <div className="prayer-grid">
                    {prayers.map(p => (
                      <article
                        className={
                          'prayer-time ' +
                          (next.name === p.name ? 'current' : '')
                        }
                        key={p.name}
                      >
                        <p.icon size={28} />
                        <h3>{p.name}</h3>
                        <strong>{formatTime(p.time)}</strong>
                        {p.name === 'الشروق' && (
                          <small>وقت الشروق، ليس صلاة مفروضة</small>
                        )}
                      </article>
                    ))}
                  </div>
                  <div className="notification-card">
                    <Bell size={27} />
                    <div>
                      <h3>تنبيهات الصلاة</h3>
                      <p>
                        تنبيهات عند دخول الوقت أثناء فتح التطبيق. قد تتوقف عند
                        إغلاقه أو تقييد المتصفح في الخلفية.
                      </p>
                      <small>التنبيه إشعار نصّي، ولا يتضمن صوت أذان.</small>
                    </div>
                    <button
                      className={
                        'primary small ' + (notifications ? 'enabled' : '')
                      }
                      onClick={toggleNotifications}
                    >
                      {notifications ? 'إيقاف التنبيهات' : 'تفعيل التنبيهات'}
                    </button>
                  </div>
                  <p className="source centered">
                    المواقيت محسوبة بمكتبة Adhan حسب إحداثيات المدينة وتوقيتها
                    المحلي. حساب العصر للجمهور. راجع تقويم مسجدك المحلي؛ قد
                    تختلف المواقيت بضع دقائق.
                  </p>
                </>
              )}
            </>
          )}
          <AudioLibrary visible={page === 'audio'} home={page === 'home'} homeTarget={homePlayerTarget} onBrowse={() => go('audio')} requestedReciter={requestedReciter} />
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="التنقل الرئيسي">
        {[
          { id: 'home' as Page, label: 'الرئيسية', icon: Home },
          { id: 'quran' as Page, label: 'القرآن', icon: BookOpen },
          { id: 'audio' as Page, label: 'الاستماع', icon: Headphones },
          { id: 'dua' as Page, label: 'الأذكار', icon: Heart },
          { id: 'saved' as Page, label: 'المفضلة', icon: Bookmark },
          { id: 'search' as Page, label: 'بحث', icon: Search },
        ].map(item => <button key={item.id} className={page === item.id ? 'active' : ''}
          aria-current={page === item.id ? 'page' : undefined} onClick={() => go(item.id)}>
          <item.icon size={23} /><span>{item.label}</span>
        </button>)}
      </nav>
      {installHelp && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
          >
            <button
              className="close-modal icon-button"
              aria-label="إغلاق تعليمات التثبيت"
              onClick={() => setInstallHelp(false)}
            >
              <X />
            </button>
            <span className="brand-icon">
              <Moon />
            </span>
            <h2 id="install-title">سكينة على موبايلك</h2>
            <p>
              افتح رابط الموقع في Chrome على أندرويد، ثم افتح قائمة ⋮ واختر
              «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».
            </p>
            <p>
              هذه نسخة ويب قابلة للتثبيت، وليست تطبيق APK. الأحاديث والأدعية
              والسور التي فتحتها متاحة دون اتصال بعد تحميل التطبيق.
            </p>
            <button className="primary" onClick={() => setInstallHelp(false)}>
              فهمت
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
