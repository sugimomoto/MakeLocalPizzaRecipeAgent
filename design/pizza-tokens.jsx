// pizza-tokens.jsx — design tokens + small shared bits
// 和モダン × 温かみ: 和紙ベース、朱・山吹・墨、明朝×ゴシック

const T = {
  // surfaces — washi paper family
  washi:      '#F2E9D6',   // canvas background (slightly deeper for contrast)
  washiSoft:  '#F7F0DE',
  washiDeep:  '#E8DDC4',
  kinari:     '#FBF7ED',   // card / sheet
  sumi:       '#1F1A12',   // ink (text/headline)
  sumiSoft:   '#5A4E3E',   // body text
  sumiMuted:  '#928571',   // captions
  hairline:   'rgba(31,26,18,0.10)',
  // accents
  shu:        '#C8412A',   // vermilion (primary)
  shuDeep:    '#9F3220',
  shuPale:    '#F2D9CC',
  yamabuki:   '#DC8A2A',   // orange (warmth)
  matcha:     '#607744',   // green (seri/vegetable)
  ai:         '#3E5670',   // indigo (deep info)
  kogane:     '#BE934A',   // gold (premium notes)
  mokushi:    '#8B5A2B',   // wood

  // strategy colors (Exploit / Tune / Explore — 王道 / 一歩外す / 大冒険)
  exploitInk:  '#9F3220',
  exploitBg:   '#F4E2D9',
  tuneInk:     '#8A5A1F',
  tuneBg:      '#F4E5CD',
  exploreInk:  '#3E5670',
  exploreBg:   '#DDE2EB',

  // type
  mincho: '"Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif',
  gothic: '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif',
  mono:   '"JetBrains Mono", ui-monospace, monospace',
};

// ── Washi background (subtle paper texture) ─────────────────────────
const WASHI_NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.30 0 0 0 0 0.20 0 0 0 0.045 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

function Washi({ deep = false, style, children }) {
  return (
    <div style={{
      background: deep ? T.washiDeep : T.washi,
      backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply',
      ...style,
    }}>{children}</div>
  );
}

// ── Tiny inline icons (stroke style, 24px) ──────────────────────────
const Icon = {
  pin: (c = T.shu, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" stroke={c} strokeWidth="1.6"/>
      <circle cx="12" cy="9" r="2.5" fill={c}/>
    </svg>
  ),
  chev: (dir = 'down', c = T.sumiSoft, s = 14) => {
    const d = { down: 'M3 6l5 5 5-5', up: 'M3 10l5-5 5 5', right: 'M5 3l5 5-5 5', left: 'M11 3l-5 5 5 5' }[dir];
    return <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d={d} stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  },
  sparkle: (c = T.shu, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill={c}>
      <path d="M8 0l1.4 5.2L14.6 7 9.4 8.4 8 14 6.6 8.4 1.4 7 6.6 5.2z"/>
    </svg>
  ),
  star: (filled = true, c = T.yamabuki, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill={filled ? c : 'none'} stroke={c} strokeWidth="1.4">
      <path d="M8 1.2l2.1 4.4 4.7.5-3.5 3.3.9 4.6L8 11.7 3.8 14l.9-4.6L1.2 6.1l4.7-.5z" strokeLinejoin="round"/>
    </svg>
  ),
  check: (c = '#fff', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5l3 3 6-6.5" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  plus: (c = T.sumiSoft, s = 14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  refresh: (c = T.sumiSoft, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9L14 6m0-4v4h-4M13.5 8a5.5 5.5 0 0 1-9.4 3.9L2 10m0 4v-4h4" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  heart: (filled = false, c = T.shu, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill={filled ? c : 'none'} stroke={c} strokeWidth="1.6">
      <path d="M10 17S2.5 12.5 2.5 7.5A4 4 0 0 1 10 5.4 4 4 0 0 1 17.5 7.5C17.5 12.5 10 17 10 17z" strokeLinejoin="round"/>
    </svg>
  ),
  camera: (c = T.sumiSoft, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke={c} strokeWidth="1.4"/><circle cx="10" cy="11" r="3" stroke={c} strokeWidth="1.4"/><path d="M7 5l1-2h4l1 2" stroke={c} strokeWidth="1.4"/></svg>
  ),
  search: (c = T.sumiSoft, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke={c} strokeWidth="1.6"/><path d="M13.5 13.5L17 17" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  arrow: (c = '#fff', s = 16) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8h10m-4-4l4 4-4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  flame: (c = T.shu, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 20 20" fill={c}>
      <path d="M10 1c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4-1 4 2 4 2 1 0-2-1-3 0-5z"/>
    </svg>
  ),
};

// ── Pill / Chip ─────────────────────────────────────────────────────
function Chip({ children, selected, tone = 'default', size = 'md', style, icon }) {
  const tones = {
    default: { bg: 'rgba(31,26,18,0.04)', border: T.hairline, color: T.sumi },
    shu:     { bg: T.shuPale, border: 'rgba(200,65,42,0.22)', color: T.shuDeep },
    matcha:  { bg: 'rgba(96,119,68,0.12)', border: 'rgba(96,119,68,0.25)', color: '#3F5028' },
    yamabuki:{ bg: 'rgba(220,138,42,0.14)', border: 'rgba(220,138,42,0.3)', color: '#7A4C16' },
    ai:      { bg: 'rgba(62,86,112,0.10)', border: 'rgba(62,86,112,0.22)', color: T.ai },
    ghost:   { bg: 'transparent', border: T.hairline, color: T.sumiSoft },
  }[tone];
  const sel = selected ? { bg: T.sumi, color: T.kinari, border: T.sumi } : tones;
  const sz = size === 'sm' ? { p: '4px 9px', fs: 11 } : { p: '6px 12px', fs: 12 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: sz.p, borderRadius: 999, border: `1px solid ${sel.border}`,
      background: sel.bg, color: sel.color, fontSize: sz.fs, fontWeight: 500,
      fontFamily: T.gothic, lineHeight: 1, whiteSpace: 'nowrap',
      letterSpacing: 0.2, ...style,
    }}>{icon}{children}</span>
  );
}

// ── Strategy label seal (王道 / 一歩外す / 大冒険) ───────────────────
function StrategySeal({ kind, size = 56 }) {
  const m = {
    exploit: { jp: '王道', en: 'EXPLOIT', ink: T.exploitInk, bg: T.exploitBg },
    tune:    { jp: '一歩外す', en: 'TUNE',  ink: T.tuneInk, bg: T.tuneBg },
    explore: { jp: '大冒険', en: 'EXPLORE', ink: T.exploreInk, bg: T.exploreBg },
  }[kind];
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: m.bg, color: m.ink,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.mincho, fontWeight: 600, fontSize: kind === 'tune' ? 13 : 15,
      lineHeight: 1, boxShadow: `inset 0 0 0 1px ${m.ink}33`, letterSpacing: 0.5,
    }}>
      <span>{m.jp}</span>
      <span style={{ fontFamily: T.gothic, fontWeight: 600, fontSize: 8, marginTop: 4, letterSpacing: 1, opacity: 0.7 }}>{m.en}</span>
    </div>
  );
}

// ── Pizza disk (stylized top-down view) ─────────────────────────────
// toppings: array of { color, count, size?, type?: 'spot'|'leaf'|'ring' }
function PizzaDisk({ size = 200, toppings = [], seed = 1, label }) {
  // deterministic pseudo-random spots
  const rand = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
  const r = size / 2;
  const crust = size * 0.46;
  const sauce = size * 0.40;
  let spotIdx = 0;
  const spots = [];
  toppings.forEach((t, ti) => {
    for (let i = 0; i < (t.count || 6); i++) {
      const k = spotIdx++;
      const angle = rand(seed + k * 1.7) * Math.PI * 2;
      const dist = (0.18 + rand(seed + k * 2.3) * 0.78) * sauce;
      const sz = (t.size || 9) * (0.7 + rand(seed + k * 3.1) * 0.6);
      spots.push({ t, ti, k, x: r + Math.cos(angle) * dist, y: r + Math.sin(angle) * dist, sz });
    }
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`crust-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8B97A"/>
          <stop offset="70%" stopColor="#C98947"/>
          <stop offset="100%" stopColor="#8E5824"/>
        </radialGradient>
        <radialGradient id={`sauce-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D8552F"/>
          <stop offset="100%" stopColor="#A53A1C"/>
        </radialGradient>
      </defs>
      {/* outer shadow */}
      <circle cx={r} cy={r} r={r - 2} fill="#000" opacity="0.18" transform={`translate(0,3)`}/>
      {/* crust */}
      <circle cx={r} cy={r} r={crust} fill={`url(#crust-${seed})`} stroke="#7A4419" strokeWidth="0.5"/>
      {/* crust speckle */}
      {Array.from({ length: 30 }).map((_, i) => {
        const a = rand(seed + 100 + i) * Math.PI * 2;
        const dd = (sauce + (crust - sauce) * (0.3 + rand(seed + 200 + i) * 0.7));
        return <circle key={i} cx={r + Math.cos(a) * dd} cy={r + Math.sin(a) * dd} r={0.6 + rand(seed + 300 + i) * 1.0} fill="#5C3110" opacity={0.4}/>;
      })}
      {/* sauce */}
      <circle cx={r} cy={r} r={sauce} fill={`url(#sauce-${seed})`}/>
      {/* cheese base blobs */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = rand(seed + 500 + i) * Math.PI * 2;
        const dd = rand(seed + 600 + i) * sauce * 0.9;
        const rr = 5 + rand(seed + 700 + i) * 8;
        return <circle key={`c${i}`} cx={r + Math.cos(a) * dd} cy={r + Math.sin(a) * dd} r={rr} fill="#F2E5BF" opacity={0.85}/>;
      })}
      {/* toppings */}
      {spots.map((s, i) => {
        if (s.t.type === 'leaf') {
          return <g key={i} transform={`translate(${s.x},${s.y}) rotate(${rand(seed + i) * 360})`}>
            <ellipse cx="0" cy="0" rx={s.sz} ry={s.sz * 0.45} fill={s.t.color}/>
            <path d={`M${-s.sz},0 L${s.sz},0`} stroke="#3A4F1F" strokeWidth="0.6" opacity="0.5"/>
          </g>;
        }
        if (s.t.type === 'ring') {
          return <circle key={i} cx={s.x} cy={s.y} r={s.sz} fill="none" stroke={s.t.color} strokeWidth="2.5"/>;
        }
        return <circle key={i} cx={s.x} cy={s.y} r={s.sz / 2} fill={s.t.color}/>;
      })}
      {/* highlight */}
      <ellipse cx={r - sauce * 0.3} cy={r - sauce * 0.4} rx={sauce * 0.4} ry={sauce * 0.15} fill="#fff" opacity={0.10}/>
    </svg>
  );
}

// ── Pre-built pizza variants ────────────────────────────────────────
const Pizzas = {
  seriOyster: (size) => <PizzaDisk size={size} seed={11} toppings={[
    { color: '#3F5028', count: 14, size: 10, type: 'leaf' },          // せり
    { color: '#7A6952', count: 6, size: 13 },                          // 牡蠣
    { color: '#F0E4B8', count: 5, size: 8 },                           // モッツァ
  ]} />,
  paprikaMozza: (size) => <PizzaDisk size={size} seed={23} toppings={[
    { color: '#E07A2B', count: 5, size: 12, type: 'ring' },            // パプリカ
    { color: '#C8412A', count: 4, size: 12, type: 'ring' },            // 赤パプリカ
    { color: '#F5E9B8', count: 8, size: 11 },                          // モッツァ
    { color: '#4D5F2E', count: 5, size: 7, type: 'leaf' },             // バジル
  ]} />,
  exploreMix: (size) => <PizzaDisk size={size} seed={37} toppings={[
    { color: '#3F5028', count: 8, size: 9, type: 'leaf' },             // せり
    { color: '#E07A2B', count: 4, size: 11, type: 'ring' },            // パプリカ
    { color: '#7A6952', count: 4, size: 12 },                          // 牡蠣
    { color: '#F0E4B8', count: 7, size: 9 },                           // モッツァ
    { color: '#BE934A', count: 12, size: 3 },                          // しらす的アクセント
  ]} />,
  oysterClassic: (size) => <PizzaDisk size={size} seed={5} toppings={[
    { color: '#7A6952', count: 5, size: 14 },
    { color: '#F0E4B8', count: 9, size: 11 },
    { color: '#3F5028', count: 6, size: 6, type: 'leaf' },
  ]} />,
  seriClassic: (size) => <PizzaDisk size={size} seed={8} toppings={[
    { color: '#3F5028', count: 16, size: 11, type: 'leaf' },
    { color: '#F0E4B8', count: 8, size: 10 },
    { color: '#BE934A', count: 10, size: 3 },
  ]} />,
};

Object.assign(window, { T, WASHI_NOISE, Washi, Icon, Chip, StrategySeal, PizzaDisk, Pizzas });
