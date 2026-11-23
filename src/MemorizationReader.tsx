import { useState } from 'react';
import { Bookmark, Check, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { normalizeProgress } from './quranProgress';
import type { SurahProgress } from './quranProgress';

type Props = {
  surah: { number: number; name: string };
  verses: { numberInSurah: number; text: string }[];
  progress: SurahProgress;
  fontSize: number;
  onChange: (progress: SurahProgress) => void;
  onTafsir: (ayah: number) => void;
};
const ar = (n: number) => n.toLocaleString('ar-EG');

export default function MemorizationReader({
  surah, verses, progress, fontSize, onChange, onTafsir,
}: Props) {
  const [hidden, setHidden] = useState(false);
  const { current, memorized } = normalizeProgress(progress, verses.length);
  const verse = verses.find(v => v.numberInSurah === current) || verses[0];
  const isMemorized = memorized.includes(current);
  const complete = memorized.length === verses.length;
  function move(ayah: number) {
    setHidden(false);
    onChange({ current: Math.max(1, Math.min(verses.length, ayah)), memorized });
  }
  function mark() {
    setHidden(false);
    onChange({
      current: Math.min(verses.length, current + 1),
      memorized: isMemorized ? memorized : [...memorized, current].sort((a, b) => a - b),
    });
  }
  return (
    <section className="memorization-panel" aria-label="متابعة حفظ القرآن">
      <div className="memorization-heading">
        <span className="round-icon"><Bookmark size={22} /></span>
        <div><h3>رحلة الحفظ • {surah.name}</h3><p>آية بآية، وعلى مهل</p></div>
        <span className="pill">{ar(memorized.length)} / {ar(verses.length)}</span>
      </div>
      <progress aria-label="تقدم حفظ السورة" value={memorized.length} max={verses.length} />
      <p className="memorization-status" role="status">
        {complete
          ? 'أتممت تسجيل حفظ السورة كاملة. بارك الله فيك، وداوم على المراجعة.'
          : 'أتممت حفظ ' + ar(memorized.length) + ' من ' + ar(verses.length) + ' آيات'}
      </p>
      <label className="memorization-select">موضعك الحالي
        <select aria-label="اختيار آية للحفظ" value={current} onChange={e => move(Number(e.target.value))}>
          {verses.map(v => (
            <option key={v.numberInSurah} value={v.numberInSurah}>
              الآية {ar(v.numberInSurah)}{memorized.includes(v.numberInSurah) ? ' • تم حفظها' : ''}
            </option>
          ))}
        </select>
      </label>
      <article className="memorization-verse">
        <div className="memorization-verse-label">
          <span>الآية {ar(current)} من {ar(verses.length)}</span>
          {isMemorized && <span><Check size={15} /> تم حفظها</span>}
        </div>
        {hidden
          ? <p className="hidden-verse">سمّع الآية لنفسك، ثم أظهرها للمراجعة.</p>
          : <p className="religious" style={{ fontSize }} data-testid="memorization-verse">{verse.text}</p>}
        <div className="memorization-verse-tools">
          <button className="text-button" aria-pressed={hidden} onClick={() => setHidden(!hidden)}>
            {hidden ? <Eye size={17} /> : <EyeOff size={17} />}
            {hidden ? 'إظهار الآية' : 'إخفاء الآية للمراجعة'}
          </button>
          <button className="text-button" onClick={() => onTafsir(current)}>تفسير الآية</button>
        </div>
      </article>
      <button className="primary memorization-confirm" onClick={mark} disabled={isMemorized && current === verses.length}>
        <Check size={18} />
        {isMemorized
          ? (current === verses.length ? 'تم حفظ هذه الآية' : 'محفوظة • انتقل للتالية')
          : 'أتممت حفظ الآية'}
      </button>
      <div className="memorization-navigation">
        <button className="text-button" disabled={current === 1} onClick={() => move(current - 1)}>
          <ArrowRight size={16} /> الآية السابقة للحفظ
        </button>
        <button className="text-button" disabled={current === verses.length} onClick={() => move(current + 1)}>
          الآية التالية للحفظ <ArrowLeft size={16} />
        </button>
      </div>
      {isMemorized && (
        <button className="text-button memorization-undo"
          onClick={() => onChange({ current, memorized: memorized.filter(n => n !== current) })}>
          إلغاء تأكيد حفظ هذه الآية
        </button>
      )}
      <p className="memorization-note"><Bookmark size={14} />
        يتحدّث موضع التوقف تلقائيًا عند الانتقال بين الآيات. الانتقال وحده لا يسجّل إتمام الحفظ.
      </p>
      <p className="memorization-note">
        تقدّمك محفوظ في هذا المتصفح على هذا الجهاز. تأكيد الحفظ ذاتي، ويمكنك إخفاء الآية لتراجعها.
      </p>
    </section>
  );
}
