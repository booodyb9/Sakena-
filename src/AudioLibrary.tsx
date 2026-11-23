import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Search, Play, Pause, Square, SkipBack, SkipForward, RefreshCw, Radio } from 'lucide-react';
import { initialCatalog, surahNames } from './audioCatalog';
import type { Reciter, Moshaf } from './audioCatalog';
import './audio.css';
import { createPortal } from 'react-dom';
import QuranArtwork from './QuranArtwork';
import useBackgroundAudio from './useBackgroundAudio';
import { useNativeAudio, nativeCommand, isNativeAudio } from './nativeAudio';

type Track = { reciterId: number; moshafId: number; surah: number };
const number = (n: number) => n.toLocaleString('ar-EG');
const normalize = (text: string) => text
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s/g, '');
function saved<T,>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem('sakina-audio-' + key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem('sakina-audio-' + key, JSON.stringify(value)); } catch { /* Optional persistence. */ }
}
function ids(moshaf?: Moshaf): number[] {
  return [...new Set((moshaf?.surah_list || '').split(',').map(Number)
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 114))].sort((a, b) => a - b);
}
function defaultMoshaf(reciter?: Reciter) {
  return reciter?.moshaf.find(m => m.name === 'حفص عن عاصم - مرتل') || reciter?.moshaf[0];
}
function mediaUrl(moshaf: Moshaf, surah: number) {
  return moshaf.server.replace(/\/?$/, '/') + String(surah).padStart(3, '0') + '.mp3';
}
function validCatalog(value: unknown): value is Reciter[] {
  return Array.isArray(value) && value.length > 0 && value.every(r =>
    Number.isInteger(r?.id) && typeof r.name === 'string' && Array.isArray(r.moshaf) &&
    r.moshaf.length > 0 && r.moshaf.every((m: Moshaf) =>
      Number.isInteger(m.id) && typeof m.name === 'string' &&
      typeof m.surah_list === 'string' && ids(m).length > 0 &&
      /^https:\/\/(?:[a-z0-9-]+\.)*mp3quran\.net\//i.test(m.server)
    )
  );
}
export default function AudioLibrary({ visible, home = false, homeTarget, onBrowse, requestedReciter }: {
  visible: boolean;
  home?: boolean;
  homeTarget?: HTMLElement | null;
  onBrowse?: () => void;
  requestedReciter?: { id: number; key: number } | null;
}) {
  const [catalog, setCatalog] = useState<Reciter[]>(() => {
    const cache = saved<unknown>('catalog', null);
    return validCatalog(cache) ? cache : initialCatalog;
  });
  const [reciterId, setReciterId] = useState(() => Number(saved('reciter', 118)));
  const [moshafId, setMoshafId] = useState(() => Number(saved('moshaf', 118)));
  const [query, setQuery] = useState('');
  const [surahQuery, setSurahQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [status, setStatus] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [homeSurah, setHomeSurah] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sleepAt, setSleepAt] = useState(0);
  const [sleepRemaining, setSleepRemaining] = useState(0);
  const [backgroundHelp, setBackgroundHelp] = useState(false);
  const helpDialogRef = useRef<HTMLDialogElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  useNativeAudio(audioRef);
  const playRequest = useRef(0);
  const refreshRequest = useRef<AbortController | null>(null);
  const reciter = catalog.find(r => r.id === reciterId) || catalog[0];
  const moshaf = reciter?.moshaf.find(m => m.id === moshafId) || defaultMoshaf(reciter);
  const available = useMemo(() => ids(moshaf), [moshaf]);
  const filteredReciters = useMemo(() =>
    [...catalog].filter(r => normalize(r.name).includes(normalize(query)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')), [catalog, query]);
  const trackReciter = catalog.find(r => r.id === track?.reciterId);
  const trackMoshaf = trackReciter?.moshaf.find(m => m.id === track?.moshafId);
  const trackList = ids(trackMoshaf);
  const position = track ? trackList.indexOf(track.surah) : -1;
  const matchingSurahs = available.filter(id =>
    normalize(surahNames[id - 1] + id + number(id)).includes(normalize(surahQuery))
  );

  useEffect(() => {
    if (isNativeAudio() && track) nativeCommand({ action: 'loop', loop: repeat });
  }, [repeat, track]);
  useEffect(() => {
    if (!isNativeAudio() || !track || !trackMoshaf) return;
    nativeCommand({
      action: 'configure', title: 'سورة ' + surahNames[track.surah - 1], artist: trackReciter?.name || '',
      autoNext, sleepAt,
      queue: ids(trackMoshaf).map(surah => ({
        reciterId: track.reciterId, moshafId: track.moshafId, surah,
        url: mediaUrl(trackMoshaf, surah), title: 'سورة ' + surahNames[surah - 1], artist: trackReciter?.name || '',
      })),
    });
  }, [track, trackMoshaf, trackReciter, autoNext, sleepAt]);
  useEffect(() => {
    if (!isNativeAudio()) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const candidate = detail?.track;
      if (typeof detail?.loop === 'boolean') setRepeat(detail.loop);
      if (typeof detail?.rate === 'number') setSpeed(detail.rate);
      if (typeof detail?.autoNext === 'boolean') setAutoNext(detail.autoNext);
      if (typeof detail?.sleepAt === 'number') setSleepAt(detail.sleepAt);
      if (!candidate) return;
      const reader = catalog.find(r => r.id === candidate.reciterId);
      const recording = reader?.moshaf.find(m => m.id === candidate.moshafId);
      if (!recording || !ids(recording).includes(candidate.surah) || mediaUrl(recording, candidate.surah) !== detail.url) return;
      setTrack(previous => previous && previous.reciterId === candidate.reciterId && previous.moshafId === candidate.moshafId && previous.surah === candidate.surah
        ? previous : { reciterId: candidate.reciterId, moshafId: candidate.moshafId, surah: candidate.surah });
    };
    window.addEventListener('sakina-native-state', handler);
    return () => window.removeEventListener('sakina-native-state', handler);
  }, [catalog]);
  useBackgroundAudio(audioRef, track ? {
    key: track.reciterId + ':' + track.moshafId + ':' + track.surah,
    title: 'سورة ' + surahNames[track.surah - 1],
    artist: trackReciter?.name || '',
    album: 'سكينة • ' + (trackMoshaf?.name || 'القرآن الكريم'),
  } : null, {
    play: () => { if (audioRef.current?.paused) togglePlay(); },
    pause: () => { playRequest.current += 1; audioRef.current?.pause(); setPlaying(false); setStatus(''); },
    stop,
    previous: position > 0 ? () => nextTrack(-1) : null,
    next: position >= 0 && position < trackList.length - 1 ? () => nextTrack(1) : null,
  });
  useEffect(() => {
    const dialog = helpDialogRef.current;
    if (!dialog) return;
    if (backgroundHelp && !dialog.open) dialog.showModal();
    else if (!backgroundHelp && dialog.open) dialog.close();
  }, [backgroundHelp]);
  useEffect(() => {
    if (!requestedReciter) return;
    const requested = catalog.find(r => r.id === requestedReciter.id);
    if (requested) { selectReciter(requested); setQuery(''); }
  }, [requestedReciter]);
  useEffect(() => () => {
    refreshRequest.current?.abort();
    playRequest.current += 1;
  }, []);
  useEffect(() => {
    if (home && track) {
      setReciterId(track.reciterId);
      setMoshafId(track.moshafId);
      setHomeSurah(track.surah);
    }
  }, [home, track]);
  useEffect(() => {
    if (!sleepAt) { setSleepRemaining(0); return; }
    const checkTimer = () => {
      const left = Math.max(0, Math.ceil((sleepAt - Date.now()) / 1000));
      setSleepRemaining(left);
      if (!left) {
        playRequest.current += 1;
        audioRef.current?.pause();
        setPlaying(false); setSleepAt(0); setStatus('توقفت التلاوة بانتهاء مؤقت النوم.');
      }
    };
    checkTimer();
    const timer = window.setInterval(checkTimer, 1000);
    window.addEventListener('focus', checkTimer);
    document.addEventListener('visibilitychange', checkTimer);
    const audio = audioRef.current;
    audio?.addEventListener('timeupdate', checkTimer);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkTimer);
      document.removeEventListener('visibilitychange', checkTimer);
      audio?.removeEventListener('timeupdate', checkTimer);
    };
  }, [sleepAt]);
  function resetHomeTrack() {
    playRequest.current += 1;
    audioRef.current?.pause();
    setTrack(null); setPlaying(false); setElapsed(0); setDuration(0);
    setMediaError(''); setStatus('');
  }
  function timeLabel(value: number) {
    if (!Number.isFinite(value)) return '00:00';
    const seconds = Math.max(0, Math.floor(value));
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
      String(seconds % 60).padStart(2, '0');
  }
  const selectedHomeSurah = available.includes(homeSurah) ? homeSurah : available[0];
  const homeTrackMatches = track?.reciterId === reciter.id &&
    track?.moshafId === moshaf?.id && track?.surah === selectedHomeSurah;
  function playHome() {
    if (homeTrackMatches) togglePlay();
    else if (moshaf && selectedHomeSurah) play({ reciterId: reciter.id, moshafId: moshaf.id, surah: selectedHomeSurah });
  }
  function stepHome(direction: number) {
    const next = available[available.indexOf(selectedHomeSurah) + direction];
    if (next && moshaf) {
      setHomeSurah(next);
      play({ reciterId: reciter.id, moshafId: moshaf.id, surah: next });
    }
  }
  async function refreshCatalog() {
    refreshRequest.current?.abort();
    const controller = new AbortController();
    refreshRequest.current = controller;
    setRefreshing(true); setCatalogMessage('');
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://mp3quran.net/api/v3/reciters?language=ar', {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('network');
      const body = await response.json();
      if (!validCatalog(body.reciters)) throw new Error('catalog');
      setCatalog(body.reciters); save('catalog', body.reciters);
      setCatalogMessage('تم تحديث فهرس القرّاء من المكتبة.');
    } catch {
      if (refreshRequest.current === controller) {
        setCatalogMessage('تعذّر تحديث الفهرس. يمكنك استخدام الفهرس المحفوظ والمحاولة مجددًا؛ تشغيل الصوت يحتاج اتصالًا بالإنترنت.');
      }
    } finally {
      window.clearTimeout(timer);
      if (refreshRequest.current === controller) setRefreshing(false);
    }
  }
  function selectReciter(value: Reciter) {
    const first = defaultMoshaf(value);
    setReciterId(value.id); setMoshafId(first?.id || 0); setSurahQuery('');
    save('reciter', value.id); save('moshaf', first?.id || 0);
  }
  function selectMoshaf(value: number) {
    setMoshafId(value); setSurahQuery(''); save('moshaf', value);
  }
  function play(value: Track) {
    const chosenReciter = catalog.find(r => r.id === value.reciterId);
    const chosenMoshaf = chosenReciter?.moshaf.find(m => m.id === value.moshafId);
    const audio = audioRef.current;
    if (!audio || !chosenMoshaf || !ids(chosenMoshaf).includes(value.surah)) return;
    const request = ++playRequest.current;
    audio.pause();
    setTrack(value); setPlaying(false); setElapsed(0); setDuration(0); setMediaError(''); setStatus('جارٍ تحميل التلاوة…');
    audio.src = mediaUrl(chosenMoshaf, value.surah);
    audio.load();
    audio.playbackRate = speed;
    audio.play().catch(error => {
      if (request !== playRequest.current || error.name === 'AbortError') return;
      setStatus('');
      setMediaError(error.name === 'NotAllowedError'
        ? 'المتصفح يحتاج ضغطة أخرى لبدء الصوت. اضغط تشغيل.'
        : 'تعذّر تشغيل التلاوة. تحقق من الإنترنت أو جرّب تسجيلًا آخر، ثم أعد المحاولة.');
    });
  }
  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      if (audio.error) { play(track); return; }
      const request = ++playRequest.current;
      setMediaError('');
      audio.play().catch(() => {
        if (request === playRequest.current) setMediaError('تعذّر بدء الصوت. اضغط إعادة المحاولة أو اختر تسجيلًا آخر.');
      });
    } else {
      playRequest.current += 1;
      audio.pause(); setStatus('');
    }
  }
  function stop() {
    playRequest.current += 1;
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setStatus('تم إيقاف التلاوة'); setPlaying(false);
  }
  function nextTrack(direction: number) {
    const next = trackList[position + direction];
    if (track && next) play({ ...track, surah: next });
  }

  const homeCard = <section className="home-audio-card" aria-label="مشغل القرآن في الرئيسية">
    <div className="home-audio-heading">
      <span><span className="gold-dot" /> مشغّل القرآن الكريم</span>
      <button className="text-button" onClick={onBrowse}>كل القرّاء <Headphones size={16} /></button>
    </div>
    <div className="home-audio-title">
      <div><span className="ornament-divider">✧</span><h2>سورة {surahNames[selectedHomeSurah - 1]}</h2><p>القارئ: {reciter.name}</p></div>
      <QuranArtwork className="player-book" />
    </div>
    <div className="home-audio-selectors">
      <label>اختيار القارئ
        <select aria-label="قارئ مشغل الرئيسية" value={reciter.id} onChange={e => {
          const chosen = catalog.find(r => r.id === Number(e.target.value));
          if (chosen) { resetHomeTrack(); selectReciter(chosen); setHomeSurah(1); }
        }}>
          {[...catalog].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      <label>اختيار السورة
        <select aria-label="سورة مشغل الرئيسية" value={selectedHomeSurah} onChange={e => {
          const surah = Number(e.target.value);
          setHomeSurah(surah);
          if (track && moshaf) play({ reciterId: reciter.id, moshafId: moshaf.id, surah });
        }}>
          {available.map(id => <option key={id} value={id}>سورة {surahNames[id - 1]}</option>)}
        </select>
      </label>
      <label className="home-recording-label">الرواية والتسجيل
        <select aria-label="رواية مشغل الرئيسية" value={moshaf?.id || ''} onChange={e => {
          resetHomeTrack(); selectMoshaf(Number(e.target.value)); setHomeSurah(1);
        }}>
          {reciter.moshaf.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
    </div>
    <div className="home-progress" dir="ltr">
      <span>{timeLabel(homeTrackMatches ? elapsed : 0)}</span>
      <input aria-label="تقدم التلاوة في الرئيسية" type="range" min="0"
        max={Math.max(1, duration)} step="0.1" value={homeTrackMatches ? Math.min(elapsed, duration || 0) : 0}
        disabled={!homeTrackMatches || !duration}
        style={{ background: 'linear-gradient(to right, #0c5a38 ' + (duration ? elapsed / duration * 100 : 0) + '%, #d9ceb3 0%)' }}
        onChange={e => { if (audioRef.current && duration) { audioRef.current.currentTime = Number(e.target.value); setElapsed(Number(e.target.value)); } }}
      />
      <span>{timeLabel(homeTrackMatches ? duration : 0)}</span>
    </div>
    <div className="home-audio-controls">
      <button className="pearl-control" aria-label="السورة السابقة من الرئيسية" disabled={available.indexOf(selectedHomeSurah) <= 0} onClick={() => stepHome(-1)}><SkipForward size={25} fill="currentColor" /></button>
      <button className="emerald-play" aria-label={homeTrackMatches && playing ? 'إيقاف مؤقت من الرئيسية' : 'تشغيل القرآن من الرئيسية'} onClick={playHome}>
        {homeTrackMatches && playing ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
      </button>
      <button className="pearl-control" aria-label="السورة التالية من الرئيسية" disabled={available.indexOf(selectedHomeSurah) >= available.length - 1} onClick={() => stepHome(1)}><SkipBack size={25} fill="currentColor" /></button>
    </div>
    <div className="home-player-options">
      <button className={'pearl-option ' + (repeat ? 'on' : '')} aria-pressed={repeat} onClick={() => setRepeat(!repeat)}><RefreshCw size={17} /> تكرار</button>
      <label className="pearl-option"><span>السرعة</span><select aria-label="سرعة التلاوة" value={speed} onChange={e => {
        const value = Number(e.target.value); setSpeed(value); if (audioRef.current) audioRef.current.playbackRate = value;
      }}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
      <label className="pearl-option"><span>مؤقت النوم</span><select aria-label="مؤقت النوم بالدقائق" value={sleepAt ? 'active' : '0'} onChange={e => {
        const minutes = Number(e.target.value); setSleepAt(minutes ? Date.now() + minutes * 60000 : 0);
      }}><option value="0">إيقاف</option>{sleepAt > 0 && <option value="active">{Math.ceil(sleepRemaining / 60)} د</option>}<option value="5">٥ د</option><option value="15">١٥ د</option><option value="30">٣٠ د</option><option value="60">٦٠ د</option></select></label>
    </div>
    {sleepAt > 0 && <p className="home-player-note">يتوقف الصوت بعد {number(Math.ceil(sleepRemaining / 60))} دقيقة ما دام التطبيق نشطًا.</p>}
    {status && <p className="player-status" role="status">{status}</p>}
    {mediaError && <div className="player-error" role="alert"><span>{mediaError}</span><button className="text-button" onClick={() => track && play(track)}>إعادة محاولة الصوت</button></div>}
    <button className="background-audio-help text-button" onClick={() => setBackgroundHelp(true)}><Headphones size={16} /> الخلفية وشاشة القفل</button>
    <p className="home-player-note">تلاوات MP3Quran · الاستماع عبر الإنترنت</p>
  </section>;

  return <div className={'audio-host ' + (track && !home ? 'has-track' : '')}>
    {home && homeTarget && createPortal(homeCard, homeTarget)}
    <section className="audio-library" hidden={!visible} aria-label="مكتبة القراء والتلاوات">
      <div className="audio-intro">
        <span className="audio-intro-icon"><Headphones size={30} /></span>
        <div><h2>أصواتٌ تؤنس القلب</h2><p>كل القرّاء المتاحين في مكتبة MP3Quran، مع الروايات والتسجيلات المتوفرة لكل قارئ.</p></div>
        <span className="audio-count">{number(catalog.length)} قارئًا</span>
      </div>
      <div className="audio-source-row">
        <span>الفهرس الأساسي: ١٧ نوفمبر ٢٠٢٦ · التلاوات عبر الإنترنت</span>
        <button className="text-button" disabled={refreshing} onClick={refreshCatalog}><RefreshCw size={15} />{refreshing ? 'جارٍ التحديث…' : 'تحديث الفهرس'}</button>
      </div>
      <button className="background-audio-help text-button" onClick={() => setBackgroundHelp(true)}><Headphones size={16} /> الاستماع في الخلفية وشاشة القفل</button>
      {catalogMessage && <div className="notice" role="status">{catalogMessage}</div>}
      <div className="audio-layout">
        <div className="reciters-panel">
          <label className="search-box"><Search size={18} /><input aria-label="ابحث عن قارئ" placeholder="ابحث باسم الشيخ أو القارئ…" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <div className="reciters-count" role="status">{number(filteredReciters.length)} قارئًا في النتائج</div>
          <div className="reciters-list">
            {filteredReciters.map(r => <button
              className={'reciter-choice ' + (r.id === reciter.id ? 'chosen' : '')}
              key={r.id} onClick={() => selectReciter(r)}
              aria-pressed={r.id === reciter.id}
            >
              <span className="reciter-avatar">{r.name.trim().charAt(0)}</span>
              <span><strong>{r.name}</strong><small>{number(r.moshaf.length)} من الروايات والتسجيلات</small></span>
              <Headphones size={17} />
            </button>)}
            {!filteredReciters.length && <div className="empty"><p>لا يوجد قارئ بهذا الاسم في المكتبة.</p><button className="text-button" onClick={() => setQuery('')}>عرض كل القرّاء</button></div>}
          </div>
        </div>
        <div className="recordings-panel">
          <div className="reciter-heading"><Radio size={24} /><div><small>تلاوات القارئ</small><h2>{reciter.name}</h2></div></div>
          <label className="recording-select">الرواية ونوع المصحف
            <select aria-label="الرواية ونوع المصحف" value={moshaf?.id || ''} onChange={e => selectMoshaf(Number(e.target.value))}>
              {reciter.moshaf.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <div className="available-surahs"><strong>السور المتاحة: {number(available.length)} من ١١٤</strong><small>تظهر فقط السور الموجودة في هذا التسجيل.</small></div>
          <label className="search-box"><Search size={17} /><input aria-label="ابحث عن سورة للاستماع" placeholder="ابحث عن السورة…" value={surahQuery} onChange={e => setSurahQuery(e.target.value)} /></label>
          <div className="audio-surah-grid">
            {matchingSurahs.map(id => {
              const active = track?.reciterId === reciter.id && track?.moshafId === moshaf?.id && track?.surah === id;
              return <button className={'audio-surah ' + (active ? 'current' : '')} key={id}
                aria-label={'استمع إلى سورة ' + surahNames[id - 1]}
                onClick={() => moshaf && play({ reciterId: reciter.id, moshafId: moshaf.id, surah: id })}>
                <span className="audio-surah-id">{number(id)}</span>
                <span>سورة {surahNames[id - 1]}</span>
                {active && playing ? <Headphones size={18} /> : <Play size={17} />}
              </button>;
            })}
          </div>
          {!matchingSurahs.length && <div className="empty">السورة غير موجودة في نتائج هذا التسجيل. جرّب اسمًا آخر أو اختر تسجيلًا مختلفًا.</div>}
        </div>
      </div>
      <p className="source centered">المصدر: <a href="https://mp3quran.net/ar" target="_blank" rel="noreferrer">المكتبة الصوتية للقرآن الكريم MP3Quran</a>. تضم القائمة المتاح في المصدر، وقد تختلف الروايات والسور بين القرّاء.</p>
    </section>
    <section className="audio-player" hidden={!track || home} aria-label="مشغل التلاوات">
      <div className="now-playing"><span className="round-icon"><Headphones size={22} /></span><div><strong>{track ? 'سورة ' + surahNames[track.surah - 1] : 'اختر سورة'}</strong><span>{trackReciter?.name}</span><small>{trackMoshaf?.name}</small></div></div>
      <div className="player-center">
        <div className="player-buttons">
          <button className="icon-button" disabled={position <= 0} aria-label="السورة السابقة" onClick={() => nextTrack(-1)}><SkipForward size={21} /></button>
          <button className="audio-play-button" aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل التلاوة'} onClick={togglePlay}>{playing ? <Pause size={22} /> : <Play size={22} />}</button>
          <button className="icon-button" disabled={position < 0 || position >= trackList.length - 1} aria-label="السورة التالية" onClick={() => nextTrack(1)}><SkipBack size={21} /></button>
          <button className="icon-button" aria-label="إيقاف التلاوة من البداية" onClick={stop}><Square size={17} /></button>
        </div>
        <audio ref={audioRef} controls={!isNativeAudio()} hidden={isNativeAudio()} preload="auto" loop={repeat} aria-label="الصوت وتقدم التلاوة"
          onTimeUpdate={e => setElapsed(e.currentTarget.currentTime)}
          onLoadedMetadata={e => { setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0); if (!isNativeAudio()) e.currentTarget.playbackRate = speed; }}
          onDurationChange={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
          onPlaying={() => { setPlaying(true); setMediaError(''); setStatus(''); }}
          onPause={() => setPlaying(false)}
          onWaiting={() => setStatus('جارٍ تحميل الصوت…')}
          onCanPlay={() => setStatus('')}
          onEnded={() => { setPlaying(false); setStatus('انتهت التلاوة'); if (autoNext && !repeat) nextTrack(1); }}
          onError={() => { setPlaying(false); setStatus(''); setMediaError('تعذّر تحميل الصوت من المصدر. تحقق من الإنترنت أو اختر تسجيلًا آخر.'); }}
        />
      </div>
      {isNativeAudio() && <label className="native-progress">تقدم التلاوة
        <input aria-label="تقدم التلاوة على أندرويد" type="range" min="0" max={Math.max(1, duration)} step="1"
          value={Math.min(elapsed, duration || 0)} disabled={!duration}
          onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} />
        <span dir="ltr">{timeLabel(elapsed)} / {timeLabel(duration)}</span>
      </label>}
      <div className="player-options">
        <label className="in-player-surah">اختيار سورة
          <select aria-label="اختيار سورة من المشغل" value={track?.surah || ''} onChange={e => {
            if (track) play({ ...track, surah: Number(e.target.value) });
          }}>
            {trackList.map(id => <option key={id} value={id}>سورة {surahNames[id - 1]}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} /> تكرار السورة</label>
        <label><input type="checkbox" checked={autoNext} onChange={e => setAutoNext(e.target.checked)} /> تشغيل السورة التالية تلقائيًا</label>
      </div>
      {status && <p className="player-status" role="status">{status}</p>}
      {mediaError && <div className="player-error" role="alert"><span>{mediaError}</span><button className="text-button" onClick={() => track && play(track)}>إعادة محاولة الصوت</button></div>}
    </section>
    <dialog ref={helpDialogRef} className="background-help-dialog" aria-labelledby="background-help-title" onClose={() => setBackgroundHelp(false)}>
      <Headphones size={30} />
      <h2 id="background-help-title">استمع والشاشة مقفولة</h2>
      <p>ابدأ التلاوة من زر التشغيل، ثم انتقل لتطبيق آخر أو أطفئ الشاشة. المشغّل لا يوقف الصوت عند مغادرة الواجهة.</p>
      <p>{'mediaSession' in navigator
        ? 'متصفحك يدعم أزرار الوسائط: اسم السورة والقارئ، التشغيل والإيقاف، والتقديم والسورة التالية حيث يدعمها الجهاز.'
        : 'يمكن أن يستمر الصوت في الخلفية، لكن أزرار شاشة القفل غير مدعومة في هذا المتصفح. جرّب Chrome المحدث على أندرويد.'}</p>
      <h3>لو الصوت توقف على أندرويد</h3>
      <ol>
        <li>افتح سكينة في Chrome المحدث أو ثبّته من قائمة المتصفح.</li>
        <li>من إعدادات الهاتف، اسمح للتطبيق أو Chrome بالنشاط في الخلفية. قد تجد الخيار تحت البطارية باسم «غير مقيّد»، حسب جهازك.</li>
        <li>اترك التبويب مفتوحًا وتأكد من اتصال الإنترنت. لا تفرض إيقاف المتصفح.</li>
      </ol>
      <p className="background-limitation">{isNativeAudio() ? 'نسخة أندرويد تشغّل التلاوة بخدمة وسائط أصلية مع أزرار الإشعار وشاشة القفل. يظل الاتصال بالإنترنت مطلوبًا، وقد يوقف النظام التطبيق عند فرض الإيقاف.' : 'نسخة الويب لا تستطيع منع النظام من تعليق المتصفح أو إغلاقه؛ لذلك استمرار الصوت مع إطفاء الشاشة يعتمد أيضًا على جهازك وإعداداته. مؤقت النوم يتوقف حسب تشغيل المتصفح وقد يتأخر في الخلفية.'}</p>
      <button className="primary" onClick={() => setBackgroundHelp(false)}>فهمت</button>
    </dialog>
  </div>;
}
