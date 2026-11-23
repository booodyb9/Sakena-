import { useId } from 'react';

export default function QuranArtwork({ className = '' }: { className?: string }) {
  const key = useId().replace(/:/g, '');
  return <svg className={'quran-artwork ' + className} viewBox="0 0 360 370" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={key + 'arch'} x1="80" y1="60" x2="280" y2="330" gradientUnits="userSpaceOnUse">
        <stop stopColor="#235b35" /><stop offset=".5" stopColor="#053d2d" /><stop offset="1" stopColor="#4a6940" />
      </linearGradient>
      <linearGradient id={key + 'gold'} x1="60" y1="50" x2="270" y2="350" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fcf0b4" /><stop offset=".25" stopColor="#b1882d" /><stop offset=".5" stopColor="#f5dd80" /><stop offset=".75" stopColor="#9c7529" /><stop offset="1" stopColor="#f7e8ac" />
      </linearGradient>
      <linearGradient id={key + 'leather'} x1="90" y1="100" x2="290" y2="290" gradientUnits="userSpaceOnUse">
        <stop stopColor="#326045" /><stop offset=".45" stopColor="#103f2c" /><stop offset="1" stopColor="#002d20" />
      </linearGradient>
      <linearGradient id={key + 'pages'} x1="250" y1="280" x2="250" y2="325" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9d8144" /><stop offset=".35" stopColor="#fff0bc" /><stop offset=".65" stopColor="#d5bc77" /><stop offset="1" stopColor="#795c29" />
      </linearGradient>
      <radialGradient id={key + 'halo'}>
        <stop stopColor="#ecd48c" stopOpacity=".6" /><stop offset="1" stopColor="#b6cfa0" stopOpacity="0" />
      </radialGradient>
      <pattern id={key + 'pattern'} width="38" height="38" patternUnits="userSpaceOnUse">
        <path d="M19 0 24 11 38 19 27 25 19 38 12 27 0 19 11 12Z M0 0 38 38 M38 0 0 38" stroke="#d9c573" strokeOpacity=".17" strokeWidth=".7" />
        <circle cx="19" cy="19" r="6" stroke="#d9c573" strokeOpacity=".13" />
      </pattern>
      <filter id={key + 'shadow'} x="-40%" y="-35%" width="180%" height="190%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#081f12" floodOpacity=".38" />
      </filter>
    </defs>
    <ellipse cx="180" cy="333" rx="152" ry="26" fill={'url(#' + key + 'halo)'} />
    <path d="M39 320V157C39 120 64 100 95 96C101 63 150 65 180 28C209 65 258 63 265 96C297 100 321 120 321 157V320" fill={'url(#' + key + 'arch)'} stroke={'url(#' + key + 'gold)'} strokeWidth="4" />
    <path d="M46 320V158C46 124 71 105 101 103C109 73 153 72 180 38C207 72 251 73 259 103C289 105 314 124 314 158V320" fill={'url(#' + key + 'pattern)'} stroke="#c6ab61" strokeOpacity=".5" />
    <ellipse cx="183" cy="318" rx="138" ry="28" fill={'url(#' + key + 'halo)'} />
    <g filter={'url(#' + key + 'shadow)'} transform="rotate(-10 183 220)">
      <path d="M94 103 78 115 94 320 277 322 291 307Z" fill="#112f20" stroke="#b69a4e" strokeWidth="2" />
      <path d="M100 294 112 318 282 318 287 299Z" fill={'url(#' + key + 'pages)'} stroke="#a88940" />
      {[0, 1, 2, 3, 4, 5].map(n => <path key={n} d={'M112 ' + (302 + n * 2.4) + ' 283 ' + (301 + n * 2.4)} stroke="#9c8346" strokeOpacity=".55" strokeWidth=".6" />)}
      <path d="m228 307 5 40 10-11 12 11-4-41" fill={'url(#' + key + 'gold)'} />
      <path d="M93 100 258 108 291 299 109 303Z" fill={'url(#' + key + 'leather)'} stroke={'url(#' + key + 'gold)'} strokeWidth="3" />
      <path d="m85 112 15 192-7 12-13-197Z" fill="#264a2b" stroke="#c5a957" />
      <path d="m97 112 151 8 29 167-158 4Z" stroke="#d2b659" strokeWidth="3" />
      <path d="m104 120 139 8 26 151-144 4Z" stroke="#e1c96e" strokeWidth="1" />
      <path d="m110 127 126 7 24 138-129 3Z" fill={'url(#' + key + 'pattern)'} stroke="#ba9f4b" />
      <path d="m110 127 31 2-24 29Zm126 7-28-2 32 29Zm24 138-32 1 27-29Zm-129 3 31-1-35-26Z" fill="#c9af57" fillOpacity=".2" stroke="#d4bb64" />
      <g stroke="#ddc879" strokeWidth="1.2">
        <path d="M127 138c-17 5-5 19 2 11s-9-10-7-3m99-1c17 5 7 19-1 10s7-10 7-3M143 264c-16-4-9-20 0-12s-7 12-9 3m94 7c17-6 4-19-2-10s9 10 7 2" />
        <path d="m151 165 11-13 17 3 14-7 15 13 18 3 5 17 13 13-7 16 3 18-15 10-9 16-18-2-16 7-13-13-18-3-4-17-14-13 6-17-3-18Z" />
        <path d="m155 169 10-11 15 3 12-7 13 13 17 2 5 16 11 11-6 15 2 15-13 10-8 13-16-2-14 6-12-11-16-3-4-16-12-12 5-15-2-16Z" strokeOpacity=".55" />
      </g>
      <text x="184" y="201" textAnchor="middle" fill="#eed783" fontFamily="Amiri, serif" fontSize="29">القرآن</text>
      <text x="191" y="229" textAnchor="middle" fill="#eed783" fontFamily="Amiri, serif" fontSize="27">الكريم</text>
      <path d="m127 122 7 5 7-4m63 7 7 5 7-4m-69 149 8-4 8 4m49-5 8-4 8 3" stroke="#f0da8c" />
    </g>
    <path d="m302 70 3 10 10 3-10 3-3 10-3-10-10-3 10-3ZM64 242l2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="#f3dd93" opacity=".8" />
  </svg>;
}

export function MosqueBackdrop() {
  return <svg className="mosque-backdrop" viewBox="0 0 430 180" aria-hidden="true">
    <path d="M0 156Q50 111 100 147Q146 103 195 140Q245 116 292 145Q357 117 430 150V180H0Z" fill="currentColor" opacity=".35" />
    <path d="M83 148V102Q86 80 112 72Q138 80 141 102V148M99 102H125V145M48 148V77H55V148M47 77H57L52 65ZM49 65V59H55V65M47 59L52 48 57 59ZM168 149V84H175V149M167 84H177L172 72ZM170 72V66H174V72M166 66L172 53 178 66Z" fill="currentColor" />
    <path d="M108 67V44M110 27a13 13 0 1 0 14 18 12 12 0 0 1-14-18" fill="currentColor" />
    <path d="M205 146V111Q207 99 223 94Q238 99 241 111V147M262 146V130Q274 112 288 130V146" fill="currentColor" opacity=".65" />
  </svg>;
}

export function CornerOrnament({ mirrored = false }: { mirrored?: boolean }) {
  return <svg className={'corner-ornament ' + (mirrored ? 'mirrored' : '')}
    viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <path d="M100 0H0V12Q18 12 19 30Q38 26 41 46Q60 42 64 64Q84 64 88 83V100H100Z" fill="#f7efde" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2 4Q23 6 24 25Q43 24 47 41Q64 41 69 59Q88 60 93 79V100M13 0Q18 12 32 12Q30 27 45 28Q44 42 59 43Q57 57 74 57Q73 73 87 74Q86 89 100 92" stroke="currentColor" strokeWidth=".8" />
    {[0, 1, 2, 3, 4].map(n => <g key={n} transform={'translate(' + (29 + n * 14) + ' ' + (n * 14 - 2) + ')'}>
      <path d="m0 0 4 7 8-1-1 8 7 4-7 4 1 8-8-1-4 7-4-7-8 1 1-8-7-4 7-4-1-8 8 1Z" stroke="currentColor" strokeWidth=".7" />
      <path d="m0 9 9 9-9 9-9-9Z" stroke="currentColor" strokeWidth=".7" />
      <circle cy="18" r="3" fill="currentColor" opacity=".25" />
    </g>)}
    <path d="M100 38C74 37 65 26 63 0M100 65C55 65 36 40 36 0" stroke="currentColor" strokeWidth=".6" />
  </svg>;
}
