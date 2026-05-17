// pizza-screens.jsx — 7 screens of MakeLocalPizzaRecipeAgent
// Each screen is a function that returns the *inside* of an iPhone (393x852).

const W = 393, H = 852;
const SAFE_TOP = 54;     // below status bar
const SAFE_BOT = 34;     // home indicator

// ── Shared shell ────────────────────────────────────────────────────
function Phone({ children, bg = T.washi, dark = false }) {
  return (
    <IOSDevice width={W} height={H} dark={dark}>
      <div style={{
        position: 'absolute', inset: 0, background: bg,
        backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
        fontFamily: T.gothic, color: T.sumi,
      }}>
        {children}
      </div>
    </IOSDevice>
  );
}

// Small reusable shu-button
function ShuButton({ children, style, ghost, small }) {
  if (ghost) return (
    <div style={{
      flex: 1, height: small ? 44 : 52, borderRadius: 999,
      background: 'transparent', border: `1px solid ${T.hairline}`,
      color: T.sumi, fontFamily: T.gothic, fontWeight: 600, fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      ...style,
    }}>{children}</div>
  );
  return (
    <div style={{
      flex: 1, height: small ? 44 : 52, borderRadius: 999,
      background: T.shu, color: '#fff',
      boxShadow: '0 6px 18px rgba(200,65,42,0.32), inset 0 -2px 0 rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: T.gothic, fontWeight: 700, fontSize: 15, letterSpacing: 0.6,
      ...style,
    }}>{children}</div>
  );
}

// Vertical stamp text (mincho, used as decoration)
function Stamp({ text, top, left, right, color = T.shu, size = 11 }) {
  return (
    <div style={{
      position: 'absolute', top, left, right,
      writingMode: 'vertical-rl', fontFamily: T.mincho, fontWeight: 500,
      fontSize: size, color, letterSpacing: 4, opacity: 0.7,
    }}>{text}</div>
  );
}

// ===================================================================
// 01 · Tap1 — 地元選択 (初回オンボーディング)
// ===================================================================
function ScreenLocal() {
  const prefs = [
    { jp: '北海道', mark: '北' }, { jp: '宮城県', mark: '宮', hot: true },
    { jp: '東京都', mark: '東' }, { jp: '新潟県', mark: '新' },
    { jp: '長野県', mark: '長' }, { jp: '京都府', mark: '京' },
    { jp: '高知県', mark: '高' }, { jp: '福岡県', mark: '福' },
  ];
  return (
    <Phone>
      {/* status bar inset spacer */}
      <div style={{ height: SAFE_TOP }} />
      {/* brand */}
      <div style={{ padding: '8px 28px 0' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 13, color: T.shu, letterSpacing: 6 }}>
          地元 × ピザ
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 30, fontWeight: 600, color: T.sumi, lineHeight: 1.25, marginTop: 14, letterSpacing: 1 }}>
          あなたの地元を、<br/>教えてください。
        </div>
        <div style={{ fontFamily: T.gothic, fontSize: 13, color: T.sumiSoft, marginTop: 14, lineHeight: 1.7 }}>
          選んだ土地の食材で、<br/>AI が 3 枚のピザを発想します。
        </div>
      </div>

      {/* search */}
      <div style={{ margin: '24px 20px 0', height: 48, borderRadius: 14, background: T.kinari,
        border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10 }}>
        {Icon.search(T.sumiMuted, 18)}
        <span style={{ fontSize: 14, color: T.sumiMuted }}>都道府県・市町村で探す</span>
      </div>

      {/* recommended */}
      <div style={{ padding: '22px 28px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: T.mincho, fontSize: 14, color: T.sumi, letterSpacing: 2 }}>おすすめの土地</span>
        <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiMuted }}>季節 · 春</span>
      </div>

      {/* grid */}
      <div style={{ padding: '8px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {prefs.map((p, i) => (
          <div key={i} style={{
            aspectRatio: '1 / 1.05', borderRadius: 14,
            background: p.hot ? T.shu : T.kinari,
            border: `1px solid ${p.hot ? T.shu : T.hairline}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
            boxShadow: p.hot ? '0 8px 22px rgba(200,65,42,0.28)' : 'none',
          }}>
            <span style={{ fontFamily: T.mincho, fontSize: 28, fontWeight: 600, color: p.hot ? '#fff' : T.sumi }}>{p.mark}</span>
            <span style={{ fontFamily: T.gothic, fontSize: 10, color: p.hot ? 'rgba(255,255,255,0.85)' : T.sumiSoft, marginTop: 2 }}>{p.jp}</span>
            {p.hot && (
              <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, background: T.yamabuki }} />
            )}
          </div>
        ))}
      </div>

      {/* GPS pill */}
      <div style={{ margin: '18px 20px 0', padding: '14px 16px', borderRadius: 16, background: T.kinari,
        border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(96,119,68,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon.pin(T.matcha, 18)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.sumi }}>現在地から決める</div>
          <div style={{ fontSize: 11, color: T.sumiMuted, marginTop: 2 }}>位置情報の利用を許可します</div>
        </div>
        {Icon.chev('right', T.sumiMuted, 14)}
      </div>

      <Stamp text="地元 食材" top={120} right={18}/>

      {/* footer hint */}
      <div style={{ position: 'absolute', bottom: SAFE_BOT + 10, left: 0, right: 0, textAlign: 'center',
        fontFamily: T.gothic, fontSize: 10, color: T.sumiMuted, letterSpacing: 1 }}>
        1 / 2 タップで提案へ
      </div>
    </Phone>
  );
}

// ===================================================================
// 02 · Tap2 — 地元食材選択 (季節・カテゴリタブ + 選択中チップ)
// ===================================================================
function ScreenIngredients() {
  // ── Season / category icons (compact SVG badges) ───────────────────
  const SI = {
    '春': (c='#C8412A', s=12) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill={c}>
        {[0,1,2,3,4].map(i => { const a=(i*72-90)*Math.PI/180, x=8+Math.cos(a)*4.2, y=8+Math.sin(a)*4.2;
          return <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.2" transform={`rotate(${i*72} ${x} ${y})`}/>; })}
        <circle cx="8" cy="8" r="1.4" fill="#DC8A2A"/>
      </svg>),
    '夏': (c='#DC8A2A', s=12) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
        <circle cx="8" cy="8" r="3" fill={c}/>
        {[0,1,2,3,4,5,6,7].map(i => { const a=i*45*Math.PI/180; return <line key={i} x1={8+Math.cos(a)*5} y1={8+Math.sin(a)*5} x2={8+Math.cos(a)*7} y2={8+Math.sin(a)*7}/>; })}
      </svg>),
    '秋': (c='#9F3220', s=12) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill={c}>
        <path d="M8 2c-2 2-3 3-3 5 0 1 1 2 2 2 0 1-1 1-1 2l2 1 2-1c0-1-1-1-1-2 1 0 2-1 2-2 0-2-1-3-3-5z"/>
      </svg>),
    '冬': (c='#3E5670', s=12) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
        <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
        <line x1="3.8" y1="3.8" x2="12.2" y2="12.2"/><line x1="12.2" y1="3.8" x2="3.8" y2="12.2"/>
      </svg>),
  };
  const CI = {
    '魚介': (c='#3E5670', s=11) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill={c}><path d="M3 8c1.5-3 4.5-4 7-4 1.5 0 3 1 3 1l-2 3 2 3s-1.5 1-3 1c-2.5 0-5.5-1-7-4z"/><circle cx="10" cy="7" r="0.8" fill="#FBF7ED"/></svg>),
    '葉菜': (c='#607744', s=11) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 14c0-3 2-5 5-5-1 3-2 5-5 5z" fill={c}/><path d="M8 14c0-3-2-5-5-5 1 3 2 5 5 5z" fill={c} opacity="0.7"/><path d="M8 14V5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>),
    '果菜': (c='#C8412A', s=11) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill={c}><circle cx="8" cy="9" r="5"/><path d="M8 4c0-1 1-2 2-2-0.2 1.4-0.9 2-2 2z" fill="#607744"/></svg>),
    '乳製品': (c='#DC8A2A', s=11) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 11l5-7 7 4-1 4z" fill={c} stroke={c} strokeWidth="0.8" strokeLinejoin="round"/><circle cx="7" cy="9" r="0.9" fill="#FBF7ED"/><circle cx="10" cy="8" r="0.7" fill="#FBF7ED"/></svg>),
    '肉': (c='#9F3220', s=11) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill={c}><ellipse cx="8" cy="9" rx="5" ry="4"/><circle cx="6" cy="8" r="1" fill="#FBF7ED"/></svg>),
    '穀物': (c='#BE934A', s=11) => (
      <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round"><line x1="8" y1="2" x2="8" y2="14"/><path d="M8 5c-1.5-0.5-2.5 0-3 1.5 1.5 0.5 2.5 0 3-1.5z" fill={c}/><path d="M8 5c1.5-0.5 2.5 0 3 1.5-1.5 0.5-2.5 0-3-1.5z" fill={c}/><path d="M8 8.5c-1.5-0.5-2.5 0-3 1.5 1.5 0.5 2.5 0 3-1.5z" fill={c}/><path d="M8 8.5c1.5-0.5 2.5 0 3 1.5-1.5 0.5-2.5 0-3-1.5z" fill={c}/></svg>),
  };
  const Badge = ({ icon, label, dim }) => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 6px 2px 4px',
      borderRadius:999, background: dim?'rgba(251,247,237,0.12)':'rgba(31,26,18,0.05)',
      fontSize:9, color: dim?'rgba(251,247,237,0.75)':T.sumiSoft, fontFamily:T.gothic, fontWeight:600, letterSpacing:0.5 }}>
      {icon}{label}
    </span>
  );

  const tabs = ['すべて', '春', '夏', '秋', '冬'];
  const cats = ['魚介', '葉菜', '果菜', '乳製品', '肉', '穀物'];
  const items = [
    { name: 'せり', sub: '名取・三角芦原', tone: 'matcha', sel: true, art: '🌿', cat: '葉菜', season: '春' },
    { name: '牡蠣',  sub: '松島湾',         tone: 'ai',     sel: true, art: '🦪', cat: '魚介', season: '冬' },
    { name: 'パプリカ', sub: '亘理町',      tone: 'yamabuki', sel: false, art: '🫑', cat: '果菜', season: '夏' },
    { name: 'モッツァレラ', sub: '蔵王酪農', tone: 'shu',   sel: true, art: '🧀', cat: '乳製品', season: '春' },
    { name: 'ホヤ', sub: '石巻・女川',       tone: 'shu',   sel: false, art: '🟧', cat: '魚介', season: '夏' },
    { name: '仙台白菜', sub: '松島',         tone: 'matcha',sel: false, art: '🥬', cat: '葉菜', season: '冬' },
  ];
  return (
    <Phone>
      {/* status bar inset */}
      <div style={{ height: SAFE_TOP }} />

      {/* sticky-ish header — locale switch */}
      <div style={{ padding: '4px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: T.kinari, borderRadius: 999, border: `1px solid ${T.hairline}` }}>
          {Icon.pin(T.shu, 14)}
          <span style={{ fontSize: 13, fontWeight: 600, color: T.sumi, fontFamily: T.gothic }}>宮城県・仙台市</span>
          {Icon.chev('down', T.sumiMuted, 12)}
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.sumiMuted, letterSpacing: 2 }}>STEP 1 / 2</div>
      </div>

      {/* heading */}
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 23, fontWeight: 600, color: T.sumi, lineHeight: 1.35, letterSpacing: 0.5 }}>
          地元の食材を、<br/><span style={{ color: T.shu }}>1〜3 個</span>選びましょう。
        </div>
        <div style={{ fontSize: 12, color: T.sumiMuted, marginTop: 6 }}>
          ふるさと納税 API から取得・更新
        </div>
      </div>

      {/* season tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0', overflow: 'hidden' }}>
        {tabs.map((t, i) => {
          const on = i === 1;
          return (
            <div key={t} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              fontFamily: t === 'すべて' ? T.gothic : T.mincho, letterSpacing: 1,
              background: on ? T.sumi : 'transparent',
              color: on ? T.kinari : T.sumiSoft,
              border: `1px solid ${on ? T.sumi : T.hairline}`,
            }}>{SI[t]?.(on ? '#F2D9CC' : T.sumiSoft, 12)}<span>{t}</span></div>
          );
        })}
      </div>

      {/* category sub-row */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', overflow: 'hidden', flexWrap: 'nowrap' }}>
        {cats.map((c, i) => {
          const on = i === 0;
          return (
            <span key={c} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontFamily: T.gothic, color: on ? T.shu : T.sumiMuted,
              fontWeight: on ? 700 : 500, paddingBottom: 4,
              borderBottom: `2px solid ${on ? T.shu : 'transparent'}`,
              letterSpacing: 1,
            }}>{CI[c]?.(on ? T.shu : T.sumiMuted, 11)}<span>{c}</span></span>
          );
        })}
      </div>

      {/* ingredient grid */}
      <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            borderRadius: 16, padding: 12, background: T.kinari,
            border: `1.5px solid ${it.sel ? T.shu : T.hairline}`,
            position: 'relative', minHeight: 96,
          }}>
            {it.sel && (
              <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10,
                background: T.shu, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(200,65,42,0.4)' }}>{Icon.check('#fff', 12)}</div>
            )}
            <div style={{ width: 40, height: 40, borderRadius: 10,
              background: `rgba(${it.tone === 'matcha' ? '96,119,68' : it.tone === 'ai' ? '62,86,112' : it.tone === 'yamabuki' ? '220,138,42' : '200,65,42'},0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{it.art}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge icon={SI[it.season]?.(it.sel?'#F2D9CC':undefined, 11)} label={it.season} dim={false}/>
              <Badge icon={CI[it.cat]?.(it.sel?T.yamabuki:undefined, 11)} label={it.cat} dim={false}/>
            </div>
            <div style={{ marginTop: 6, fontFamily: T.mincho, fontWeight: 600, fontSize: 16, color: T.sumi }}>{it.name}</div>
            <div style={{ fontSize: 10, color: T.sumiMuted, marginTop: 2 }}>{it.sub}</div>
          </div>
        ))}
      </div>

      {/* selection summary bar (fixed) */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: SAFE_BOT + 12,
        background: T.sumi, borderRadius: 18, padding: 14, color: '#fff',
        boxShadow: '0 12px 32px rgba(31,26,18,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1, fontFamily: T.gothic }}>選択中 · 3 / 3</span>
          <span style={{ fontSize: 11, opacity: 0.5 }}>タップで解除</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {['せり','牡蠣','モッツァレラ'].map((n) => (
            <span key={n} style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.10)',
              fontSize: 11, fontWeight: 600 }}>{n} ×</span>
          ))}
        </div>
        <div style={{ background: T.shu, borderRadius: 999, padding: '13px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.15)' }}>
          {Icon.sparkle('#fff', 14)}
          <span style={{ fontFamily: T.gothic, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>AI に 3 案つくらせる</span>
          {Icon.arrow('#fff', 14)}
        </div>
      </div>
    </Phone>
  );
}

// ===================================================================
// 03 · Loading — ピザが焼けるアニメーション (静止フレーム)
// ===================================================================
function ScreenLoading() {
  return (
    <Phone bg={T.washiDeep} dark={false}>
      <div style={{ height: SAFE_TOP }} />

      {/* mincho heading */}
      <div style={{ padding: '24px 28px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 6, marginBottom: 18 }}>
          焼成中
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, lineHeight: 1.4 }}>
          地元の食材を、<br/>一枚にまとめています。
        </div>
      </div>

      {/* oven scene */}
      <div style={{ marginTop: 36, position: 'relative', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* oven arch */}
        <div style={{
          width: 300, height: 230,
          background: 'radial-gradient(60% 80% at 50% 100%, #FFD37A 0%, #E07A2B 30%, #8E2F18 70%, #2C1208 100%)',
          borderRadius: '200px 200px 18px 18px',
          position: 'relative',
          boxShadow: 'inset 0 -30px 60px rgba(0,0,0,0.4), 0 24px 50px rgba(140,50,30,0.35)',
        }}>
          {/* flame flecks */}
          {[[40,160],[260,170],[80,200],[220,200],[150,210]].map(([x,y], i) => (
            <div key={i} style={{ position: 'absolute', left: x - 6, top: y - 12, width: 12, height: 18,
              background: i % 2 ? '#FFC04A' : '#FFE079', borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%',
              opacity: 0.9, filter: 'blur(0.3px)' }} />
          ))}
          {/* pizza inside */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-40%)' }}>
            <div style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))' }}>
              {Pizzas.seriOyster(150)}
            </div>
          </div>
          {/* peel hint */}
          <div style={{ position: 'absolute', left: -16, bottom: 8, width: 80, height: 14, background: '#5A3A1E', borderRadius: '0 8px 8px 0', opacity: 0.6 }}/>
        </div>
      </div>

      {/* status log lines */}
      <div style={{ margin: '8px 32px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { t: '宮城県の食材データ取得', done: true },
          { t: '季節 · 春 を判定', done: true },
          { t: 'せり × 牡蠣 の相性を確認中', done: false, active: true },
          { t: '3 案の差別化軸を決定', done: false },
          { t: 'ストーリー生成', done: false },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: T.gothic,
            fontSize: 12, color: s.done ? T.sumiSoft : s.active ? T.sumi : T.sumiMuted,
            opacity: s.done ? 0.6 : 1 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, flexShrink: 0,
              background: s.done ? T.matcha : s.active ? T.shu : 'transparent',
              border: `1px solid ${s.done ? T.matcha : s.active ? T.shu : T.hairline}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.done && Icon.check('#fff', 10)}
              {s.active && <div style={{ width: 5, height: 5, borderRadius: 3, background: '#fff' }}/>}
            </div>
            <span style={{ flex: 1 }}>{s.t}</span>
            {s.active && <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted }}>···</span>}
          </div>
        ))}
      </div>

      {/* progress */}
      <div style={{ position: 'absolute', left: 32, right: 32, bottom: SAFE_BOT + 30 }}>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(31,26,18,0.10)', overflow: 'hidden' }}>
          <div style={{ width: '52%', height: '100%', background: T.shu, borderRadius: 2 }}/>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, fontFamily: T.gothic, color: T.sumiMuted, textAlign: 'center', letterSpacing: 1 }}>
          約 12 秒で 3 案到着します
        </div>
      </div>
    </Phone>
  );
}

// ===================================================================
// 04 · Tap3 — 候補3案 (縦スワイプの大判カードスタック)
// ===================================================================
function CandidateCard({ kind, title, concept, tags, pizza, note }) {
  return (
    <div style={{
      width: '100%',
      background: T.kinari, borderRadius: 22,
      boxShadow: '0 14px 36px rgba(31,26,18,0.14), 0 2px 6px rgba(31,26,18,0.06)',
      border: `1px solid ${T.hairline}`, overflow: 'hidden',
    }}>
      <div style={{ height: 180, background: 'linear-gradient(180deg, #F2E1C7 0%, #E8D2A7 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {pizza}
        <div style={{ position: 'absolute', top: 14, left: 14 }}>
          <StrategySeal kind={kind} size={50}/>
        </div>
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 20, fontWeight: 600, color: T.sumi, lineHeight: 1.25 }}>{title}</div>
        <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 6, lineHeight: 1.6 }}>{concept}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
          {tags.map((t, i) => <Chip key={i} tone={t.tone} size="sm">{t.label}</Chip>)}
        </div>
        {note && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: 'rgba(220,138,42,0.10)',
            border: '1px dashed rgba(220,138,42,0.4)', display: 'flex', gap: 8 }}>
            {Icon.sparkle(T.yamabuki, 12)}
            <div style={{ flex: 1, fontSize: 11, color: '#7A4C16', lineHeight: 1.55 }}>{note}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenCandidates() {
  return (
    <Phone>
      <div style={{ height: SAFE_TOP }} />

      {/* top bar */}
      <div style={{ padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.sumiSoft }}>
          {Icon.chev('left', T.sumiSoft, 14)}
          <span style={{ fontFamily: T.gothic, fontWeight: 600 }}>食材へ戻る</span>
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.sumiMuted, letterSpacing: 2 }}>1 / 3</div>
      </div>

      {/* title */}
      <div style={{ padding: '12px 24px 6px' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 4 }}>あなたへの新提案</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 4 }}>
          せり × 牡蠣 × モッツァレラ
        </div>
        <div style={{ fontSize: 11, color: T.sumiMuted, marginTop: 4 }}>
          上から順に眺めて3案を見比べる
        </div>
      </div>

      {/* vertical scroll list of 3 cards */}
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CandidateCard
          kind="exploit"
          title="松島牡蠣と仙台せりの春一枚"
          concept="高評価の組合せをそのまま正面から。今夜の安全策。"
          tags={[
            { label: '前菜', tone: 'default' },
            { label: '春', tone: 'matcha' },
            { label: '辛口ワイン◎', tone: 'shu' },
          ]}
          pizza={Pizzas.seriOyster(170)}
          note="前回★4.5「牡蠣の旨味が主役」のフィードバックを継承"
        />
        <CandidateCard
          kind="tune"
          title="牡蠣のクリーム、せりは仕上げに"
          concept="前回の塩味のつよさを一段引いて、香りで攻める。"
          tags={[{ label: '#王道+α', tone: 'yamabuki' }, { label: '#塩味を改善', tone: 'yamabuki' }]}
          pizza={Pizzas.oysterClassic(160)}
        />
        <CandidateCard
          kind="explore"
          title="春霞、せりと牡蠣の余白"
          concept="あえて主役を一つに絞らず、土地の呼吸を一枚に。"
          tags={[{ label: '#発散', tone: 'ai' }, { label: '#意外性', tone: 'ai' }]}
          pizza={Pizzas.exploreMix(160)}
        />
      </div>

      {/* related past */}
      <div style={{ padding: '6px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: T.mincho, fontSize: 12, color: T.sumi, letterSpacing: 2 }}>関連する過去のレシピ</span>
          <span style={{ fontSize: 10, color: T.sumiMuted }}>全 12 件</span>
        </div>
        <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
          {[
            { t: '牡蠣ピザ', s: '2025.12', r: 4.5 },
            { t: 'せりピザ', s: '2025.10', r: 3.0 },
            { t: '春パプリカ', s: '2025.04', r: 4.0 },
          ].map((p, i) => (
            <div key={i} style={{ flex: '0 0 auto', width: 110, padding: 10, borderRadius: 12,
              background: T.kinari, border: `1px solid ${T.hairline}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: T.washiDeep,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11 }}>{Pizzas.oysterClassic(22)}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.sumi, fontFamily: T.mincho }}>{p.t}</div>
              <div style={{ fontSize: 9, color: T.sumiMuted, marginTop: 2, fontFamily: T.mono }}>{p.s}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
                {Icon.star(true, T.yamabuki, 10)}
                <span style={{ fontSize: 10, color: T.sumiSoft, fontWeight: 600 }}>{p.r}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* footer actions */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: SAFE_BOT + 6, display: 'flex', gap: 8 }}>
        <ShuButton ghost small><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Icon.refresh(T.sumi, 14)}もう一度ふる</span></ShuButton>
        <ShuButton ghost small><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>食材を変える</span></ShuButton>
      </div>
    </Phone>
  );
}

// ===================================================================
// 05 · Detail — フルレシピ + ストーリー + 画像
// ===================================================================
function ScreenDetail() {
  return (
    <Phone>
      {/* hero image */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 340,
        background: 'radial-gradient(80% 70% at 50% 40%, #F2E1C7 0%, #C98947 100%)' }}>
        {/* status bar overlay area: transparent */}
        <div style={{ position: 'absolute', top: 80, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.35))' }}>
            {Pizzas.seriOyster(260)}
          </div>
        </div>
        {/* back button overlay */}
        <div style={{ position: 'absolute', top: SAFE_TOP - 2, left: 16, width: 36, height: 36, borderRadius: 18,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon.chev('left', T.sumi, 14)}
        </div>
        <div style={{ position: 'absolute', top: SAFE_TOP - 2, right: 16, display: 'flex', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.heart(false, T.sumi, 16)}
          </div>
        </div>
        {/* mincho strategy stamp */}
        <div style={{ position: 'absolute', top: SAFE_TOP + 8, right: 16 }}>
          <StrategySeal kind="exploit" size={48}/>
        </div>
      </div>

      {/* sheet */}
      <div style={{ position: 'absolute', top: 312, left: 0, right: 0, bottom: 0,
        background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
        borderRadius: '24px 24px 0 0', padding: '20px 24px 100px', overflow: 'hidden' }}>

        <div style={{ width: 38, height: 4, borderRadius: 2, background: T.hairline, margin: '0 auto 14px' }}/>

        <div style={{ fontFamily: T.mincho, fontSize: 10, color: T.shu, letterSpacing: 4 }}>春 · 前菜の一枚</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 6, lineHeight: 1.3 }}>
          松島牡蠣と仙台せりの<br/>春一枚
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 12, fontFamily: T.mono, fontSize: 11, color: T.sumiSoft }}>
          <span>⏱ 35 分</span><span>·</span><span>🔥 260℃ / 8 分</span><span>·</span><span>👥 4 人前</span>
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: T.kinari,
          border: `1px solid ${T.hairline}` }}>
          <div style={{ fontFamily: T.mincho, fontSize: 12, color: T.sumi, letterSpacing: 2, marginBottom: 8 }}>素材</div>
          {[
            ['せり (名取・三角芦原)', '1束 ≒ 60g'],
            ['牡蠣 (松島湾・むき身)', '200g'],
            ['モッツァレラ (蔵王酪農)', '180g'],
            ['ピザ生地 (薄手・直径25cm)', '2枚'],
            ['オリーブオイル / 黒胡椒', '適量'],
          ].map(([n, q], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
              borderTop: i ? `1px dashed ${T.hairline}` : 'none', fontSize: 12, fontFamily: T.gothic }}>
              <span style={{ color: T.sumi }}>{n}</span>
              <span style={{ color: T.sumiSoft, fontFamily: T.mono }}>{q}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: T.mincho, fontSize: 12, color: T.sumi, letterSpacing: 2, marginBottom: 8 }}>ストーリー</div>
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(220,138,42,0.08)',
            borderLeft: `3px solid ${T.yamabuki}`, fontSize: 12.5, lineHeight: 1.85, color: T.sumiSoft,
            fontFamily: T.mincho }}>
            「松島湾の牡蠣は、雪解け水と山の養分が落ち合う春先にいちばん甘くなります。仙台せりは根まで食べる文化で、香りの源泉は実は根の方に。<br/>—— この一枚は、海の旨味と山の香りを一口で結ぶつもりで組みました。」
          </div>
        </div>

        {/* feedback CTA */}
        <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14,
          background: T.sumi, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          {Icon.camera('#fff', 18)}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.gothic }}>作ってみたを記録する</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>次回の AI 提案がもっとあなた色に</div>
          </div>
          {Icon.chev('right', '#fff', 14)}
        </div>
      </div>
    </Phone>
  );
}

// ===================================================================
// 06 · Feedback — チップ多選択中心
// ===================================================================
function ScreenFeedback() {
  const Section = ({ title, chips, tone, jp }) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: T.mincho, fontSize: 13, color: T.sumi, letterSpacing: 2, fontWeight: 600 }}>{jp}</span>
        <span style={{ fontFamily: T.gothic, fontSize: 9, color: T.sumiMuted, letterSpacing: 1 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chips.map((c, i) => (
          <Chip key={i} tone={c.sel ? tone : 'ghost'} selected={c.sel}>{c.t}</Chip>
        ))}
      </div>
    </div>
  );
  return (
    <Phone>
      <div style={{ height: SAFE_TOP }} />
      <div style={{ padding: '4px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.sumiSoft }}>
          {Icon.chev('left', T.sumiSoft, 14)}<span>戻る</span>
        </div>
        <span style={{ fontFamily: T.gothic, fontSize: 12, color: T.shu, fontWeight: 700 }}>下書きを保存</span>
      </div>

      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 4 }}>作ってみた</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 4, lineHeight: 1.3 }}>
          今夜の一枚は、<br/>どうでしたか？
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* mini hero */}
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: 14, background: T.washiDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {Pizzas.seriOyster(76)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sumi, fontFamily: T.mincho }}>松島牡蠣と仙台せりの春一枚</div>
            <div style={{ fontSize: 10, color: T.sumiMuted, marginTop: 2 }}>2026.05.12 · ゲスト 4 名</div>
            <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
              {[1,2,3,4,5].map(i => <span key={i}>{Icon.star(i <= 5, T.yamabuki, 18)}</span>)}
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: T.kinari,
            border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.camera(T.sumiSoft, 18)}
          </div>
        </div>

        {/* axes */}
        <div style={{ marginTop: 18, padding: 12, borderRadius: 14, background: T.kinari,
          border: `1px solid ${T.hairline}` }}>
          <div style={{ fontFamily: T.mincho, fontSize: 12, color: T.sumi, letterSpacing: 2, marginBottom: 10 }}>観点別評価</div>
          {[['味', 5], ['見た目', 4], ['ストーリー', 5], ['また作りたい', 4]].map(([n, v], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <span style={{ width: 88, fontSize: 11, color: T.sumiSoft, fontFamily: T.gothic }}>{n}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(31,26,18,0.06)' }}>
                <div style={{ width: `${v * 20}%`, height: '100%', borderRadius: 3, background: T.shu }}/>
              </div>
              <span style={{ width: 18, textAlign: 'right', fontSize: 11, color: T.sumi, fontFamily: T.mono }}>{v}</span>
            </div>
          ))}
        </div>

        <Section jp="効いた点" title="WHAT WORKED" tone="matcha" chips={[
          { t: '食材の組合せ', sel: true },
          { t: 'ストーリーがウケた', sel: true },
          { t: '焼き加減', sel: false },
          { t: '見た目', sel: true },
          { t: '量', sel: false },
          { t: 'ワインとの相性', sel: false },
        ]}/>

        <Section jp="次は調整したい" title="WHAT TO TUNE" tone="yamabuki" chips={[
          { t: '塩味', sel: true },
          { t: '焼成時間', sel: false },
          { t: '生地の厚さ', sel: false },
          { t: 'トッピング量', sel: false },
          { t: '酸味', sel: false },
          { t: '油分', sel: false },
        ]}/>

        <Section jp="ゲストの反応" title="GUEST VIBE" tone="shu" chips={[
          { t: '会話が弾んだ', sel: true },
          { t: '驚かれた', sel: true },
          { t: 'おかわり続出', sel: false },
          { t: '写真に撮られた', sel: true },
          { t: '地元トークに発展', sel: true },
        ]}/>
      </div>

      {/* save bar */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: SAFE_BOT + 8 }}>
        <ShuButton>
          {Icon.check('#fff', 14)} 記録して次の提案に活かす
        </ShuButton>
      </div>
    </Phone>
  );
}

// ===================================================================
// 07 · Saved — 私の地元ピザ帳
// ===================================================================
function ScreenSaved() {
  const recipes = [
    { jp: '春霞、せりと牡蠣の余白', date: '2026.05.12', r: 4.8, local: '宮城・仙台', kind: 'explore', pizza: Pizzas.exploreMix },
    { jp: '牡蠣のクリーム、せりは仕上げに', date: '2026.05.04', r: 4.2, local: '宮城・仙台', kind: 'tune', pizza: Pizzas.oysterClassic },
    { jp: '亘理パプリカと蔵王モッツァ', date: '2026.04.21', r: 4.5, local: '宮城・亘理', kind: 'exploit', pizza: Pizzas.paprikaMozza },
    { jp: '名取せり、根まで一枚', date: '2026.03.18', r: 3.6, local: '宮城・名取', kind: 'tune', pizza: Pizzas.seriClassic },
  ];
  return (
    <Phone>
      <div style={{ height: SAFE_TOP }} />
      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 4 }}>あなたのピザ帳</div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: T.kinari,
            border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.search(T.sumiSoft, 16)}
          </div>
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 28, fontWeight: 600, color: T.sumi, marginTop: 6, letterSpacing: 0.5 }}>
          地元ピザ帳
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingBottom: 4 }}>
          <Stat label="保存" value="24"/>
          <div style={{ width: 1, background: T.hairline }}/>
          <Stat label="作った" value="12"/>
          <div style={{ width: 1, background: T.hairline }}/>
          <Stat label="平均★" value="4.3"/>
        </div>
      </div>

      {/* filter row */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 24px 0', overflow: 'hidden' }}>
        {['すべて', '宮城', '東京', '長野', 'お気に入り'].map((t, i) => (
          <Chip key={i} selected={i === 0} size="sm">{t}</Chip>
        ))}
      </div>

      {/* list */}
      <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recipes.map((r, i) => (
          <div key={i} style={{ background: T.kinari, borderRadius: 16, padding: 12,
            border: `1px solid ${T.hairline}`, display: 'flex', gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: T.washiDeep, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.pizza(64)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: T.mincho, fontSize: 9, color: {exploit: T.exploitInk, tune: T.tuneInk, explore: T.exploreInk}[r.kind],
                  background: {exploit: T.exploitBg, tune: T.tuneBg, explore: T.exploreBg}[r.kind],
                  padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                  {{ exploit: '王道', tune: '一歩外す', explore: '大冒険' }[r.kind]}
                </span>
                <span style={{ fontSize: 9, color: T.sumiMuted, fontFamily: T.mono }}>{r.date}</span>
              </div>
              <div style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi, marginTop: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.jp}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 10, color: T.sumiSoft, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {Icon.pin(T.sumiMuted, 10)}{r.local}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {Icon.star(true, T.yamabuki, 11)}
                  <span style={{ fontSize: 10, color: T.sumi, fontWeight: 600, fontFamily: T.mono }}>{r.r}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* tab bar */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: SAFE_BOT + 6, height: 60, borderRadius: 30,
        background: T.sumi, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 8px',
        boxShadow: '0 10px 30px rgba(31,26,18,0.3)' }}>
        {[
          { l: 'つくる', icon: Icon.sparkle('#fff', 16), active: false },
          { l: 'ピザ帳', icon: <div style={{ width: 16, height: 16, borderRadius: 8, background: T.shu }}/>, active: true },
          { l: '振り返り', icon: Icon.refresh('#fff', 16), active: false },
        ].map((t, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '8px 0', opacity: t.active ? 1 : 0.5 }}>
            {t.icon}
            <span style={{ fontSize: 10, fontWeight: t.active ? 700 : 500 }}>{t.l}</span>
          </div>
        ))}
      </div>
    </Phone>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: T.sumiMuted, marginTop: 4, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

Object.assign(window, { ScreenLocal, ScreenIngredients, ScreenLoading, ScreenCandidates, ScreenDetail, ScreenFeedback, ScreenSaved });
