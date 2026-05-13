// prototype-app.jsx — interactive MakeLocalPizzaRecipe prototype
// State machine: local → ingredients → loading → candidates → detail → feedback → saved

const { useState, useEffect, useRef } = React;

// ── Data ────────────────────────────────────────────────────────────
const PREFS = [
  // 北海道
  { id: 'hokkaido', jp: '北海道',   kanji: '道', region: '北海道', note: '札幌 / 函館 / 知床' },
  // 東北
  { id: 'aomori',   jp: '青森県',   kanji: '青', region: '東北',  note: 'りんご / 大間' },
  { id: 'iwate',    jp: '岩手県',   kanji: '岩', region: '東北',  note: '前沢 / 三陸' },
  { id: 'miyagi',   jp: '宮城県',   kanji: '宮', region: '東北',  note: '仙台 / 松島 / 牡鹿', hot: true },
  { id: 'akita',    jp: '秋田県',   kanji: '秋', region: '東北',  note: '比内 / 男鹿' },
  { id: 'yamagata', jp: '山形県',   kanji: '山', region: '東北',  note: '庄内 / さくらんぼ' },
  { id: 'fukushima',jp: '福島県',   kanji: '福', region: '東北',  note: '会津 / 浜通り' },
  // 関東
  { id: 'ibaraki',  jp: '茨城県',   kanji: '茨', region: '関東',  note: '常陸 / 水戸' },
  { id: 'tochigi',  jp: '栃木県',   kanji: '栃', region: '関東',  note: '宇都宮 / 日光' },
  { id: 'gunma',    jp: '群馬県',   kanji: '群', region: '関東',  note: '前橋 / 嬬恋' },
  { id: 'saitama',  jp: '埼玉県',   kanji: '埼', region: '関東',  note: '川越 / 秩父' },
  { id: 'chiba',    jp: '千葉県',   kanji: '千', region: '関東',  note: '房総 / 銚子' },
  { id: 'tokyo',    jp: '東京都',   kanji: '東', region: '関東',  note: '23区 / 多摩 / 島嶼' },
  { id: 'kanagawa', jp: '神奈川県', kanji: '神', region: '関東',  note: '横浜 / 三浦' },
  // 中部
  { id: 'niigata',  jp: '新潟県',   kanji: '新', region: '中部',  note: '魚沼 / 佐渡' },
  { id: 'toyama',   jp: '富山県',   kanji: '富', region: '中部',  note: '富山湾 / 立山' },
  { id: 'ishikawa', jp: '石川県',   kanji: '石', region: '中部',  note: '金沢 / 能登' },
  { id: 'fukui',    jp: '福井県',   kanji: '井', region: '中部',  note: '若狭 / 越前' },
  { id: 'yamanashi',jp: '山梨県',   kanji: '梨', region: '中部',  note: '甲府 / 富士' },
  { id: 'nagano',   jp: '長野県',   kanji: '長', region: '中部',  note: '信州 / 諏訪' },
  { id: 'gifu',     jp: '岐阜県',   kanji: '岐', region: '中部',  note: '飛騨 / 美濃' },
  { id: 'shizuoka', jp: '静岡県',   kanji: '静', region: '中部',  note: '駿河 / 伊豆' },
  { id: 'aichi',    jp: '愛知県',   kanji: '愛', region: '中部',  note: '名古屋 / 三河' },
  // 関西
  { id: 'mie',      jp: '三重県',   kanji: '三', region: '関西',  note: '伊勢 / 志摩' },
  { id: 'shiga',    jp: '滋賀県',   kanji: '滋', region: '関西',  note: '近江 / 琵琶湖' },
  { id: 'kyoto',    jp: '京都府',   kanji: '京', region: '関西',  note: '丹波 / 宇治' },
  { id: 'osaka',    jp: '大阪府',   kanji: '阪', region: '関西',  note: '大阪 / 泉州' },
  { id: 'hyogo',    jp: '兵庫県',   kanji: '兵', region: '関西',  note: '神戸 / 但馬' },
  { id: 'nara',     jp: '奈良県',   kanji: '奈', region: '関西',  note: '奈良 / 吉野' },
  { id: 'wakayama', jp: '和歌山県', kanji: '和', region: '関西',  note: '紀州 / 熊野' },
  // 中国
  { id: 'tottori',  jp: '鳥取県',   kanji: '鳥', region: '中国',  note: '鳥取 / 大山' },
  { id: 'shimane',  jp: '島根県',   kanji: '島', region: '中国',  note: '出雲 / 隠岐' },
  { id: 'okayama',  jp: '岡山県',   kanji: '岡', region: '中国',  note: '備前 / 美作' },
  { id: 'hiroshima',jp: '広島県',   kanji: '広', region: '中国',  note: '広島 / 尾道' },
  { id: 'yamaguchi',jp: '山口県',   kanji: '口', region: '中国',  note: '萩 / 下関' },
  // 四国
  { id: 'tokushima',jp: '徳島県',   kanji: '徳', region: '四国',  note: '阿波 / 鳴門' },
  { id: 'kagawa',   jp: '香川県',   kanji: '香', region: '四国',  note: '讃岐 / 小豆島' },
  { id: 'ehime',    jp: '愛媛県',   kanji: '媛', region: '四国',  note: '松山 / 宇和島' },
  { id: 'kochi',    jp: '高知県',   kanji: '高', region: '四国',  note: '土佐 / 室戸' },
  // 九州
  { id: 'fukuoka',  jp: '福岡県',   kanji: '福', region: '九州',  note: '博多 / 糸島' },
  { id: 'saga',     jp: '佐賀県',   kanji: '佐', region: '九州',  note: '有明 / 玄海' },
  { id: 'nagasaki', jp: '長崎県',   kanji: '崎', region: '九州',  note: '長崎 / 五島' },
  { id: 'kumamoto', jp: '熊本県',   kanji: '熊', region: '九州',  note: '阿蘇 / 天草' },
  { id: 'oita',     jp: '大分県',   kanji: '分', region: '九州',  note: '別府 / 由布' },
  { id: 'miyazaki', jp: '宮崎県',   kanji: '崎', region: '九州',  note: '日向 / 都城' },
  { id: 'kagoshima',jp: '鹿児島県', kanji: '鹿', region: '九州',  note: '薩摩 / 屋久島' },
  // 沖縄
  { id: 'okinawa',  jp: '沖縄県',   kanji: '沖', region: '沖縄',  note: '本島 / 八重山' },
];
const REGION_ORDER = ['北海道', '東北', '関東', '中部', '関西', '中国', '四国', '九州', '沖縄'];

const INGREDIENTS = {
  '春': [
    { id: 'seri',     jp: 'せり',         note: '名取・春の七草', dot: '#3F5028', season: '春', cat: '野菜' },
    { id: 'paprika',  jp: 'パプリカ',     note: '宮城産・全国2位', dot: '#E07A2B', season: '春', cat: '野菜' },
    { id: 'tsubu',    jp: '蕾菜',         note: '春芽の苦み',     dot: '#5A6B2E', season: '春', cat: '野菜' },
    { id: 'mozza',    jp: '手作りモッツァ', note: '蔵王・牧成舎', dot: '#F0E4B8', season: '通年', cat: 'チーズ' },
  ],
  '夏': [
    { id: 'tomato',   jp: '完熟トマト',   note: 'JA仙台', dot: '#C8412A', season: '夏', cat: '野菜' },
    { id: 'eggplant', jp: '長茄子',       note: '仙台長茄子', dot: '#4A2A57', season: '夏', cat: '野菜' },
    { id: 'edamame',  jp: 'だだちゃ豆',   note: '東北の夏', dot: '#7B8A3A', season: '夏', cat: '野菜' },
  ],
  '秋': [
    { id: 'kome',     jp: 'ササニシキ',   note: '宮城米',  dot: '#E8D8A8', season: '秋', cat: '穀物' },
    { id: 'kabocha',  jp: '坊ちゃん南瓜', note: '小ぶり',  dot: '#D49538', season: '秋', cat: '野菜' },
    { id: 'kinoko',   jp: '原木椎茸',     note: '気仙沼',  dot: '#6B4A2A', season: '秋', cat: '野菜' },
  ],
  '冬': [
    { id: 'oyster',   jp: '松島牡蠣',     note: '東松島・身入り抜群', dot: '#7A6952', season: '冬', cat: '魚介', hot: true },
    { id: 'hokki',    jp: '北寄貝',       note: '亘理',   dot: '#B86A5A', season: '冬', cat: '魚介' },
    { id: 'tara',     jp: '真鱈',         note: '石巻',   dot: '#E8DBCA', season: '冬', cat: '魚介' },
  ],
};

const ALL_INGREDIENTS = Object.values(INGREDIENTS).flat();

// Three candidate recipe templates, filled by selected ingredients
function buildCandidates(selectedIds, hasHistory) {
  const sel = selectedIds.map(id => ALL_INGREDIENTS.find(x => x.id === id)).filter(Boolean);
  const names = sel.map(s => s.jp).join('・');
  return [
    {
      kind: 'exploit',
      title: `${sel[0]?.jp ?? '地元'}と${sel[1]?.jp ?? 'モッツァレラ'}の春一枚`,
      concept: '前回ウケた「素材を主役に・余韻を残す」を踏襲した王道。',
      tags: ['前回◎','ホスピタリティ','45分'],
      pizza: 'seriOyster',
      note: hasHistory ? '前回★4.5「松島牡蠣×せり」の方向性を踏襲' : '王道の組合せで失敗しない',
    },
    {
      kind: 'tune',
      title: `${sel[0]?.jp ?? '素材'}の和ハーブ仕立て`,
      concept: '前回 "塩味" の指摘を反映し、香りで甘さを引き出す。',
      tags: ['塩 -10%','大葉・山椒','35分'],
      pizza: 'paprikaMozza',
      note: hasHistory ? '"塩味" 改善点を反映、香りで補強' : '少しだけ攻める一枚',
    },
    {
      kind: 'explore',
      title: `${sel[0]?.jp ?? '地元'}と日本酒粕の白いピザ`,
      concept: 'トマトソースを酒粕クリームに置換した発散案。',
      tags: ['過去履歴外','日本酒との相性','50分'],
      pizza: 'exploreMix',
      note: '今までにない方向 — ゲストへの驚き',
    },
  ];
}

// ── Season / category icons ─────────────────────────────────────────
const SeasonIcon = {
  '春': (c = '#C8412A', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill={c}>
      {[0,1,2,3,4].map(i => {
        const a = (i * 72 - 90) * Math.PI / 180;
        const x = 8 + Math.cos(a) * 4.2, y = 8 + Math.sin(a) * 4.2;
        return <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.2" transform={`rotate(${i*72} ${x} ${y})`}/>;
      })}
      <circle cx="8" cy="8" r="1.4" fill="#DC8A2A"/>
    </svg>
  ),
  '夏': (c = '#DC8A2A', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" fill={c}/>
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = i * 45 * Math.PI / 180;
        const x1 = 8 + Math.cos(a) * 5, y1 = 8 + Math.sin(a) * 5;
        const x2 = 8 + Math.cos(a) * 7, y2 = 8 + Math.sin(a) * 7;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>;
      })}
    </svg>
  ),
  '秋': (c = '#9F3220', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill={c}>
      <path d="M8 2c-2 2-3 3-3 5 0 1 1 2 2 2 0 1-1 1-1 2l2 1 2-1c0-1-1-1-1-2 1 0 2-1 2-2 0-2-1-3-3-5z"/>
      <path d="M8 11l0 4" stroke={c} strokeWidth="1"/>
    </svg>
  ),
  '冬': (c = '#3E5670', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14"/>
      <line x1="2" y1="8" x2="14" y2="8"/>
      <line x1="3.8" y1="3.8" x2="12.2" y2="12.2"/>
      <line x1="12.2" y1="3.8" x2="3.8" y2="12.2"/>
    </svg>
  ),
  '通年': (c = '#928571', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4">
      <circle cx="8" cy="8" r="5.5"/>
      <path d="M8 4.5v3.5l2.5 1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const CatIcon = {
  '野菜': (c = '#607744', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M8 14c0-3 2-5 5-5-1 3-2 5-5 5z" fill={c}/>
      <path d="M8 14c0-3-2-5-5-5 1 3 2 5 5 5z" fill={c} opacity="0.75"/>
      <path d="M8 14V5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M8 5c0-2 1-3 2-3-0.2 1.6-0.9 2.6-2 3z" fill={c}/>
    </svg>
  ),
  '魚介': (c = '#3E5670', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M3 8c1.5-3 4.5-4 7-4 1.5 0 3 1 3 1l-2 3 2 3s-1.5 1-3 1c-2.5 0-5.5-1-7-4z" fill={c}/>
      <circle cx="10" cy="7" r="0.8" fill="#FBF7ED"/>
      <path d="M3 8l-1.5-1.5M3 8l-1.5 1.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  'チーズ': (c = '#DC8A2A', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M2 11l5-7 7 4-1 4z" fill={c} stroke={c} strokeWidth="0.8" strokeLinejoin="round"/>
      <circle cx="7" cy="9" r="0.9" fill="#FBF7ED"/>
      <circle cx="10" cy="8" r="0.7" fill="#FBF7ED"/>
      <circle cx="9" cy="10.5" r="0.6" fill="#FBF7ED"/>
    </svg>
  ),
  '穀物': (c = '#BE934A', s = 14) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14"/>
      <path d="M8 5c-1.5-0.5-2.5 0-3 1.5 1.5 0.5 2.5 0 3-1.5z" fill={c}/>
      <path d="M8 5c1.5-0.5 2.5 0 3 1.5-1.5 0.5-2.5 0-3-1.5z" fill={c}/>
      <path d="M8 8.5c-1.5-0.5-2.5 0-3 1.5 1.5 0.5 2.5 0 3-1.5z" fill={c}/>
      <path d="M8 8.5c1.5-0.5 2.5 0 3 1.5-1.5 0.5-2.5 0-3-1.5z" fill={c}/>
    </svg>
  ),
};

function MiniBadge({ icon, label, dim }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 6px 2px 4px', borderRadius: 999,
      background: dim ? 'rgba(251,247,237,0.12)' : 'rgba(31,26,18,0.05)',
      fontSize: 9, color: dim ? 'rgba(251,247,237,0.7)' : T.sumiSoft,
      fontFamily: T.gothic, fontWeight: 600, letterSpacing: 0.5,
    }}>{icon}{label}</span>
  );
}

// ── Tap handle (button-ish div with active state) ───────────────────
function Tap({ children, onPress, style, active }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPress?.()}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.12s ease, opacity 0.15s',
        ...style,
        ...(active ? { transform: 'scale(0.98)' } : {}),
      }}
    >{children}</div>
  );
}

// Shared button with press feedback via Tap
function PrimaryBtn({ children, onPress, disabled, style }) {
  return (
    <Tap onPress={!disabled ? onPress : undefined} style={{
      height: 54, borderRadius: 999,
      background: disabled ? '#D8C9AE' : T.shu, color: '#fff',
      boxShadow: disabled ? 'none' : '0 8px 22px rgba(200,65,42,0.34), inset 0 -2px 0 rgba(0,0,0,0.14)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: T.gothic, fontWeight: 700, fontSize: 15, letterSpacing: 0.6,
      opacity: disabled ? 0.7 : 1, ...style,
    }}>{children}</Tap>
  );
}
function GhostBtn({ children, onPress, style }) {
  return (
    <Tap onPress={onPress} style={{
      height: 48, borderRadius: 999,
      background: 'transparent', border: `1px solid ${T.hairline}`,
      color: T.sumi, fontFamily: T.gothic, fontWeight: 600, fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...style,
    }}>{children}</Tap>
  );
}

// ── Phone shell ─────────────────────────────────────────────────────
function Phone({ children, bg = T.washi, dark = false }) {
  return (
    <IOSDevice width={393} height={852} dark={dark}>
      <div style={{
        position: 'absolute', inset: 0, background: bg,
        backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
        fontFamily: T.gothic, color: T.sumi, overflow: 'hidden',
      }}>{children}</div>
    </IOSDevice>
  );
}

// ===================================================================
// Screen 01 · Local (initial onboarding)
// ===================================================================
function LocalScreen({ onPick }) {
  const [picked, setPicked] = useState(null);
  const scrollRef = useRef(null);
  const regionRefs = useRef({});
  const [activeRegion, setActiveRegion] = useState('北海道');

  // Group prefs by region in canonical order
  const grouped = REGION_ORDER.map(r => ({ region: r, items: PREFS.filter(p => p.region === r) }));

  function jumpTo(region) {
    const el = regionRefs.current[region];
    const root = scrollRef.current;
    if (el && root) {
      root.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    }
  }

  function onScroll() {
    const root = scrollRef.current;
    if (!root) return;
    const top = root.scrollTop;
    // find region whose offsetTop is the largest one not exceeding top + threshold
    let cur = REGION_ORDER[0];
    for (const r of REGION_ORDER) {
      const el = regionRefs.current[r];
      if (el && el.offsetTop <= top + 60) cur = r;
    }
    if (cur !== activeRegion) setActiveRegion(cur);
  }

  function handlePick(p) {
    setPicked(p.id);
    // small visual confirm, then advance
    setTimeout(() => onPick(p), 220);
  }

  return (
    <Phone>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '12px 24px 6px' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 6 }}>地元 × ピザ</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, lineHeight: 1.35, marginTop: 4, letterSpacing: 0.5 }}>
          まずは、<br/>あなたの地元を。
        </div>
        <div style={{ fontSize: 11, color: T.sumiSoft, marginTop: 6, lineHeight: 1.6 }}>
          タップでそのまま次の食材選びへ。あとから変更できます。
        </div>
      </div>

      {/* region quick-jump rail */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px 4px', overflowX: 'auto',
        borderBottom: `1px solid ${T.hairline}` }}>
        {REGION_ORDER.map(r => (
          <Tap key={r} onPress={() => jumpTo(r)} style={{
            padding: '5px 11px', borderRadius: 999,
            background: r === activeRegion ? T.sumi : 'transparent',
            color: r === activeRegion ? T.kinari : T.sumiSoft,
            fontFamily: T.gothic, fontSize: 11, fontWeight: 600,
            border: r === activeRegion ? 'none' : `1px solid ${T.hairline}`,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{r}</Tap>
        ))}
      </div>

      {/* scrollable list */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ height: 'calc(100% - 240px)', overflowY: 'auto', padding: '0 16px 24px' }}
      >
        {grouped.map(g => (
          <div key={g.region} ref={el => { regionRefs.current[g.region] = el; }} style={{ paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, paddingLeft: 2 }}>
              <span style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi, letterSpacing: 3 }}>{g.region}</span>
              <span style={{ flex: 1, height: 1, background: T.hairline }}/>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted }}>{g.items.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {g.items.map(p => {
                const sel = picked === p.id;
                return (
                  <Tap key={p.id} onPress={() => handlePick(p)}>
                    <div style={{
                      position: 'relative', padding: 12, borderRadius: 12,
                      background: sel ? T.sumi : T.kinari,
                      color: sel ? T.kinari : T.sumi,
                      border: `1px solid ${sel ? T.sumi : T.hairline}`,
                      boxShadow: sel ? '0 8px 22px rgba(31,26,18,0.18)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                      {p.hot && !sel && (
                        <div style={{ position: 'absolute', top: 6, right: 6, padding: '1px 5px',
                          background: T.shu, color: '#fff', borderRadius: 3, fontSize: 8, fontWeight: 700 }}>原体験</div>
                      )}
                      <div style={{ fontFamily: T.mincho, fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{p.kanji}</div>
                      <div style={{ marginTop: 6, fontFamily: T.mincho, fontWeight: 600, fontSize: 13 }}>{p.jp}</div>
                      <div style={{ fontSize: 9, opacity: 0.65, marginTop: 3 }}>{p.note}</div>
                      {sel && (
                        <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20,
                          borderRadius: 10, background: T.shu, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {Icon.check('#fff', 11)}
                        </div>
                      )}
                    </div>
                  </Tap>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Phone>
  );
}

// ===================================================================
// Screen 02 · Ingredients (Tap2)
// ===================================================================
function IngredientsScreen({ locale, onChangeLocale, onNext }) {
  const [tab, setTab] = useState('春');
  const [selected, setSelected] = useState(['seri', 'oyster', 'mozza']);
  const tabs = ['すべて', '春', '夏', '秋', '冬'];
  const cats = ['野菜', '魚介', 'チーズ', '穀物'];
  const [cat, setCat] = useState(null);

  let pool = tab === 'すべて' ? ALL_INGREDIENTS : INGREDIENTS[tab] ?? [];
  if (cat) pool = pool.filter(x => x.cat === cat);

  function toggle(id) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  return (
    <Phone>
      <div style={{ height: 54 }}/>
      {/* top: locale */}
      <div style={{ padding: '6px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tap onPress={onChangeLocale} style={{ display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999, background: T.kinari, border: `1px solid ${T.hairline}` }}>
          {Icon.pin(T.shu, 14)}
          <span style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi }}>{locale.jp}</span>
          {Icon.chev('down', T.sumiSoft, 12)}
        </Tap>
        <div style={{ fontFamily: T.mincho, fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>Tap 2 / 2</div>
      </div>

      <div style={{ padding: '14px 24px 4px' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, lineHeight: 1.3 }}>
          主役にしたい食材を<br/>1〜3つ。
        </div>
        <div style={{ fontSize: 11, color: T.sumiSoft, marginTop: 6 }}>選択中 <span style={{ color: T.shu, fontWeight: 700 }}>{selected.length}</span>/3</div>
      </div>

      {/* season tabs (with icons) */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 20px 0', alignItems: 'center' }}>
        {tabs.map(t => {
          const isSeason = t !== 'すべて';
          const on = t === tab;
          return (
            <Tap key={t} onPress={() => setTab(t)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 11px', borderRadius: 999,
              background: on ? T.sumi : 'transparent',
              color: on ? T.kinari : T.sumiSoft,
              fontFamily: isSeason ? T.mincho : T.gothic,
              fontSize: 12, fontWeight: 600,
              border: on ? 'none' : `1px solid ${T.hairline}`,
            }}>
              {isSeason && SeasonIcon[t]?.(on ? '#F2D9CC' : T.sumiSoft, 13)}
              <span>{t}</span>
            </Tap>
          );
        })}
      </div>
      {/* cat chips (with icons) */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 20px 0', overflowX: 'auto' }}>
        {cats.map(c => {
          const on = cat === c;
          return (
            <Tap key={c} onPress={() => setCat(on ? null : c)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 999,
              background: on ? T.shuPale : 'transparent',
              color: on ? T.shuDeep : T.sumiSoft,
              border: `1px solid ${on ? 'rgba(200,65,42,0.22)' : T.hairline}`,
              fontFamily: T.gothic, fontSize: 11, fontWeight: 600,
              flexShrink: 0,
            }}>
              {CatIcon[c]?.(on ? T.shuDeep : T.sumiSoft, 12)}
              <span>{c}</span>
            </Tap>
          );
        })}
      </div>

      {/* ingredient grid */}
      <div style={{ padding: '12px 16px 130px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        maxHeight: 'calc(100% - 380px)', overflowY: 'auto' }}>
        {pool.map(ing => {
          const sel = selected.includes(ing.id);
          const cap = !sel && selected.length >= 3;
          return (
            <Tap key={ing.id} onPress={() => !cap && toggle(ing.id)}>
              <div style={{
                position: 'relative', padding: 12, borderRadius: 14,
                background: sel ? T.sumi : T.kinari,
                color: sel ? T.kinari : T.sumi,
                border: `1px solid ${sel ? T.sumi : T.hairline}`,
                opacity: cap ? 0.4 : 1,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <MiniBadge
                    icon={SeasonIcon[ing.season]?.(sel ? '#F2D9CC' : undefined, 11)}
                    label={ing.season}
                    dim={sel}
                  />
                  <MiniBadge
                    icon={CatIcon[ing.cat]?.(sel ? '#DC8A2A' : undefined, 11)}
                    label={ing.cat}
                    dim={sel}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: ing.dot, border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }}/>
                  <span style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600 }}>{ing.jp}</span>
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>{ing.note}</div>
                {sel && (
                  <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20,
                    borderRadius: 10, background: T.shu, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icon.check('#fff', 11)}
                  </div>
                )}
              </div>
            </Tap>
          );
        })}
      </div>

      {/* bottom bar with selected ingredients pile */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(to bottom, rgba(242,233,214,0) 0%, rgba(242,233,214,0.98) 25%)',
        padding: '24px 20px 50px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {selected.map(id => {
            const ing = ALL_INGREDIENTS.find(x => x.id === id);
            return (
              <Tap key={id} onPress={() => toggle(id)}>
                <Chip tone="shu" icon={<span style={{ width: 8, height: 8, borderRadius: 4, background: ing.dot }}/>}>
                  {ing.jp} <span style={{ opacity: 0.5, marginLeft: 3 }}>×</span>
                </Chip>
              </Tap>
            );
          })}
        </div>
        <PrimaryBtn disabled={selected.length === 0} onPress={() => onNext(selected)}>
          AIに3案つくらせる {Icon.sparkle('#fff', 14)}
        </PrimaryBtn>
      </div>
    </Phone>
  );
}

// ===================================================================
// Screen 03 · Loading (pizza baking)
// ===================================================================
function LoadingScreen({ onDone }) {
  const [tick, setTick] = useState(0);
  const stages = [
    '🜲 食材データを取得中…',
    '🜂 季節と相性を判定…',
    '🜁 過去のフィードバックを参照…',
    '🜃 三軸の戦略で発想を分岐…',
    '✦ 候補3案を整えています…',
  ];
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => {
        if (t >= 100) { clearInterval(id); setTimeout(onDone, 280); return 100; }
        return t + 4;
      });
    }, 100);
    return () => clearInterval(id);
  }, [onDone]);
  const stageIdx = Math.min(stages.length - 1, Math.floor((tick / 100) * stages.length));
  // pizza bake progression: 0=raw → 0.5=cooking → 1=done
  const p = tick / 100;

  return (
    <Phone bg={T.washiDeep} dark={false}>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 6 }}>窯入れ中</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 8 }}>
          発想空間を、<br/>焼き上げています。
        </div>
      </div>

      {/* oven scene */}
      <div style={{ margin: '36px auto 0', width: 280, height: 220, position: 'relative' }}>
        {/* oven arch */}
        <svg width="280" height="220" viewBox="0 0 280 220" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="ovenglow" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor={`rgba(255,160,60,${0.3 + p * 0.5})`}/>
              <stop offset="60%" stopColor="rgba(200,65,42,0.15)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </radialGradient>
          </defs>
          {/* bricks */}
          <path d="M30 200 L30 110 Q30 30 140 30 Q250 30 250 110 L250 200 Z" fill="#1F1A12"/>
          <path d="M44 200 L44 115 Q44 44 140 44 Q236 44 236 115 L236 200 Z" fill="#3A2A18"/>
          {/* inside glow */}
          <ellipse cx="140" cy="155" rx="100" ry="45" fill="url(#ovenglow)"/>
          {/* hearth */}
          <rect x="60" y="178" width="160" height="14" rx="3" fill="#2A1810"/>
          {/* brick lines */}
          {[60, 100, 140, 180].map(y => (
            <g key={y} opacity="0.3">
              <line x1="44" y1={y} x2="236" y2={y} stroke="#1F1A12" strokeWidth="0.5"/>
            </g>
          ))}
        </svg>
        {/* pizza inside */}
        <div style={{ position: 'absolute', left: '50%', bottom: 64, transform: 'translateX(-50%)',
          filter: `brightness(${0.7 + p * 0.3})`, transition: 'all 0.3s' }}>
          <svg width="130" height="48" viewBox="0 0 130 48">
            {/* shadow */}
            <ellipse cx="65" cy="44" rx="55" ry="4" fill="#000" opacity="0.4"/>
            {/* crust ring */}
            <ellipse cx="65" cy="24" rx="56" ry="18" fill={`hsl(${28 - p * 8}, ${50 + p * 20}%, ${44 + p * 8}%)`}/>
            <ellipse cx="65" cy="22" rx="49" ry="14" fill={`hsl(${10 - p * 5}, ${60 + p * 15}%, ${36 + p * 6}%)`}/>
            {/* cheese blobs */}
            {[20, 40, 60, 80, 100].map((cx, i) => (
              <ellipse key={i} cx={cx} cy={22 + (i % 2) * 2} rx={5 + i % 2} ry={3} fill={`hsl(48, ${30 + p * 30}%, ${70 + p * 10}%)`} opacity={0.85}/>
            ))}
            {/* seri leaves emerging as it cooks */}
            {p > 0.4 && [30, 55, 80].map((cx, i) => (
              <ellipse key={i} cx={cx} cy={20} rx={4} ry={2} fill="#3F5028" opacity={Math.min(1, (p - 0.4) * 2)}/>
            ))}
            {/* oyster bits */}
            {p > 0.55 && [25, 65, 95].map((cx, i) => (
              <circle key={i} cx={cx} cy={24} r={3} fill="#7A6952" opacity={Math.min(1, (p - 0.55) * 2)}/>
            ))}
          </svg>
        </div>
        {/* heat shimmer */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', left: `${30 + i * 80}px`, bottom: 130,
            width: 8, height: 60, borderRadius: 8,
            background: `radial-gradient(ellipse at 50% 30%, rgba(255,180,80,${0.18 + p * 0.2}), transparent 70%)`,
            animation: `shimmer-${i} ${1.6 + i * 0.2}s ease-in-out infinite`,
          }}/>
        ))}
      </div>
      <style>{`
        @keyframes shimmer-0 { 0%,100% { transform: translateY(0) scaleY(1);} 50% { transform: translateY(-14px) scaleY(1.2);} }
        @keyframes shimmer-1 { 0%,100% { transform: translateY(0) scaleY(1);} 50% { transform: translateY(-20px) scaleY(1.3);} }
        @keyframes shimmer-2 { 0%,100% { transform: translateY(0) scaleY(1);} 50% { transform: translateY(-12px) scaleY(1.1);} }
      `}</style>

      {/* progress + stage */}
      <div style={{ padding: '32px 28px 0' }}>
        <div style={{ height: 4, background: 'rgba(31,26,18,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${tick}%`, background: T.shu, transition: 'width 0.1s linear' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft }}>{stages[stageIdx]}</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.shu, fontWeight: 700 }}>{tick}%</span>
        </div>
      </div>
    </Phone>
  );
}

// ===================================================================
// Screen 04 · Candidates (vertical card stack — Tinder-style)
// ===================================================================
function CandidatesScreen({ candidates, onPick, onReroll, onChangeIngredients }) {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const cardRefs = useRef([]);

  // Track which card is most prominent in the viewport
  function onScroll() {
    const sc = scrollRef.current;
    if (!sc) return;
    const mid = sc.scrollTop + sc.clientHeight / 2;
    let best = 0, bestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const c = el.offsetTop + el.offsetHeight / 2;
      const d = Math.abs(c - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActiveIdx(best);
  }

  return (
    <Phone>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '6px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tap onPress={onChangeIngredients} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.sumiSoft }}>
          {Icon.chev('left', T.sumiSoft, 14)}<span>食材</span>
        </Tap>
        <div style={{ fontFamily: T.mincho, fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>新提案 · 3案</div>
        <Tap onPress={onReroll} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.shu, fontWeight: 700 }}>
          {Icon.refresh(T.shu, 14)}<span>ふり直す</span>
        </Tap>
      </div>

      <div style={{ padding: '14px 24px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 19, fontWeight: 600, color: T.sumi, lineHeight: 1.35 }}>
          今宵の一枚を、<br/>あなたの目で。
        </div>
        {/* page indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', paddingBottom: 4 }}>
          {candidates.map((_, i) => (
            <div key={i} style={{
              width: 6, height: i === activeIdx ? 22 : 6, borderRadius: 3,
              background: i === activeIdx ? T.shu : 'rgba(31,26,18,0.18)', transition: 'height 0.2s',
            }}/>
          ))}
        </div>
      </div>

      {/* scrollable card list */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          height: 'calc(852px - 130px - 34px)',
          overflowY: 'auto',
          padding: '8px 16px 140px',
          scrollSnapType: 'y proximity',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {candidates.map((c, i) => (
            <div
              key={c.kind}
              ref={el => cardRefs.current[i] = el}
              style={{ scrollSnapAlign: 'start', scrollMarginTop: 8 }}
            >
              <Tap onPress={() => onPick(c, i)}>
                <CandidateCard c={c} idx={i} total={candidates.length} active={i === activeIdx}/>
              </Tap>
            </div>
          ))}
          {/* tail hint */}
          <div style={{ textAlign: 'center', padding: '4px 0 0', fontFamily: T.mincho,
            fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>
            ── 以上、3案 ──
          </div>
        </div>
      </div>

      {/* sticky decide bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, padding: '14px 20px 16px',
        background: 'linear-gradient(to bottom, rgba(242,233,214,0), rgba(242,233,214,0.96) 35%)' }}>
        <PrimaryBtn onPress={() => onPick(candidates[activeIdx], activeIdx)} style={{ width: '100%' }}>
          この一枚に決める {Icon.arrow('#fff', 14)}
        </PrimaryBtn>
      </div>
    </Phone>
  );
}

function CandidateCard({ c, idx, total, active }) {
  const tone = c.kind === 'exploit' ? { ink: T.exploitInk, bg: T.exploitBg } :
               c.kind === 'tune'    ? { ink: T.tuneInk,    bg: T.tuneBg    } :
                                      { ink: T.exploreInk, bg: T.exploreBg };
  return (
    <div style={{
      borderRadius: 22, background: T.kinari, border: `1px solid ${T.hairline}`,
      boxShadow: active ? '0 14px 40px rgba(31,26,18,0.16)' : '0 6px 18px rgba(31,26,18,0.08)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* pizza hero */}
      <div style={{ height: 220, background: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <StrategySeal kind={c.kind} size={48}/>
        </div>
        <div style={{ position: 'absolute', top: 18, right: 14, fontFamily: T.mono, fontSize: 10, color: tone.ink, letterSpacing: 2 }}>
          0{idx + 1} / 0{total}
        </div>
        <div style={{ transform: 'scale(0.85)' }}>{Pizzas[c.pizza]?.(200)}</div>
      </div>
      {/* body */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 18, fontWeight: 600, color: T.sumi, lineHeight: 1.35, letterSpacing: 0.3 }}>
          {c.title}
        </div>
        <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 6, lineHeight: 1.6 }}>
          {c.concept}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {c.tags.map(t => <Chip key={t} size="sm" tone="ghost">{t}</Chip>)}
        </div>
        <div style={{ marginTop: 14, padding: 10, borderRadius: 10,
          background: 'rgba(31,26,18,0.04)', display: 'flex', gap: 8 }}>
          <span style={{ fontFamily: T.mincho, fontSize: 11, color: tone.ink, letterSpacing: 1, flexShrink: 0 }}>なぜ?</span>
          <span style={{ fontSize: 11, color: T.sumiSoft, lineHeight: 1.55 }}>{c.note}</span>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Screen 05 · Detail
// ===================================================================
function DetailScreen({ candidate, locale, onBack, onCook, onSave }) {
  const [imageReady, setImageReady] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setImageReady(false);
    const t = setTimeout(() => setImageReady(true), 1100);
    return () => clearTimeout(t);
  }, [candidate]);

  return (
    <Phone>
      {/* hero */}
      <div style={{ position: 'relative', height: 360, background: T.washiDeep, overflow: 'hidden' }}>
        <div style={{ height: 54 }}/>
        <div style={{ position: 'absolute', top: 60, left: 16, zIndex: 5 }}>
          <Tap onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20,
            background: 'rgba(251,247,237,0.9)', border: `1px solid ${T.hairline}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.chev('left', T.sumi, 16)}
          </Tap>
        </div>
        <div style={{ position: 'absolute', top: 60, right: 16, zIndex: 5, display: 'flex', gap: 8 }}>
          <Tap onPress={() => setSaved(s => !s)} style={{ width: 40, height: 40, borderRadius: 20,
            background: 'rgba(251,247,237,0.9)', border: `1px solid ${T.hairline}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.heart(saved, T.shu, 18)}
          </Tap>
        </div>

        <div style={{ position: 'absolute', inset: 0, top: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: imageReady ? 1 : 0.25, transition: 'opacity 0.6s' }}>
          {Pizzas[candidate.pizza]?.(260)}
        </div>
        {!imageReady && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center',
            fontFamily: T.gothic, fontSize: 11, color: T.sumiMuted, letterSpacing: 2 }}>
            ✦ 仕上がり画像を生成中…
          </div>
        )}

      </div>

      {/* scrollable body */}
      <div style={{ height: 'calc(852px - 360px - 56px - 34px)', overflowY: 'auto', padding: '20px 24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 4 }}>{locale.jp} · 春の一枚</div>
            <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 4, lineHeight: 1.35 }}>
              {candidate.title}
            </div>
          </div>
          <div style={{ flexShrink: 0, marginTop: -4 }}>
            <StrategySeal kind={candidate.kind} size={56}/>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 8, lineHeight: 1.7 }}>
          {candidate.concept}
        </div>

        {/* meta strip */}
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: T.kinari,
          border: `1px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between' }}>
          {[['人数', '4'], ['時間', '45m'], ['焼成', '270°C'], ['難易度', '★★☆']].map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: T.sumiMuted, letterSpacing: 1 }}>{k}</div>
              <div style={{ fontFamily: T.mincho, fontSize: 15, color: T.sumi, fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* ingredients */}
        <div style={{ marginTop: 22 }}>
          <SectionHeader jp="食材" en="INGREDIENTS"/>
          {[
            ['強力粉 + 全粒粉', '300g'],
            ['松島牡蠣', '8個'],
            ['仙台せり', '1束'],
            ['手作りモッツァレラ', '180g'],
            ['オリーブオイル / 塩 / 黒胡椒', '適量'],
          ].map(([n, q]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: `1px dashed ${T.hairline}` }}>
              <span style={{ fontSize: 13, color: T.sumi }}>{n}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.sumiSoft }}>{q}</span>
            </div>
          ))}
        </div>

        {/* steps */}
        <div style={{ marginTop: 22 }}>
          <SectionHeader jp="手順" en="STEPS"/>
          {[
            '生地を捏ね、室温で40分発酵させる。',
            '牡蠣は薄く塩を振り、軽くオリーブオイルでマリネ。',
            '伸ばした生地にトマトソース、モッツァレラ、牡蠣を散らす。',
            '270℃で8分焼成。仕上げにせりと黒胡椒、オリーブオイルひと回し。',
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.hairline}` }}>
              <span style={{ fontFamily: T.mincho, fontSize: 18, color: T.shu, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: T.sumi, lineHeight: 1.65 }}>{s}</span>
            </div>
          ))}
        </div>

        {/* story */}
        <div style={{ marginTop: 22, padding: 16, borderRadius: 14, background: T.sumi, color: T.kinari, position: 'relative' }}>
          <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.yamabuki, letterSpacing: 4 }}>ゲストに語る</div>
          <div style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600, marginTop: 6, lineHeight: 1.6, letterSpacing: 0.4 }}>
            「松島の牡蠣と、名取のせり。<br/>仙台の冬と春が、一枚に。」
          </div>
          <div style={{ fontSize: 11, color: 'rgba(251,247,237,0.7)', marginTop: 10, lineHeight: 1.7 }}>
            松島湾の牡蠣は3年もの。せりは根まで食べる仙台の流儀で。海と里、二つの仙台を同時に味わってもらう設計です。
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <GhostBtn onPress={onSave} style={{ flex: 1 }}>
            {Icon.heart(false, T.shu, 16)} ピザ帳に保存
          </GhostBtn>
          <PrimaryBtn onPress={onCook} style={{ flex: 1.4 }}>
            作ってみる {Icon.flame('#fff', 16)}
          </PrimaryBtn>
        </div>
      </div>
    </Phone>
  );
}

function SectionHeader({ jp, en }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
      <span style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi, letterSpacing: 2 }}>{jp}</span>
      <span style={{ flex: 1, height: 1, background: T.hairline }}/>
      <span style={{ fontFamily: T.gothic, fontSize: 9, color: T.sumiMuted, letterSpacing: 2 }}>{en}</span>
    </div>
  );
}

// ===================================================================
// Screen 06 · Feedback
// ===================================================================
function FeedbackScreen({ candidate, onSubmit, onBack }) {
  const [stars, setStars] = useState(5);
  const [axes, setAxes] = useState({ '味': 5, '見た目': 4, 'ストーリー': 5, 'また作りたい': 4 });
  const [worked, setWorked] = useState(new Set(['食材の組合せ', 'ストーリーがウケた']));
  const [tune, setTune] = useState(new Set(['塩味']));
  const [vibe, setVibe] = useState(new Set(['会話が弾んだ', '驚かれた']));
  const [photos, setPhotos] = useState([]); // array of dataURL
  const [comment, setComment] = useState('');
  const fileRef = useRef(null);

  function onPickPhoto(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(files.slice(0, 4 - photos.length).map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    }))).then(urls => setPhotos(p => [...p, ...urls].slice(0, 4)));
    e.target.value = '';
  }

  const toggleSet = (setter) => (chip) => setter(prev => {
    const n = new Set(prev);
    if (n.has(chip)) n.delete(chip); else n.add(chip);
    return n;
  });

  const Section = ({ jp, en, items, set, setter, tone }) => (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: T.mincho, fontSize: 13, color: T.sumi, letterSpacing: 2, fontWeight: 600 }}>{jp}</span>
        <span style={{ fontFamily: T.gothic, fontSize: 9, color: T.sumiMuted, letterSpacing: 1 }}>{en}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(it => (
          <Tap key={it} onPress={() => toggleSet(setter)(it)}>
            <Chip tone={set.has(it) ? tone : 'ghost'} selected={set.has(it)}>{it}</Chip>
          </Tap>
        ))}
      </div>
    </div>
  );

  return (
    <Phone>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '6px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <Tap onPress={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: T.sumiSoft }}>
          {Icon.chev('left', T.sumiSoft, 14)}<span>戻る</span>
        </Tap>
        <span style={{ fontSize: 12, color: T.shu, fontWeight: 700 }}>下書きを保存</span>
      </div>

      <div style={{ height: 'calc(100% - 110px)', overflowY: 'auto', padding: '8px 20px 32px' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 4 }}>作ってみた</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 4, lineHeight: 1.3 }}>
          今夜の一枚は、<br/>どうでしたか？
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: T.washiDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ transform: 'scale(0.32)' }}>{Pizzas[candidate.pizza]?.(200)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.sumi, fontFamily: T.mincho }}>{candidate.title}</div>
            <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
              {[1,2,3,4,5].map(i => (
                <Tap key={i} onPress={() => setStars(i)}>{Icon.star(i <= stars, T.yamabuki, 22)}</Tap>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: T.kinari, border: `1px solid ${T.hairline}` }}>
          <div style={{ fontFamily: T.mincho, fontSize: 12, color: T.sumi, letterSpacing: 2, marginBottom: 8 }}>観点別評価</div>
          {Object.entries(axes).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ width: 84, fontSize: 11, color: T.sumiSoft }}>{k}</span>
              <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(n => (
                  <Tap key={n} onPress={() => setAxes(a => ({ ...a, [k]: n }))} style={{ flex: 1 }}>
                    <div style={{ height: 8, borderRadius: 4, background: n <= v ? T.shu : 'rgba(31,26,18,0.06)' }}/>
                  </Tap>
                ))}
              </div>
              <span style={{ width: 14, textAlign: 'right', fontSize: 11, fontFamily: T.mono, color: T.sumi }}>{v}</span>
            </div>
          ))}
        </div>

        <Section jp="効いた点" en="WHAT WORKED" tone="matcha" set={worked} setter={setWorked}
          items={['食材の組合せ', 'ストーリーがウケた', '焼き加減', '見た目', '量', 'ワインとの相性']}/>
        <Section jp="次は調整したい" en="WHAT TO TUNE" tone="yamabuki" set={tune} setter={setTune}
          items={['塩味', '焼成時間', '生地の厚さ', 'トッピング量', '酸味', '油分']}/>
        <Section jp="ゲストの反応" en="GUEST VIBE" tone="shu" set={vibe} setter={setVibe}
          items={['会話が弾んだ', '驚かれた', 'おかわり続出', '写真に撮られた', '地元トーク', 'お酒が進んだ']}/>

        {/* photos */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: T.mincho, fontSize: 13, color: T.sumi, letterSpacing: 2, fontWeight: 600 }}>写真</span>
            <span style={{ fontFamily: T.gothic, fontSize: 9, color: T.sumiMuted, letterSpacing: 1 }}>PHOTOS · 任意 · 最大4枚</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickPhoto} style={{ display: 'none' }}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {photos.map((src, i) => (
              <div key={i} style={{
                position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden',
                background: T.washiDeep, border: `1px solid ${T.hairline}`,
              }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                <Tap onPress={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{
                  position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
                  background: 'rgba(31,26,18,0.7)', color: '#FBF7ED', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>×</Tap>
              </div>
            ))}
            {photos.length < 4 && (
              <Tap onPress={() => fileRef.current?.click()} style={{
                aspectRatio: '1 / 1', borderRadius: 10,
                background: 'rgba(31,26,18,0.03)', border: `1px dashed ${T.sumiMuted}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, color: T.sumiSoft,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="14" rx="2"/>
                  <path d="M8 6l1.5-2h5L16 6"/>
                  <circle cx="12" cy="13" r="3.5"/>
                </svg>
                <span style={{ fontSize: 9, letterSpacing: 1 }}>追加</span>
              </Tap>
            )}
          </div>
          {photos.length === 0 && (
            <div style={{ marginTop: 6, fontSize: 10, color: T.sumiMuted, letterSpacing: 1 }}>
              仕上がりやテーブルの一枚があると、次回より明確な提案につながります。
            </div>
          )}
        </div>

        {/* comment */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: T.mincho, fontSize: 13, color: T.sumi, letterSpacing: 2, fontWeight: 600 }}>コメント</span>
            <span style={{ fontFamily: T.gothic, fontSize: 9, color: T.sumiMuted, letterSpacing: 1 }}>NOTES · 任意</span>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 280))}
            placeholder="ゲストの反応、改善メモ、次回試したいこと…"
            style={{
              width: '100%', minHeight: 88, padding: '12px 14px', borderRadius: 12,
              background: T.kinari, border: `1px solid ${T.hairline}`,
              fontFamily: T.gothic, fontSize: 13, color: T.sumi, lineHeight: 1.65,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 4, textAlign: 'right', fontFamily: T.mono,
            fontSize: 10, color: T.sumiMuted, letterSpacing: 1 }}>
            {comment.length} / 280
          </div>
        </div>

        <PrimaryBtn onPress={() => onSubmit({ stars, axes, worked: [...worked], tune: [...tune], vibe: [...vibe], photos, comment })}
          style={{ marginTop: 26 }}>
          記録して次の発想に活かす {Icon.arrow('#fff', 14)}
        </PrimaryBtn>
        <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'rgba(96,119,68,0.08)',
          fontSize: 11, color: '#3F5028', lineHeight: 1.6 }}>
          ✓ この記録は次回の「王道」と「大冒険」両方に反映されます。
        </div>
      </div>
    </Phone>
  );
}

// ===================================================================
// Screen 07 · Saved (success/thank screen → pizza book)
// ===================================================================
function SavedScreen({ feedback, candidate, onAgain }) {
  return (
    <Phone>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: T.shu, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(200,65,42,0.32)' }}>
          {Icon.check('#fff', 32)}
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 12, color: T.shu, letterSpacing: 6, marginTop: 18 }}>記録ありがとうございます</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 8, lineHeight: 1.4 }}>
          次の発想に、<br/>確かに反映されます。
        </div>
      </div>

      <div style={{ margin: '32px 20px 0', padding: 16, borderRadius: 16, background: T.kinari,
        border: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ transform: 'scale(0.4)', transformOrigin: 'center', width: 80, height: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Pizzas[candidate.pizza]?.(200)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi }}>{candidate.title}</div>
            <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
              {[1,2,3,4,5].map(i => <span key={i}>{Icon.star(i <= feedback.stars, T.yamabuki, 14)}</span>)}
            </div>
            <div style={{ fontSize: 10, color: T.sumiMuted, marginTop: 4 }}>2026.05.12 · ピザ帳に追加</div>
          </div>
        </div>
      </div>

      <div style={{ margin: '20px 20px 0', padding: 14, borderRadius: 14, background: 'rgba(62,86,112,0.08)' }}>
        <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.ai, letterSpacing: 3, fontWeight: 600 }}>次回への影響</div>
        <div style={{ fontSize: 12, color: T.sumi, marginTop: 8, lineHeight: 1.7 }}>
          ・<b>王道</b> ：「食材の組合せ」が効くので踏襲します<br/>
          ・<b>一歩外す</b> ：「塩味」を抑えた方向で再提案します<br/>
          ・<b>大冒険</b> ：会話が弾んだ方向の延長を探索します
        </div>
      </div>

      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 50 }}>
        <PrimaryBtn onPress={onAgain}>
          次のパーティのピザを考える {Icon.sparkle('#fff', 14)}
        </PrimaryBtn>
      </div>
    </Phone>
  );
}

// ===================================================================
// App — state machine
// ===================================================================
const LS_KEY = 'mlpr:locale';

function App() {
  const initialLocale = (() => {
    try { const v = localStorage.getItem(LS_KEY); if (v) return JSON.parse(v); } catch {}
    return null;
  })();
  const [locale, setLocale] = useState(initialLocale);
  const [screen, setScreen] = useState(initialLocale ? 'ingredients' : 'local');
  const [ingredients, setIngredients] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [picked, setPicked] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mlpr:history') || '[]'); } catch { return []; }
  });

  function saveLocale(p) {
    setLocale(p);
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
    setScreen('ingredients');
  }

  function resetLocale() {
    try { localStorage.removeItem(LS_KEY); } catch {}
    setLocale(null);
    setScreen('local');
  }

  function startGenerate(ids) {
    setIngredients(ids);
    setCandidates(buildCandidates(ids, history.length > 0));
    setScreen('loading');
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#23201A', padding: 20, position: 'relative' }}>
      {/* small floating chrome */}
      <FloatingNav screen={screen} setScreen={setScreen} resetLocale={resetLocale} locale={locale}/>

      {screen === 'local' && <LocalScreen onPick={saveLocale}/>}
      {screen === 'ingredients' && (
        <IngredientsScreen
          locale={locale}
          onChangeLocale={resetLocale}
          onNext={startGenerate}
        />
      )}
      {screen === 'loading' && (
        <LoadingScreen onDone={() => setScreen('candidates')}/>
      )}
      {screen === 'candidates' && (
        <CandidatesScreen
          candidates={candidates}
          onPick={(c) => { setPicked(c); setScreen('detail'); }}
          onReroll={() => setScreen('loading')}
          onChangeIngredients={() => setScreen('ingredients')}
        />
      )}
      {screen === 'detail' && picked && (
        <DetailScreen
          candidate={picked}
          locale={locale}
          onBack={() => setScreen('candidates')}
          onCook={() => setScreen('feedback')}
          onSave={() => setScreen('feedback')}
        />
      )}
      {screen === 'feedback' && picked && (
        <FeedbackScreen
          candidate={picked}
          onBack={() => setScreen('detail')}
          onSubmit={(f) => {
            setFeedback(f);
            const newH = [{ candidate: picked, feedback: f, when: Date.now() }, ...history];
            setHistory(newH);
            try { localStorage.setItem('mlpr:history', JSON.stringify(newH)); } catch {}
            setScreen('saved');
          }}
        />
      )}
      {screen === 'saved' && feedback && picked && (
        <SavedScreen
          feedback={feedback}
          candidate={picked}
          onAgain={() => { setPicked(null); setFeedback(null); setScreen('ingredients'); }}
        />
      )}
    </div>
  );
}

function FloatingNav({ screen, setScreen, resetLocale, locale }) {
  const steps = [
    { id: 'local', label: '地元' },
    { id: 'ingredients', label: '食材' },
    { id: 'loading', label: '生成' },
    { id: 'candidates', label: '3案' },
    { id: 'detail', label: '詳細' },
    { id: 'feedback', label: '記録' },
    { id: 'saved', label: '完了' },
  ];
  const idx = steps.findIndex(s => s.id === screen);
  return (
    <div style={{
      position: 'fixed', top: 16, left: 16, zIndex: 100,
      padding: '10px 14px', borderRadius: 14,
      background: 'rgba(35,32,26,0.85)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: '#F2E9D6', fontSize: 11, fontFamily: T.gothic,
    }}>
      <div style={{ fontFamily: T.mincho, fontSize: 10, letterSpacing: 4, color: T.yamabuki, marginBottom: 6 }}>
        FLOW · {idx + 1} / {steps.length}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {steps.map((s, i) => (
          <div
            key={s.id}
            onClick={() => setScreen(s.id)}
            style={{
              cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
              background: i === idx ? T.shu : (i < idx ? 'rgba(220,138,42,0.18)' : 'transparent'),
              color: i === idx ? '#fff' : (i < idx ? T.yamabuki : 'rgba(242,233,214,0.5)'),
              fontWeight: i === idx ? 700 : 500, fontSize: 10,
              border: i === idx ? 'none' : '1px solid rgba(242,233,214,0.1)',
            }}
          >{s.label}</div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: 'rgba(242,233,214,0.5)' }}>
        地元: {locale?.jp ?? '未設定'}
        {locale && <span onClick={resetLocale} style={{ marginLeft: 8, cursor: 'pointer', color: T.yamabuki, textDecoration: 'underline' }}>リセット</span>}
      </div>
    </div>
  );
}

Object.assign(window, {
  LocalScreen, IngredientsScreen, LoadingScreen, CandidatesScreen,
  DetailScreen, FeedbackScreen, SavedScreen,
  buildCandidates, PREFS, ALL_INGREDIENTS, App,
});

if (!window.__MLPR_NO_AUTOMOUNT) {
  ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
}
