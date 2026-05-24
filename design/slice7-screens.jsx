// slice7-screens.jsx — Slice 7 design proposal canvases
// 「ふるさとピザ帳」 — unified HeaderRow / 保存帳 (library) / 振り返り帳 (journal) /
// feedback / detail "作ってみる" CTA. Uses tokens from pizza-tokens.jsx, reuses
// Phone, Pizzas, Icon, Chip, StrategySeal, ShuButton, Avatar, Toast from earlier slices.

const W7 = 393;
const H7 = 852;
const SAFE_TOP_7 = 54;
const SAFE_BOT_7 = 34;

// ── Local Shu primary button (pizza-screens.jsx ShuButton is not exported globally)
function Shu7Button({ children, style, ghost, small, disabled }) {
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
      width: '100%', height: small ? 44 : 52, borderRadius: 999,
      background: disabled ? 'rgba(31,26,18,0.10)' : T.shu,
      color: disabled ? T.sumiMuted : '#fff',
      boxShadow: disabled ? 'none' : '0 6px 18px rgba(200,65,42,0.32), inset 0 -2px 0 rgba(0,0,0,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontFamily: T.gothic, fontWeight: 700, fontSize: 15, letterSpacing: 0.6,
      ...style,
    }}>{children}</div>
  );
}

// ===================================================================
// Shared: HeaderRow v2 (unified across all routes except `/`)
// ===================================================================
// Compact, sticky-looking row that sits just below the iOS status bar.
// Left  : BackChip (round, ghost)
// Center: Title (mincho) — fixed per route
// Right : Avatar + chev (signed in) OR text link 「サインイン」 (guest)
function HeaderRow7({ title, brand, mode = 'collapsed', user, dark }) {
  // mode: 'guest' | 'collapsed' | 'open'
  const ink = dark ? '#FBF7ED' : T.sumi;
  const inkSub = dark ? 'rgba(251,247,237,0.7)' : T.sumiSoft;
  const inkMute = dark ? 'rgba(251,247,237,0.5)' : T.sumiMuted;
  const surface = dark ? 'rgba(31,26,18,0.55)' : T.kinari;
  const hair = dark ? 'rgba(255,255,255,0.12)' : T.hairline;

  return (
    <div style={{
      position: 'relative', zIndex: 4,
      padding: '6px 12px 0', // sits just below status bar inset
    }}>
      <div style={{
        height: 48, padding: '0 6px 0 6px', background: surface,
        borderRadius: 12, border: `1px solid ${hair}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}>
        {/* left: back chip */}
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(31,26,18,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.chev('left', ink, 14)}</div>

        {/* center: title + optional brand line */}
        <div style={{ textAlign: 'center', minWidth: 0, flex: 1, padding: '0 8px' }}>
          {brand && (
            <div style={{ fontFamily: T.mono, fontSize: 9, color: dark ? '#E8B97A' : T.shu,
              letterSpacing: 4, lineHeight: 1 }}>{brand}</div>
          )}
          <div style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600,
            color: ink, letterSpacing: 1.2, marginTop: brand ? 3 : 0, lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        </div>

        {/* right */}
        {mode === 'guest' ? (
          <div style={{ padding: '8px 12px', fontFamily: T.gothic, fontSize: 12, fontWeight: 600,
            color: inkSub, textDecoration: 'underline', textUnderlineOffset: 3,
            textDecorationColor: 'rgba(146,133,113,0.4)' }}>サインイン</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px 0 8px' }}>
            <Avatar size={30} initials={user?.initials || 'M'}/>
            {Icon.chev(mode === 'open' ? 'up' : 'down', inkMute, 11)}
          </div>
        )}
      </div>
    </div>
  );
}

// Dropdown content for the HeaderRow (anchored to the avatar)
function HeaderDropdown({ user, anchor = 'right', currentRoute }) {
  const items = [
    { id: 'library', icon: '📔', jp: 'ピザ帳 (保存)', en: 'SAVED', route: '/library' },
    { id: 'journal', icon: '📓', jp: '振り返り帳 (作った)', en: 'JOURNAL', route: '/journal' },
  ];
  return (
    <div role="menu" aria-label="ユーザーメニュー" style={{
      position: 'absolute', top: 60, [anchor]: 14, width: 248,
      background: T.kinari, borderRadius: 14, border: `1px solid ${T.hairline}`,
      boxShadow: '0 18px 44px rgba(31,26,18,0.20), 0 4px 10px rgba(31,26,18,0.08)',
      overflow: 'hidden', zIndex: 8,
    }}>
      {/* user info row */}
      <div style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${T.hairline}`,
        background: 'linear-gradient(180deg, rgba(200,65,42,0.04), transparent)' }}>
        <Avatar size={38} initials={user.initials}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi,
            lineHeight: 1.2 }}>{user.displayName}</div>
          <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, marginTop: 3,
            letterSpacing: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        </div>
      </div>

      {/* nav items */}
      {items.map((it, i) => {
        const active = it.route === currentRoute;
        return (
          <div key={it.id} role="menuitem" style={{
            padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11,
            fontFamily: T.gothic, fontSize: 13, color: T.sumi, fontWeight: 600,
            background: active ? 'rgba(200,65,42,0.07)' : 'transparent',
            borderTop: i ? `1px solid ${T.hairline}` : 'none',
            position: 'relative',
          }}>
            {active && <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2,
              background: T.shu, borderRadius: 2 }}/>}
            <span style={{ fontSize: 16, lineHeight: 1, width: 18, textAlign: 'center' }}>{it.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi,
                lineHeight: 1.2 }}>{it.jp}</div>
              <div style={{ fontFamily: T.mono, fontSize: 8.5, color: T.sumiMuted, marginTop: 2,
                letterSpacing: 1.2 }}>{it.en}</div>
            </div>
            {Icon.chev('right', T.sumiMuted, 11)}
          </div>
        );
      })}

      {/* divider + sign out */}
      <div style={{ height: 1, background: T.hairline }}/>
      <div role="menuitem" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center',
        gap: 10, fontFamily: T.gothic, fontSize: 12, fontWeight: 500, color: T.sumiMuted,
        letterSpacing: 0.3 }}>
        <span style={{ width: 18, textAlign: 'center', fontSize: 13 }}>↪</span>
        <span style={{ flex: 1 }}>サインアウト</span>
      </div>
    </div>
  );
}

// Caption used inside showcases
function Cap7({ children, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, paddingLeft: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: accent || T.shu }}/>
      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3 }}>{children}</span>
    </div>
  );
}

// Annotated note pill — small floating callout INSIDE the artboard area
function Annot({ children, accent = T.shu, style }) {
  return (
    <div style={{
      padding: '7px 10px', borderRadius: 8,
      background: 'rgba(31,26,18,0.92)', color: '#FBF7ED',
      fontFamily: T.gothic, fontSize: 10.5, lineHeight: 1.55, letterSpacing: 0.2,
      borderLeft: `2px solid ${accent}`,
      boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      ...style,
    }}>{children}</div>
  );
}

// ===================================================================
// S7-01 · HeaderShowcase v2 (unified HeaderRow specification)
// ===================================================================
function HeaderShowcaseV2() {
  const user = { initials: '松', displayName: '松島 一郎', email: 'matsushima@gmail.com' };
  return (
    <div style={{ width: W7, height: H7, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, padding: '54px 0 0', overflow: 'hidden',
      position: 'relative' }}>
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>SLICE 7 · 01</div>
        <div style={{ fontFamily: T.mincho, fontSize: 21, fontWeight: 600, color: T.sumi,
          marginTop: 5, lineHeight: 1.3 }}>
          統一 HeaderRow<br/><span style={{ color: T.sumiSoft, fontSize: 14 }}>左 BackChip · 中央 タイトル · 右 Avatar + ▾</span>
        </div>
      </div>

      {/* state 1 — guest */}
      <div style={{ margin: '14px 4px 0' }}>
        <div style={{ paddingLeft: 16 }}><Cap7>① 未サインイン</Cap7></div>
        <HeaderRow7 mode="guest" title="保存帳"/>
      </div>

      {/* state 2 — signed in, collapsed */}
      <div style={{ margin: '10px 4px 0' }}>
        <div style={{ paddingLeft: 16 }}><Cap7>② サインイン済・閉</Cap7></div>
        <HeaderRow7 mode="collapsed" title="保存帳" user={user}/>
      </div>

      {/* state 3 — dropdown open */}
      <div style={{ margin: '10px 4px 0', position: 'relative', paddingBottom: 244 }}>
        <div style={{ paddingLeft: 16 }}><Cap7 accent={T.matcha}>③ Dropdown 展開時 (現在 /library)</Cap7></div>
        <HeaderRow7 mode="open" title="保存帳" user={user}/>
        <HeaderDropdown user={user} currentRoute="/library"/>
      </div>

      {/* anatomy / spec footnote */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 44,
        padding: '12px 14px', borderRadius: 12, background: T.kinari,
        border: `1px solid ${T.hairline}`,
        fontSize: 10.5, color: T.sumiSoft, lineHeight: 1.65 }}>
        <div style={{ fontFamily: T.mincho, fontWeight: 600, color: T.sumi, fontSize: 11.5,
          letterSpacing: 1.5, marginBottom: 4 }}>仕様メモ</div>
        <div>· outside click / <span style={{ fontFamily: T.mono }}>Esc</span> で閉じる · <span style={{ fontFamily: T.mono }}>role="menu"</span></div>
        <div>· メニュー初期 focus = 1 行目 (ピザ帳)、<span style={{ fontFamily: T.mono }}>↑↓</span> で巡回</div>
        <div>· 現在ルートに朱の縦バー + 薄塗りで強調</div>
        <div>· TOP (<span style={{ fontFamily: T.mono }}>/</span>) では Header 非表示、それ以外の全画面で常駐</div>
      </div>
    </div>
  );
}

// ===================================================================
// S7-02 · Library Refresh (= 「保存帳」, HeaderRow + cross link)
// ===================================================================
const LIB_SAVED_7 = [
  { id: '01', title: '松島牡蠣と仙台せりの春一枚',     locale: '宮城・松島', kind: 'exploit', date: '2026.05.12', pizza: 'seriOyster',     cooked: false },
  { id: '02', title: '牡蠣のクリーム、せりは仕上げに', locale: '宮城・仙台', kind: 'tune',    date: '2026.05.04', pizza: 'oysterClassic',  cooked: true  },
  { id: '03', title: '春霞、せりと牡蠣の余白',         locale: '宮城・名取', kind: 'explore', date: '2026.04.21', pizza: 'exploreMix',     cooked: false },
  { id: '04', title: '亘理パプリカと蔵王モッツァ',     locale: '宮城・亘理', kind: 'exploit', date: '2026.04.03', pizza: 'paprikaMozza',   cooked: true  },
  { id: '05', title: '名取せり、根まで一枚',           locale: '宮城・名取', kind: 'tune',    date: '2026.03.18', pizza: 'seriClassic',    cooked: false },
];

function CrossLink({ to, label, count, accent, jp, en }) {
  // small pill that links saved <-> journal
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px 8px 12px', borderRadius: 999,
      background: T.kinari, border: `1px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(31,26,18,0.04)',
    }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: `${accent}1A`,
        color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontFamily: T.mincho, fontWeight: 700 }}>{jp[0]}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: T.mincho, fontSize: 12, fontWeight: 600, color: T.sumi, lineHeight: 1.1 }}>
          {label}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 8.5, color: T.sumiMuted, letterSpacing: 1, marginTop: 2 }}>
          {en} · {count}
        </div>
      </div>
      <span style={{ marginLeft: 2, color: T.sumiSoft }}>{Icon.chev('right', T.sumiSoft, 11)}</span>
    </div>
  );
}

function LibraryCard7({ item }) {
  const seal = { exploit: { jp: '王道', ink: T.exploitInk, bg: T.exploitBg },
                 tune:    { jp: '一歩外す', ink: T.tuneInk, bg: T.tuneBg },
                 explore: { jp: '大冒険', ink: T.exploreInk, bg: T.exploreBg } }[item.kind];
  return (
    <div style={{ background: T.kinari, borderRadius: 14, padding: 12,
      border: `1px solid ${T.hairline}`, display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: '0 1px 2px rgba(31,26,18,0.04)' }}>
      <div style={{ width: 72, height: 72, borderRadius: 12, background: T.washiDeep,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
        {Pizzas[item.pizza](72)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi,
          lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontFamily: T.mincho, fontSize: 9, fontWeight: 600,
            color: seal.ink, background: seal.bg, padding: '2px 6px', borderRadius: 4, letterSpacing: 1 }}>
            {seal.jp}
          </span>
          <span style={{ fontFamily: T.gothic, fontSize: 10, color: T.sumiSoft,
            display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {Icon.pin(T.sumiMuted, 10)}{item.locale}
          </span>
          {item.cooked && (
            <span style={{ fontFamily: T.gothic, fontSize: 9, color: T.matcha, fontWeight: 700,
              letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <span style={{ width: 4, height: 4, borderRadius: 2, background: T.matcha }}/>
              作った
            </span>
          )}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, marginTop: 6, letterSpacing: 1 }}>
          保存 · {item.date}
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: 6 }}>
        {Icon.heart(true, T.shu, 20)}
      </div>
    </div>
  );
}

function LibraryRefresh() {
  const user = { initials: '松', displayName: '松島 一郎', email: 'matsushima@gmail.com' };
  return (
    <Phone>
      <div style={{ height: SAFE_TOP_7 }}/>
      <HeaderRow7 title="保存帳" brand="ふるさとピザ帳" mode="collapsed" user={user}/>

      {/* hero */}
      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 5 }}>SAVED · 保存したアイデア</div>
        <div style={{ fontFamily: T.mincho, fontSize: 23, fontWeight: 600, color: T.sumi,
          marginTop: 8, lineHeight: 1.35 }}>
          これから作る、<br/>あなたの一枚たち。
        </div>
        <div style={{ marginTop: 8, fontFamily: T.gothic, fontSize: 12, color: T.sumiSoft, lineHeight: 1.6 }}>
          保存中 <span style={{ color: T.sumi, fontWeight: 700, fontFamily: T.mono }}>{LIB_SAVED_7.length}</span> 件
          {' · '}うち作った <span style={{ color: T.matcha, fontWeight: 700, fontFamily: T.mono }}>2</span> 件
        </div>
      </div>

      {/* cross link to journal */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <CrossLink label="振り返り帳へ" jp="振" en="JOURNAL" count="2 件" accent={T.matcha} to="/journal"/>
        <span style={{ flex: 1, height: 1, background: T.hairline }}/>
        <span style={{ fontFamily: T.mincho, fontSize: 10, color: T.sumiMuted, letterSpacing: 2,
          whiteSpace: 'nowrap' }}>並べて見る</span>
      </div>

      {/* filter row */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0', overflow: 'hidden' }}>
        {['すべて', '宮城', '王道', '一歩外す', '大冒険'].map((t, i) => (
          <Chip key={i} selected={i === 0} size="sm">{t}</Chip>
        ))}
      </div>

      {/* list */}
      <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10,
        height: 'calc(100% - 320px)', overflowY: 'auto' }}>
        {LIB_SAVED_7.slice(0, 4).map(it => <LibraryCard7 key={it.id} item={it}/>)}
      </div>
    </Phone>
  );
}

// ===================================================================
// S7-03/04 · Journal (振り返り帳) — empty + populated
// ===================================================================
const JOURNAL_7 = [
  { id: 'j01', title: '松島牡蠣と仙台せりの春一枚', locale: '宮城・松島', kind: 'exploit', cookedAt: '2026.05.13', pizza: 'seriOyster',
    rating: 5, axes: { '味': 5, '見た目': 4, 'ストーリー': 5, 'また作りたい': 5 }, worked: ['食材の組合せ', 'ストーリー'] },
  { id: 'j02', title: '亘理パプリカと蔵王モッツァ', locale: '宮城・亘理', kind: 'exploit', cookedAt: '2026.04.07', pizza: 'paprikaMozza',
    rating: 4, axes: { '味': 4, '見た目': 5, 'ストーリー': 3, 'また作りたい': 4 }, worked: ['見た目', '焼き加減'] },
  { id: 'j03', title: '春霞、せりと牡蠣の余白',     locale: '宮城・名取', kind: 'explore', cookedAt: '2026.04.24', pizza: 'exploreMix',
    rating: 3, axes: { '味': 3, '見た目': 4, 'ストーリー': 5, 'また作りたい': 2 }, worked: ['ストーリー'] },
];

function StatTile({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, padding: '12px 10px 10px', background: T.kinari,
      borderRadius: 12, border: `1px solid ${T.hairline}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 2, background: accent || T.shu,
        borderRadius: 0 }}/>
      <div style={{ fontFamily: T.mono, fontSize: 8.5, color: T.sumiMuted, letterSpacing: 2 }}>{label}</div>
      <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi,
        lineHeight: 1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontFamily: T.gothic, fontSize: 9.5, color: T.sumiSoft, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StarRow({ rating, max = 5, size = 14 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => <span key={i}>{Icon.star(i < rating, T.yamabuki, size)}</span>)}
      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.sumi, marginLeft: 4,
        letterSpacing: 0.5 }}>{rating}.0</span>
    </div>
  );
}

function JournalCard({ item }) {
  const seal = { exploit: { jp: '王道', ink: T.exploitInk, bg: T.exploitBg },
                 tune:    { jp: '一歩外す', ink: T.tuneInk, bg: T.tuneBg },
                 explore: { jp: '大冒険', ink: T.exploreInk, bg: T.exploreBg } }[item.kind];
  return (
    <div style={{ background: T.kinari, borderRadius: 16, padding: 14,
      border: `1px solid ${T.hairline}`, boxShadow: '0 1px 2px rgba(31,26,18,0.04)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 78, height: 78, borderRadius: 12, background: T.washiDeep,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {Pizzas[item.pizza](78)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: T.mincho, fontSize: 9, fontWeight: 600,
              color: seal.ink, background: seal.bg, padding: '2px 6px', borderRadius: 4, letterSpacing: 1 }}>
              {seal.jp}
            </span>
            <span style={{ fontFamily: T.gothic, fontSize: 10, color: T.sumiSoft,
              display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {Icon.pin(T.sumiMuted, 10)}{item.locale}
            </span>
          </div>
          <div style={{ fontFamily: T.mincho, fontSize: 14.5, fontWeight: 600, color: T.sumi,
            marginTop: 5, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <StarRow rating={item.rating}/>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 0.8 }}>
              · 作った {item.cookedAt}
            </span>
          </div>
        </div>
      </div>
      {/* axes mini bars */}
      <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(31,26,18,0.03)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12, rowGap: 5 }}>
        {Object.entries(item.axes).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 56, fontSize: 9.5, color: T.sumiSoft, fontFamily: T.gothic }}>{k}</span>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(31,26,18,0.06)' }}>
              <div style={{ width: `${v * 20}%`, height: '100%', borderRadius: 2, background: T.yamabuki }}/>
            </div>
            <span style={{ width: 8, fontSize: 9, color: T.sumi, fontFamily: T.mono, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      {/* worked tags */}
      {item.worked?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          <span style={{ fontFamily: T.mincho, fontSize: 9.5, color: T.sumiMuted, letterSpacing: 1,
            marginRight: 2, alignSelf: 'center' }}>効いた点</span>
          {item.worked.map((w, i) => (
            <Chip key={i} tone="matcha" size="sm">{w}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function JournalList() {
  const user = { initials: '松', displayName: '松島 一郎', email: 'matsushima@gmail.com' };
  return (
    <Phone>
      <div style={{ height: SAFE_TOP_7 }}/>
      <HeaderRow7 title="振り返り帳" brand="ふるさとピザ帳" mode="collapsed" user={user}/>

      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.matcha, letterSpacing: 5 }}>JOURNAL · 作った 1 枚たち</div>
        <div style={{ fontFamily: T.mincho, fontSize: 23, fontWeight: 600, color: T.sumi,
          marginTop: 8, lineHeight: 1.35 }}>
          焼き上がった、<br/>あなたの記憶。
        </div>
      </div>

      {/* stat tiles */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px 0' }}>
        <StatTile label="作った数" value={JOURNAL_7.length} sub="保存 5 件中" accent={T.matcha}/>
        <StatTile label="平均 ★" value="4.0" sub="3 枚を集計" accent={T.yamabuki}/>
        <StatTile label="効いた点" value="食材" sub="で 2 件" accent={T.shu}/>
      </div>

      {/* cross link */}
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <CrossLink label="保存帳へ" jp="保" en="SAVED" count="5 件" accent={T.shu} to="/library"/>
        <span style={{ flex: 1, height: 1, background: T.hairline }}/>
        <span style={{ fontFamily: T.mincho, fontSize: 10, color: T.sumiMuted, letterSpacing: 2,
          whiteSpace: 'nowrap' }}>新しい順</span>
      </div>

      {/* filters */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0', overflow: 'hidden' }}>
        {['すべて', '★4+', '王道', '一歩外す', '大冒険'].map((t, i) => (
          <Chip key={i} selected={i === 0} size="sm">{t}</Chip>
        ))}
      </div>

      {/* list */}
      <div style={{ padding: '12px 16px 50px', display: 'flex', flexDirection: 'column', gap: 10,
        height: 'calc(100% - 380px)', overflowY: 'auto' }}>
        {JOURNAL_7.map(it => <JournalCard key={it.id} item={it}/>)}
      </div>
    </Phone>
  );
}

function JournalEmpty() {
  const user = { initials: '松', displayName: '松島 一郎', email: 'matsushima@gmail.com' };
  return (
    <Phone>
      <div style={{ height: SAFE_TOP_7 }}/>
      <HeaderRow7 title="振り返り帳" brand="ふるさとピザ帳" mode="collapsed" user={user}/>

      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.matcha, letterSpacing: 5 }}>JOURNAL · 作った 1 枚たち</div>
        <div style={{ fontFamily: T.mincho, fontSize: 23, fontWeight: 600, color: T.sumi,
          marginTop: 8, lineHeight: 1.35 }}>
          焼き上がった、<br/>あなたの記憶。
        </div>
      </div>

      {/* empty state */}
      <div style={{ padding: '40px 28px 0', textAlign: 'center' }}>
        <div style={{ width: 120, height: 120, borderRadius: 60, margin: '0 auto 20px',
          background: T.kinari, border: `1px dashed ${T.sumiMuted}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {Icon.star(false, T.sumiMuted, 36)}
          <div style={{ position: 'absolute', inset: 6, borderRadius: 60,
            border: `1px dashed rgba(146,133,113,0.25)` }}/>
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 19, fontWeight: 600, color: T.sumi, lineHeight: 1.5 }}>
          まだ振り返った<br/>一枚はありません。
        </div>
        <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 12, lineHeight: 1.85 }}>
          作ってみた感想を残すと、<br/>
          ここに ★ と一緒に並びます。
        </div>

        {/* hint card pointing back to saved */}
        <div style={{ marginTop: 26, padding: '14px 14px 14px', borderRadius: 14,
          background: T.kinari, border: `1px solid ${T.hairline}`,
          textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(200,65,42,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {Icon.heart(true, T.shu, 20)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi }}>
              まずは保存帳から
            </div>
            <div style={{ fontSize: 11, color: T.sumiSoft, marginTop: 3, lineHeight: 1.55 }}>
              気になる一枚を選んで「作ってみる」へ。
            </div>
          </div>
          {Icon.chev('right', T.sumiMuted, 12)}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: SAFE_BOT_7 + 14, textAlign: 'center',
        fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, letterSpacing: 3 }}>
        /journal · empty state
      </div>
    </Phone>
  );
}

// ===================================================================
// S7-05/06 · Feedback (empty + filled) with interaction annotations
// ===================================================================
// Tappable ★ row used inside feedback hero (1-5, tap same again to clear)
function StarInput({ value = 0, max = 5, size = 28 }) {
  return (
    <div role="radiogroup" aria-label="総合評価" style={{ display: 'inline-flex', gap: 5 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} role="radio" aria-checked={i < value} style={{ cursor: 'pointer' }}>
          {Icon.star(i < value, T.yamabuki, size)}
        </span>
      ))}
    </div>
  );
}

// Dot 5-step input bar — tap any dot to set value; ←/→ when focused
function DotsInput({ value = 0, max = 5, color = T.shu, focused }) {
  return (
    <div role="slider" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
      style={{ display: 'inline-flex', gap: 6, padding: '4px 4px',
        borderRadius: 999, background: focused ? 'rgba(31,26,18,0.04)' : 'transparent',
        outline: focused ? `1.5px solid ${color}` : 'none' }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < value;
        return (
          <span key={i} style={{
            width: 18, height: 18, borderRadius: 9,
            background: filled ? color : 'transparent',
            border: `1.5px solid ${filled ? color : T.hairline}`,
            display: 'inline-block', position: 'relative',
          }}/>
        );
      })}
    </div>
  );
}

function FeedbackChrome({ filled, user }) {
  // shared chrome (header + mini hero + axes + chips)
  const mini = {
    title: '松島牡蠣と仙台せりの春一枚',
    cookedAt: filled ? '2026.05.13 (火) 19:42' : '今夜',
    guests: filled ? 4 : null,
    pizza: 'seriOyster',
  };
  const overall = filled ? 5 : 0;
  const axes = filled
    ? { '味': 5, '見た目': 4, 'ストーリー': 5, 'また作りたい': 4 }
    : { '味': 0, '見た目': 0, 'ストーリー': 0, 'また作りたい': 0 };

  const worked = ['食材の組合せ', 'ストーリーがウケた', '焼き加減', '見た目', '量', 'ワインとの相性'];
  const workedSel = filled ? new Set(['食材の組合せ', 'ストーリーがウケた', '見た目']) : new Set();
  const tune = ['塩味', '焼成時間', '生地の厚さ', 'トッピング量', '酸味', '油分'];
  const tuneSel = filled ? new Set(['塩味']) : new Set();
  const vibe = ['会話が弾んだ', '驚かれた', 'おかわり続出', '写真に撮られた', '地元トークに発展'];
  const vibeSel = filled ? new Set(['会話が弾んだ', '驚かれた', '写真に撮られた']) : new Set();

  const ChipGroup = ({ items, sel, tone, jp, en }) => (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
        <span style={{ fontFamily: T.mincho, fontSize: 12.5, color: T.sumi, letterSpacing: 1.5, fontWeight: 600 }}>{jp}</span>
        <span style={{ fontFamily: T.mono, fontSize: 8.5, color: T.sumiMuted, letterSpacing: 1.5 }}>{en}</span>
        {filled && sel.size > 0 && (
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumi, marginLeft: 'auto' }}>{sel.size}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {items.map((c, i) => (
          <Chip key={i} tone={sel.has(c) ? tone : 'ghost'} selected={sel.has(c)}>{c}</Chip>
        ))}
      </div>
    </div>
  );

  return (
    <Phone>
      <div style={{ height: SAFE_TOP_7 }}/>
      <HeaderRow7 title="フィードバック" mode="collapsed" user={user}/>

      {/* eyebrow / headline */}
      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 5 }}>作ってみた · FEEDBACK</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi,
          marginTop: 6, lineHeight: 1.3 }}>
          今夜の一枚は、<br/>どうでしたか？
        </div>
        {filled && (
          <div style={{ marginTop: 6, fontFamily: T.gothic, fontSize: 11, color: T.matcha,
            display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: T.matcha }}/>
            前回の入力を引き継ぎました
            <span style={{ fontFamily: T.mono, color: T.sumiMuted, marginLeft: 6, letterSpacing: 1 }}>
              · 自動保存 12 秒前
            </span>
          </div>
        )}
      </div>

      {/* mini hero with star input */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ padding: 12, borderRadius: 14, background: T.kinari, border: `1px solid ${T.hairline}`,
          display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 70, height: 70, borderRadius: 12, background: T.washiDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            flexShrink: 0 }}>
            {Pizzas[mini.pizza](70)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi,
              lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mini.title}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, marginTop: 3, letterSpacing: 0.5 }}>
              {mini.cookedAt}{mini.guests ? ` · ゲスト ${mini.guests} 名` : ''}
            </div>
            <div style={{ marginTop: 8 }}>
              <StarInput value={overall} size={22}/>
              {!filled && (
                <span style={{ fontFamily: T.gothic, fontSize: 10, color: T.sumiMuted, marginLeft: 6 }}>
                  タップで総合評価
                </span>
              )}
            </div>
          </div>
          {/* camera (no-op in slice 7 → "準備中" toast on tap) */}
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(31,26,18,0.04)',
            border: `1px dashed ${T.hairline}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
            {Icon.camera(T.sumiMuted, 16)}
            <div style={{ position: 'absolute', bottom: -6, right: -6, padding: '1px 4px',
              fontSize: 7.5, fontFamily: T.mono, color: T.sumiSoft, background: T.washiDeep,
              borderRadius: 4, letterSpacing: 0.5 }}>準備中</div>
          </div>
        </div>
      </div>

      {/* guest count input */}
      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: T.mincho, fontSize: 12, color: T.sumiSoft, letterSpacing: 1 }}>ゲスト</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, height: 30,
          background: T.kinari, border: `1px solid ${T.hairline}`, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: 28, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.sumiSoft, fontFamily: T.mono, fontSize: 14, fontWeight: 700 }}>−</div>
          <div style={{ width: 36, textAlign: 'center', fontFamily: T.mincho, fontSize: 14, fontWeight: 600,
            color: T.sumi, borderLeft: `1px solid ${T.hairline}`, borderRight: `1px solid ${T.hairline}`,
            lineHeight: '30px' }}>{filled ? 4 : '—'}</div>
          <div style={{ width: 28, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.sumiSoft, fontFamily: T.mono, fontSize: 14, fontWeight: 700 }}>+</div>
        </div>
        <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiMuted }}>名</span>
        <span style={{ flex: 1 }}/>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 1 }}>任意</span>
      </div>

      {/* axes — dot input */}
      <div style={{ margin: '14px 20px 0', padding: '14px 14px 12px', borderRadius: 14,
        background: T.kinari, border: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: T.mincho, fontSize: 12.5, color: T.sumi, letterSpacing: 1.5, fontWeight: 600 }}>観点別評価</span>
          <span style={{ fontFamily: T.mono, fontSize: 8.5, color: T.sumiMuted, letterSpacing: 1.5 }}>BY AXIS · 5 段階</span>
        </div>
        {Object.entries(axes).map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <span style={{ width: 78, fontSize: 11.5, color: T.sumi, fontFamily: T.gothic, fontWeight: 500 }}>{k}</span>
            <DotsInput value={v} max={5} color={T.shu} focused={!filled && i === 0}/>
            <span style={{ width: 16, textAlign: 'right', fontSize: 10.5, color: v ? T.sumi : T.sumiMuted,
              fontFamily: T.mono, fontWeight: 600 }}>{v || '—'}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 20px 96px' }}>
        <ChipGroup items={worked} sel={workedSel} tone="matcha" jp="効いた点" en="WHAT WORKED"/>
        <ChipGroup items={tune} sel={tuneSel} tone="yamabuki" jp="次は調整したい" en="WHAT TO TUNE"/>
        <ChipGroup items={vibe} sel={vibeSel} tone="shu" jp="ゲストの反応" en="GUEST VIBE"/>
      </div>

      {/* CTA — fixed bottom */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: SAFE_BOT_7 + 8,
        background: 'linear-gradient(to bottom, rgba(242,233,214,0), rgba(242,233,214,0.96) 35%)',
        paddingTop: 22, paddingBottom: 4 }}>
        <Shu7Button style={{
          opacity: filled ? 1 : (overall > 0 ? 1 : 0.55),
        }}>
          {filled
            ? <><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{Icon.check('#fff', 14)} 記録を更新する</span></>
            : '記録して次の提案に活かす'}
        </Shu7Button>
        <div style={{ marginTop: 8, textAlign: 'center', fontFamily: T.gothic, fontSize: 10.5,
          color: T.sumiMuted, letterSpacing: 0.3 }}>
          {filled
            ? '変更は自動保存されます'
            : '★ を 1 つ以上つけると記録できます'}
        </div>
      </div>
    </Phone>
  );
}

function FeedbackEmpty() {
  const user = { initials: '松' };
  return (
    <div style={{ position: 'relative', width: W7, height: H7 }}>
      <FeedbackChrome filled={false} user={user}/>
      {/* annotations — overlay layer */}
      <div style={{ position: 'absolute', top: 254, right: 10, width: 168, zIndex: 6 }}>
        <Annot accent={T.shu}>
          <b style={{ fontFamily: T.mincho }}>★ 入力</b><br/>
          タップで点灯 (1〜5)。同じ★を再タップで <span style={{ color: '#E8B97A' }}>0 にクリア</span>。半星なし。
        </Annot>
      </div>
      <div style={{ position: 'absolute', top: 442, right: 10, width: 168, zIndex: 6 }}>
        <Annot accent={T.matcha}>
          <b style={{ fontFamily: T.mincho }}>観点別ドット</b><br/>
          5 つの ● をタップで設定。フォーカス時 <span style={{ fontFamily: T.mono }}>←→</span> で増減。タップした位置までを点灯。
        </Annot>
      </div>
    </div>
  );
}

function FeedbackFilled() {
  const user = { initials: '松' };
  return (
    <div style={{ position: 'relative', width: W7, height: H7 }}>
      <FeedbackChrome filled={true} user={user}/>
      {/* annotation */}
      <div style={{ position: 'absolute', top: 178, right: 10, width: 168, zIndex: 6 }}>
        <Annot accent={T.matcha}>
          <b style={{ fontFamily: T.mincho }}>下書きは自動</b><br/>
          明示的な「下書き保存」ボタンは廃止。3 秒 debounce で localStorage、サインイン中は同時に Firestore へ。
        </Annot>
      </div>
    </div>
  );
}

// ===================================================================
// S7-07 · Detail "作ってみる" CTA — 2 proposals + states
// ===================================================================
function MiniDetailHero({ saved }) {
  return (
    <div style={{ position: 'relative', height: 170, borderRadius: 14, overflow: 'hidden',
      background: 'radial-gradient(80% 70% at 50% 40%, #F2E1C7 0%, #C98947 100%)' }}>
      {/* back chip */}
      <div style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15,
        background: 'rgba(251,247,237,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Icon.chev('left', T.sumi, 12)}
      </div>
      {/* heart */}
      <div style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16,
        background: 'rgba(31,26,18,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)' }}>
        {Icon.heart(saved, T.shu, 16)}
      </div>
      {/* strategy seal */}
      <div style={{ position: 'absolute', top: 10, right: 50 }}>
        <div style={{ transform: 'scale(0.72)', transformOrigin: 'top right' }}>
          <StrategySeal kind="exploit" size={42}/>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 100, top: 8, transform: 'scale(0.65)', transformOrigin: 'top left' }}>
        {Pizzas.seriOyster(180)}
      </div>
    </div>
  );
}

function MiniDetailBody() {
  return (
    <div style={{ padding: '12px 0 0' }}>
      <div style={{ fontFamily: T.mincho, fontSize: 10, color: T.shu, letterSpacing: 3 }}>春 · 前菜の一枚</div>
      <div style={{ fontFamily: T.mincho, fontSize: 17, fontWeight: 600, color: T.sumi, marginTop: 4,
        lineHeight: 1.3 }}>
        松島牡蠣と仙台せりの<br/>春一枚
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, fontFamily: T.mono, fontSize: 10,
        color: T.sumiSoft }}>
        <span>⏱ 35 分</span><span>·</span><span>🔥 260℃</span><span>·</span><span>👥 4 人前</span>
      </div>
    </div>
  );
}

// CTA proposal A — primary button inline under hero, full-width
function DetailCTA_A({ state }) {
  // state: 'ready' | 'guest' | 'unsaved'
  const isGuest = state === 'guest';
  const isUnsaved = state === 'unsaved';
  const disabled = isGuest;
  return (
    <div style={{ marginTop: 12, padding: '14px 14px 14px', borderRadius: 14,
      background: T.kinari, border: `1px solid ${T.hairline}` }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, height: 48, borderRadius: 999,
          background: disabled ? 'rgba(31,26,18,0.08)' : T.shu,
          color: disabled ? T.sumiMuted : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: T.gothic, fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          boxShadow: disabled ? 'none' : '0 6px 18px rgba(200,65,42,0.32), inset 0 -2px 0 rgba(0,0,0,0.12)',
        }}>
          {Icon.flame(disabled ? T.sumiMuted : '#fff', 16)}
          作ってみる
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: 'transparent',
          border: `1px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon.heart(!isUnsaved && !isGuest, T.shu, 18)}
        </div>
      </div>
      <div style={{ marginTop: 8, fontFamily: T.gothic, fontSize: 10.5, color: T.sumiMuted,
        textAlign: 'center', lineHeight: 1.5 }}>
        {isGuest && <>サインインで「振り返り帳」に記録できます。 <span style={{ color: T.shu, textDecoration: 'underline' }}>サインイン</span></>}
        {isUnsaved && '保存しなくても作れます。記録は振り返り帳に残ります。'}
        {state === 'ready' && '作ったあと、★ で振り返りを残せます。'}
      </div>
    </div>
  );
}

// CTA proposal B — floating sticky bottom bar (segmented)
function DetailCTA_B({ state }) {
  const isGuest = state === 'guest';
  const isUnsaved = state === 'unsaved';
  const disabled = isGuest;
  return (
    <div style={{ marginTop: 12, position: 'relative' }}>
      {/* fake page scroll hint */}
      <div style={{ height: 40, background: 'linear-gradient(180deg, transparent, rgba(31,26,18,0.04))',
        borderRadius: '0 0 14px 14px' }}/>
      {/* sticky bar */}
      <div style={{ marginTop: 4, padding: '10px 10px', borderRadius: 28,
        background: T.sumi, color: '#fff', boxShadow: '0 12px 30px rgba(31,26,18,0.32)',
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon.heart(!isUnsaved && !isGuest, !isUnsaved && !isGuest ? T.shu : '#FBF7ED', 16)}
        </div>
        <div style={{ flex: 1, height: 44, borderRadius: 22,
          background: disabled ? 'rgba(255,255,255,0.08)' : T.shu,
          color: disabled ? 'rgba(251,247,237,0.4)' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: T.gothic, fontWeight: 700, fontSize: 13.5, letterSpacing: 0.5,
        }}>
          {Icon.flame(disabled ? 'rgba(251,247,237,0.4)' : '#fff', 15)}
          作ってみる
          {!disabled && Icon.arrow('#fff', 13)}
        </div>
      </div>
      <div style={{ marginTop: 8, fontFamily: T.gothic, fontSize: 10.5, color: T.sumiMuted,
        textAlign: 'center', lineHeight: 1.5 }}>
        {isGuest && <>サインインで作った記録を残せます · <span style={{ color: T.shu }}>サインイン →</span></>}
        {isUnsaved && '↑ どこからでも素早く呼び出せる固定 CTA'}
        {state === 'ready' && '↑ 詳細をスクロール中も画面下に残る浮遊バー'}
      </div>
    </div>
  );
}

function DetailCTAShowcase() {
  return (
    <div style={{ width: W7, height: H7, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, padding: '54px 0 0', overflow: 'auto',
      position: 'relative' }}>
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>SLICE 7 · 07</div>
        <div style={{ fontFamily: T.mincho, fontSize: 20, fontWeight: 600, color: T.sumi,
          marginTop: 5, lineHeight: 1.3 }}>
          「作ってみる」CTA<br/>
          <span style={{ color: T.sumiSoft, fontSize: 13 }}>2 案 × 3 状態の比較</span>
        </div>
      </div>

      {/* Option A */}
      <div style={{ margin: '14px 16px 0' }}>
        <Cap7 accent={T.shu}>案 A · 詳細内インラインカード (推奨)</Cap7>
        <div style={{ padding: 12, borderRadius: 16, background: T.kinari,
          border: `1px solid ${T.hairline}` }}>
          <MiniDetailHero saved/>
          <MiniDetailBody/>
          <DetailCTA_A state="ready"/>
        </div>
        <div style={{ marginTop: 8, fontSize: 10.5, color: T.sumiSoft, lineHeight: 1.6, paddingLeft: 4 }}>
          ハートと CTA を <b style={{ color: T.sumi }}>セット</b> で並べ、レシピ本文の前段に置く。<br/>
          ヒーロー直下なので画像の余韻を切らない。
        </div>
      </div>

      {/* Option A states */}
      <div style={{ margin: '16px 16px 0' }}>
        <Cap7 accent={T.sumiMuted}>案 A · 状態バリエーション</Cap7>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DetailCTA_A state="guest"/>
          <DetailCTA_A state="unsaved"/>
        </div>
      </div>

      {/* Option B */}
      <div style={{ margin: '22px 16px 0' }}>
        <Cap7 accent={T.ai}>案 B · 浮遊スティッキー (代案)</Cap7>
        <div style={{ padding: 12, borderRadius: 16, background: T.kinari,
          border: `1px solid ${T.hairline}` }}>
          <MiniDetailHero saved/>
          <MiniDetailBody/>
          <DetailCTA_B state="ready"/>
        </div>
        <div style={{ marginTop: 8, fontSize: 10.5, color: T.sumiSoft, lineHeight: 1.6, paddingLeft: 4 }}>
          スクロールしても常に手元に残る。<br/>
          欠点 : Header と上下に黒い帯が増え、画面の余韻が薄まる。
        </div>
      </div>

      <div style={{ margin: '16px 16px 24px' }}>
        <Cap7 accent={T.sumiMuted}>案 B · 状態バリエーション</Cap7>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DetailCTA_B state="guest"/>
          <DetailCTA_B state="unsaved"/>
        </div>
      </div>

      <div style={{ margin: '4px 16px 24px', padding: '12px 14px', borderRadius: 12,
        background: 'rgba(96,119,68,0.10)', border: `1px solid rgba(96,119,68,0.22)`,
        fontSize: 11, color: '#3F5028', lineHeight: 1.7 }}>
        <b style={{ fontFamily: T.mincho, fontSize: 12 }}>推奨 : 案 A</b><br/>
        既存の朱 CTA と一貫し、ヒーロー画像の余韻を活かせる。
        ハートとセットになることで「保存 → 作る → 振り返る」の流れが視覚的に閉じる。
      </div>
    </div>
  );
}

// ===================================================================
// Brand mark · 「ふるさとピザ帳」 logo system
// ===================================================================
// MarkA / MarkB / MarkC / MarkD / FurusatoMark / Wordmark are now
// defined in pizza-tokens.jsx so they are available across all screens.
// Adopted brand mark: Variant B (円窓ピザ + 和印).

// ───────────────────────────────────────────────────────────────────
// Brand showcase canvas
// ───────────────────────────────────────────────────────────────────
function BrandMarkShowcase() {
  const variants = [
    { id: 'A', jp: '和印 · ふ',     en: 'HANKO',    desc: '丸印に明朝の「ふ」。和の朱印体系を継承、シンプルでファビコンまで成立。' },
    { id: 'B', jp: '円窓ピザ + 和印', en: 'PIZZA×HANKO', desc: '六方対称のチーズ + せりと、クラスト右下に「ふ」の押印。料理の仕上げにシェフのサインを押したような一点。' },
    { id: 'C', jp: '帳印 · 縦組',   en: 'STAMP',    desc: '正方の朱印に「ふるさと/ピザ帳」を縦 2 列。古書の蔵書印を引用。' },
    { id: 'D', jp: '一切れ印',     en: 'SLICE',    desc: 'ピザ一切れ = ページの角 (栞)。「帳」のメタファーを形に。' },
  ];
  return (
    <div style={{ width: 1120, padding: '32px 36px 36px', background: T.washi,
      backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply', fontFamily: T.gothic,
      color: T.sumi, boxSizing: 'border-box' }}>
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.shu, letterSpacing: 6 }}>BRAND MARK · 比較</div>
      <div style={{ fontFamily: T.mincho, fontSize: 28, fontWeight: 600, color: T.sumi,
        marginTop: 8, lineHeight: 1.3 }}>
        「ふるさとピザ帳」<br/>ブランドマーク 4 案
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: T.sumiSoft, maxWidth: 760, lineHeight: 1.7 }}>
        和の<b style={{ color: T.sumi }}>印章 (はんこ)</b>の語彙で 4 方向に振りました。共通仕様 : 朱と生成りのみ・グラデなし・24px〜256px のレンジで成立。
        実装後はファビコン / Android adaptive icon / iOS app icon / Header / TOP の 5 用途に展開できます。
      </div>

      {/* 4 cards */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {variants.map(v => (
          <div key={v.id} style={{ padding: '20px 18px 18px', background: T.kinari, borderRadius: 14,
            border: `1px solid ${T.hairline}`, boxShadow: '0 1px 2px rgba(31,26,18,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 3 }}>変型 {v.id}</div>
                <div style={{ fontFamily: T.mincho, fontSize: 17, fontWeight: 600, color: T.sumi,
                  marginTop: 4 }}>{v.jp}</div>
                <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, marginTop: 3,
                  letterSpacing: 1.5 }}>{v.en}</div>
              </div>
            </div>

            {/* large mark */}
            <div style={{ marginTop: 16, height: 200, borderRadius: 10,
              background: 'rgba(31,26,18,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${T.hairline}` }}>
              <FurusatoMark variant={v.id} size={156}/>
            </div>

            {/* size ladder */}
            <div style={{ marginTop: 12, padding: '10px 0',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
              borderTop: `1px dashed ${T.hairline}`, borderBottom: `1px dashed ${T.hairline}` }}>
              {[48, 32, 24, 16].map(s => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <FurusatoMark variant={v.id} size={s}/>
                  <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 0.5 }}>{s}px</span>
                </div>
              ))}
            </div>

            {/* on dark */}
            <div style={{ marginTop: 10, height: 64, borderRadius: 8, background: T.sumi,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <FurusatoMark variant={v.id} size={36} dark/>
              <span style={{ fontFamily: T.mincho, fontSize: 13, color: '#FBF7ED', letterSpacing: 2 }}>
                ふるさとピザ帳
              </span>
            </div>

            <div style={{ marginTop: 12, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.7 }}>
              {v.desc}
            </div>

            {v.id === 'B' && (
              <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 999,
                background: 'rgba(96,119,68,0.12)', border: '1px solid rgba(96,119,68,0.28)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: T.mincho, fontSize: 10.5, fontWeight: 600, color: '#3F5028' }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: T.matcha }}/>
                採用
              </div>
            )}
            {v.id === 'A' && (
              <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 999,
                background: 'rgba(31,26,18,0.06)', border: '1px solid rgba(31,26,18,0.10)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: T.mincho, fontSize: 10.5, fontWeight: 500, color: T.sumiSoft }}>
                併用 · 16px 以下のファビコン用
              </div>
            )}
          </div>
        ))}
      </div>

      {/* wordmark */}
      <div style={{ marginTop: 28, padding: '22px 24px', borderRadius: 14, background: T.kinari,
        border: `1px solid ${T.hairline}` }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>WORDMARK · 文字組</div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 2, marginBottom: 12 }}>HORIZONTAL</div>
            <Wordmark kind="horizontal"/>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 2, marginBottom: 12 }}>STACKED</div>
            <Wordmark kind="stacked"/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 2, marginBottom: 12,
                textAlign: 'center' }}>VERTICAL</div>
              <div style={{ display: 'flex', justifyContent: 'center', height: 130 }}>
                <Wordmark kind="vertical"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* applications */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>APPLICATIONS · 当ててみる</div>
        <div style={{ fontFamily: T.mincho, fontSize: 18, fontWeight: 600, color: T.sumi, marginTop: 6,
          marginBottom: 14 }}>
          採用案 (変型 B · 円窓ピザ + 和印) を 4 用途に当てる
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {/* iOS app icon */}
          <AppItem caption="iOS App Icon · 1024">
            <div style={{ width: 160, height: 160, borderRadius: 36,
              background: T.kinari, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(31,26,18,0.08)' }}>
              <FurusatoMark variant="B" size={120}/>
            </div>
          </AppItem>
          {/* favicon 16/32 */}
          <AppItem caption="Favicon · 16 / 32 (A 併用)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 64, height: 56, background: '#E5E5E5', borderRadius: 6,
                display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}>
                <FurusatoMark variant="A" size={16}/>
                <span style={{ fontFamily: 'system-ui', fontSize: 9, color: '#555' }}>ふるさとピザ帳</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <FurusatoMark variant="A" size={32}/>
                <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted }}>32px</span>
              </div>
            </div>
          </AppItem>
          {/* header brand pill */}
          <AppItem caption="TOP · ブランドピル">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px 8px 8px', borderRadius: 999,
              background: T.kinari, border: `1px solid ${T.hairline}`,
              boxShadow: '0 1px 2px rgba(31,26,18,0.04)' }}>
              <FurusatoMark variant="B" size={28}/>
              <span style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi,
                letterSpacing: 2 }}>ふるさとピザ帳</span>
            </div>
          </AppItem>
          {/* dark surface */}
          <AppItem caption="Dark surface">
            <div style={{ width: 160, height: 160, borderRadius: 18, background: T.sumi,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <FurusatoMark variant="B" size={72}/>
              <span style={{ fontFamily: T.mincho, fontSize: 11, color: '#FBF7ED', letterSpacing: 3 }}>
                ふるさとピザ帳
              </span>
            </div>
          </AppItem>
        </div>
      </div>

      {/* spec footnote */}
      <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(31,26,18,0.04)', border: `1px solid ${T.hairline}`,
        fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.75 }}>
        <b style={{ fontFamily: T.mincho, fontSize: 12.5, color: T.sumi }}>共通スペック</b><br/>
        · 色: <span style={{ fontFamily: T.mono }}>{T.shu}</span> (朱) + <span style={{ fontFamily: T.mono }}>{T.kinari}</span> (生成り) のみ。ダーク背景時は反転<br/>
        · 余白: 印章のフチからアートボード端まで <span style={{ fontFamily: T.mono }}>≧ 0.1 × W</span> をクリアスペースとする<br/>
        · 16px 以下では「ふ」のみのモノクロ化 (細部脱落を避ける)<br/>
        · App Icon は背景に和紙テクスチャ、印は中央に <span style={{ fontFamily: T.mono }}>70%</span> 配置 (safe zone Apple HIG 準拠)
      </div>
    </div>
  );
}
function AppItem({ caption, children }) {
  return (
    <div style={{ padding: '18px 16px 16px', background: T.kinari, borderRadius: 12,
      border: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {children}
      <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, letterSpacing: 2 }}>{caption}</div>
    </div>
  );
}

// ===================================================================
// S7-08 · TOP brand exposure (bonus)
// ===================================================================
function TopRefresh() {
  return (
    <Phone>
      <div style={{ height: 54 }}/>

      {/* top ornament — brand mark */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 0' }}>
        <FurusatoMark variant="B" size={104}/>
      </div>

      {/* brand caption */}
      <div style={{ padding: '20px 32px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 6, fontWeight: 500 }}>
          地 元 × ピ ザ × A I
        </div>
        <div style={{
          margin: '14px auto 0', display: 'inline-flex', alignItems: 'baseline', gap: 10,
        }}>
          <span style={{ fontFamily: T.mincho, fontSize: 15, fontWeight: 600, color: T.sumi,
            letterSpacing: 4 }}>ふるさとピザ帳</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3 }}>FURUSATO PIZZA-CHŌ</span>
        </div>

        <div style={{ fontFamily: T.mincho, fontSize: 32, fontWeight: 600, color: T.sumi,
          marginTop: 22, lineHeight: 1.35, letterSpacing: 1 }}>
          未来の一枚は、<br/>あなたの地元にある。
        </div>
        <div style={{ fontSize: 12.5, color: T.sumiSoft, marginTop: 20, lineHeight: 1.85, letterSpacing: 0.3 }}>
          地元の食材と季節から、<br/>
          AI があなただけのピザを 3 案提案。<br/>
          気に入った 1 枚は「ピザ帳」に残せます。
        </div>
      </div>

      {/* CTAs */}
      <div style={{ position: 'absolute', left: 32, right: 32, bottom: 100,
        display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <div style={{ width: '100%', height: 52, borderRadius: 999,
          background: T.shu, color: '#fff',
          boxShadow: '0 6px 18px rgba(200,65,42,0.32), inset 0 -2px 0 rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: T.gothic, fontWeight: 700, fontSize: 15, letterSpacing: 0.6 }}>
          始める {Icon.arrow('#fff', 14)}
        </div>
        <div style={{ fontSize: 12, color: T.sumiMuted, fontFamily: T.gothic,
          textDecoration: 'underline', textDecorationColor: 'rgba(146,133,113,0.4)',
          textUnderlineOffset: 3 }}>
          サインインしてピザ帳を開く
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 50, textAlign: 'center',
        fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>
        FURUSATO PIZZA-CHO · 2026
      </div>
    </Phone>
  );
}

Object.assign(window, {
  HeaderRow7, HeaderDropdown,
  HeaderShowcaseV2,
  LibraryRefresh,
  JournalEmpty, JournalList,
  FeedbackEmpty, FeedbackFilled,
  DetailCTAShowcase, MiniDetailHero, MiniDetailBody,
  TopRefresh,
  BrandMarkShowcase,
});
