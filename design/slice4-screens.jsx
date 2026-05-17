// slice4-screens.jsx — Top page, Sign-in (3 variants), Library, Heart states, Toasts
// All static design artboards for the design canvas. Uses tokens from pizza-tokens.jsx
// and Phone/Tap/PrimaryBtn/GhostBtn exported by prototype-app.jsx.

const W = 393;
const H = 852;

// ── Small helpers ───────────────────────────────────────────────────
function Note({ x, y, w, anchor = 'left', children, accent }) {
  // Floating annotation pill placed beside / outside the phone.
  return (
    <div style={{
      position: 'absolute', top: y, [anchor]: x, width: w,
      padding: '10px 12px', borderRadius: 8,
      background: 'rgba(31,26,18,0.88)', color: '#FBF7ED',
      fontFamily: T.gothic, fontSize: 11, lineHeight: 1.6,
      borderLeft: `3px solid ${accent || T.shu}`,
      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
      letterSpacing: 0.2, zIndex: 5,
    }}>{children}</div>
  );
}

// Mini Google "G" mark, official-ish 4 colors. SVG only.
function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.46-.81 5.95-2.19l-2.9-2.26c-.81.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3.02-2.32z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.43 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .95 4.97L3.97 7.3C4.68 5.18 6.66 3.58 9 3.58z"/>
    </svg>
  );
}

function GoogleButton({ width = '100%', label = 'Google で続ける' }) {
  return (
    <div style={{
      width, height: 50, borderRadius: 999,
      background: '#fff', color: '#1F1F1F',
      border: '1px solid rgba(0,0,0,0.12)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: 500, fontSize: 14, letterSpacing: 0.2,
    }}>
      <GoogleG size={18}/>
      <span>{label}</span>
    </div>
  );
}

function Avatar({ size = 36, initials = 'M', src, dark }) {
  if (src) return (
    <div style={{ width: size, height: size, borderRadius: size, overflow: 'hidden',
      boxShadow: `0 0 0 1.5px ${dark ? 'rgba(255,255,255,0.4)' : T.hairline}` }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
    </div>
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: `linear-gradient(135deg, ${T.shu}, ${T.yamabuki})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.mincho, fontWeight: 600, fontSize: size * 0.45, color: '#fff',
      boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
    }}>{initials}</div>
  );
}

// ===================================================================
// 08 · Top page (`/`)
// ===================================================================
function TopScreen() {
  return (
    <Phone>
      <div style={{ height: 54 }}/>

      {/* top ornament: 3 seals */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '24px 0 0',
        opacity: 0.42 }}>
        {['exploit', 'tune', 'explore'].map(k => (
          <div key={k} style={{ transform: 'scale(0.7)' }}>
            <StrategySeal kind={k} size={48}/>
          </div>
        ))}
      </div>

      {/* center content */}
      <div style={{ padding: '60px 32px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.shu, letterSpacing: 6, fontWeight: 500 }}>
          地 元 × ピ ザ × AI
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 36, fontWeight: 600, color: T.sumi,
          marginTop: 26, lineHeight: 1.35, letterSpacing: 1 }}>
          未来の一枚は、<br/>あなたの地元にある。
        </div>
        <div style={{ fontSize: 13, color: T.sumiSoft, marginTop: 24, lineHeight: 1.85, letterSpacing: 0.3 }}>
          地元の食材と季節から、<br/>
          AI があなただけのピザを 3 案提案。<br/>
          気に入った 1 枚は「ピザ帳」に残せます。
        </div>
      </div>

      {/* CTAs */}
      <div style={{ position: 'absolute', left: 32, right: 32, bottom: 100,
        display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <PrimaryBtn style={{ width: '100%' }}>
          始める {Icon.arrow('#fff', 14)}
        </PrimaryBtn>
        <div style={{ fontSize: 12, color: T.sumiSoft, fontFamily: T.gothic,
          display: 'inline-flex', alignItems: 'center', gap: 4, letterSpacing: 0.3 }}>
          すでにはじめている方
          <span style={{ color: T.shu }}>→</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: T.sumiMuted, fontFamily: T.gothic,
          textDecoration: 'underline', textDecorationColor: 'rgba(146,133,113,0.4)', textUnderlineOffset: 3 }}>
          サインインしてピザ帳を開く
        </div>
      </div>

      {/* footer */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 50, textAlign: 'center',
        fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>
        MAKE LOCAL PIZZA RECIPE AGENT · 2026
      </div>
    </Phone>
  );
}

// ===================================================================
// 09a · Sign-in case A — Avatar + dropdown
// ===================================================================
function HeaderShowcase() {
  // Three header states stacked vertically with annotations.
  return (
    <div style={{ width: W, height: H, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, padding: '54px 0 0', overflow: 'hidden' }}>
      <div style={{ padding: '12px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>SIGN-IN · CASE A</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 6, lineHeight: 1.35 }}>
          ヘッダーに常駐する<br/>アバター + Dropdown
        </div>
        <div style={{ fontSize: 11, color: T.sumiSoft, marginTop: 8, lineHeight: 1.7 }}>
          Firebase popup を即起動、画面遷移なし。<br/>
          認証後はヘッダ右上のみが変化。
        </div>
      </div>

      {/* state 1: signed out */}
      <div style={{ margin: '24px 16px 0' }}>
        <Caption>① 未サインイン</Caption>
        <HeaderRow>
          <BackChip/>
          <Title>ピザ帳</Title>
          <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiMuted, textDecoration: 'underline',
            textDecorationColor: 'rgba(146,133,113,0.4)', textUnderlineOffset: 2 }}>サインイン</span>
        </HeaderRow>
      </div>

      {/* state 2: signed in collapsed */}
      <div style={{ margin: '16px 16px 0' }}>
        <Caption>② サインイン済み・閉</Caption>
        <HeaderRow>
          <BackChip/>
          <Title>ピザ帳</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Avatar size={32} initials="M"/>
            {Icon.chev('down', T.sumiSoft, 12)}
          </div>
        </HeaderRow>
      </div>

      {/* state 3: dropdown open */}
      <div style={{ margin: '16px 16px 0', position: 'relative' }}>
        <Caption>③ Dropdown 展開時</Caption>
        <HeaderRow>
          <BackChip/>
          <Title>ピザ帳</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Avatar size={32} initials="M"/>
            {Icon.chev('up', T.sumiSoft, 12)}
          </div>
        </HeaderRow>
        {/* dropdown */}
        <div style={{
          position: 'absolute', top: 70, right: 8, width: 220,
          background: T.kinari, borderRadius: 12, border: `1px solid ${T.hairline}`,
          boxShadow: '0 14px 36px rgba(31,26,18,0.18), 0 2px 6px rgba(31,26,18,0.08)',
          overflow: 'hidden', zIndex: 5,
        }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: `1px solid ${T.hairline}` }}>
            <Avatar size={32} initials="M"/>
            <div>
              <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi }}>松島 一郎</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, marginTop: 1 }}>matsushima@…</div>
            </div>
          </div>
          <DropItem icon="📔" label="ピザ帳を開く"/>
          <div style={{ height: 1, background: T.hairline, margin: '0 12px' }}/>
          <DropItem label="サインアウト" muted/>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 48,
        padding: '10px 14px', borderRadius: 10, background: T.kinari,
        border: `1px solid ${T.hairline}`, fontSize: 11, color: T.sumiSoft, lineHeight: 1.7 }}>
        <b style={{ color: T.sumi, fontFamily: T.mincho }}>共通注意書</b><br/>
        サインインすると Firestore にレシピを保存します。<br/>
        ゲストとしての閲覧はサインインなしでも続けられます。
      </div>
    </div>
  );
}

function Caption({ children }) {
  return <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3, marginBottom: 6, paddingLeft: 4 }}>
    {children}
  </div>;
}
function HeaderRow({ children }) {
  return <div style={{
    height: 48, padding: '0 12px', background: T.kinari, borderRadius: 10,
    border: `1px solid ${T.hairline}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
  }}>{children}</div>;
}
function BackChip() {
  return <div style={{
    width: 32, height: 32, borderRadius: 16, background: 'rgba(31,26,18,0.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>{Icon.chev('left', T.sumi, 14)}</div>;
}
function Title({ children }) {
  return <div style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600, color: T.sumi }}>{children}</div>;
}
function DropItem({ icon, label, muted }) {
  return (
    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: T.gothic, fontSize: 13, fontWeight: 500,
      color: muted ? T.sumiSoft : T.sumi }}>
      {icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {Icon.chev('right', T.sumiMuted, 12)}
    </div>
  );
}

// ===================================================================
// 09b · Sign-in case B — Dedicated /signin page
// ===================================================================
function SignInPage() {
  return (
    <Phone>
      <div style={{ height: 54 }}/>
      {/* top: dismiss */}
      <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18, background: T.kinari,
          border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: T.sumiSoft,
        }}>✕</div>
      </div>

      {/* main card */}
      <div style={{ padding: '60px 28px 0' }}>
        <div style={{
          background: T.kinari, borderRadius: 20, padding: '32px 24px 24px',
          border: `1px solid ${T.hairline}`,
          boxShadow: '0 18px 40px rgba(31,26,18,0.10), 0 2px 6px rgba(31,26,18,0.06)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {/* watermark seal */}
          <div style={{ position: 'absolute', top: -12, right: -12, opacity: 0.10, transform: 'rotate(8deg)' }}>
            <StrategySeal kind="exploit" size={92}/>
          </div>

          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 5 }}>SIGN IN</div>
          <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi,
            marginTop: 12, lineHeight: 1.45 }}>
            ピザ帳を使うには、<br/>サインインしてください。
          </div>
          <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 14, lineHeight: 1.75 }}>
            Google アカウントで続けると、<br/>
            気に入った一枚を Firestore に保存できます。
          </div>

          <div style={{ marginTop: 28 }}>
            <GoogleButton/>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: T.sumiMuted,
            display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ textDecoration: 'underline', textDecorationColor: 'rgba(146,133,113,0.4)',
              textUnderlineOffset: 3 }}>やめて戻る</span>
          </div>
        </div>

        {/* secondary note */}
        <div style={{ marginTop: 22, padding: '12px 14px', borderRadius: 12,
          background: 'rgba(62,86,112,0.07)', border: `1px solid rgba(62,86,112,0.14)`,
          fontSize: 11, color: T.ai, lineHeight: 1.7, display: 'flex', gap: 10 }}>
          <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>ⓘ</span>
          <span>
            ゲストとしての閲覧はサインインなしでも続けられます。
            保存・再訪問にだけサインインを使います。
          </span>
        </div>

        {/* error state preview */}
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(200,65,42,0.08)', border: `1px solid rgba(200,65,42,0.20)`,
          fontSize: 11, color: T.shuDeep, display: 'flex', gap: 8, lineHeight: 1.65 }}>
          <span style={{ fontFamily: T.mono, fontWeight: 700, flexShrink: 0 }}>⚠</span>
          <span><b style={{ fontFamily: T.mincho }}>ネットワークに繋がりませんでした。</b><br/>
            電波の良い場所でもう一度お試しください。</span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 50, textAlign: 'center',
        fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>
        /signin?next=/recipes/xyz
      </div>
    </Phone>
  );
}

// ===================================================================
// 09c · Sign-in case C — Modal overlay
// ===================================================================
function SignInModal() {
  return (
    <Phone>
      {/* faux underlying page (recipe detail) */}
      <div style={{ position: 'absolute', inset: 0, filter: 'blur(0.5px)' }}>
        <div style={{ height: 54 }}/>
        <div style={{ height: 320, background: 'radial-gradient(80% 70% at 50% 40%, #F2E1C7 0%, #C98947 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Pizzas.seriOyster(200)}
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: T.mincho, fontSize: 11, color: T.shu, letterSpacing: 4 }}>宮城県 · 春の一枚</div>
          <div style={{ fontFamily: T.mincho, fontSize: 20, fontWeight: 600, color: T.sumi, marginTop: 4, lineHeight: 1.35 }}>
            松島牡蠣と仙台せりの春一枚
          </div>
        </div>
      </div>

      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(31,26,18,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}/>

      {/* modal */}
      <div style={{
        position: 'absolute', left: 24, right: 24, top: 200,
        background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
        borderRadius: 20, padding: '24px 22px 22px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.18)',
        border: '1px solid rgba(31,26,18,0.20)',
      }}>
        {/* handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.hairline, margin: '0 auto 16px' }}/>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 5, textAlign: 'center' }}>SIGN IN</div>
        <div style={{ fontFamily: T.mincho, fontSize: 19, fontWeight: 600, color: T.sumi, marginTop: 10,
          textAlign: 'center', lineHeight: 1.4 }}>
          一枚を、ピザ帳に。
        </div>
        <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
          Google で続けると保存できます。<br/>
          閲覧はそのまま続けられます。
        </div>

        <div style={{ marginTop: 20 }}>
          <GoogleButton/>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: T.sumiMuted, fontFamily: T.gothic,
            textDecoration: 'underline', textDecorationColor: 'rgba(146,133,113,0.4)',
            textUnderlineOffset: 3 }}>やめる</span>
        </div>

        <div style={{ marginTop: 14, padding: '8px 10px', borderRadius: 8,
          background: 'rgba(31,26,18,0.04)', fontSize: 10, color: T.sumiMuted, lineHeight: 1.6,
          textAlign: 'center' }}>
          Firestore にレシピを保存します。
        </div>
      </div>
    </Phone>
  );
}

// ===================================================================
// 10 · Library — saved recipes
// ===================================================================
const LIB_SAVED = [
  { id: '01', title: '松島牡蠣と仙台せりの春一枚',         locale: '宮城',  kind: 'exploit', date: '2026.05.12', pizza: 'seriOyster' },
  { id: '02', title: '牡蠣のクリーム、せりは仕上げに',       locale: '宮城',  kind: 'tune',    date: '2026.05.04', pizza: 'oysterClassic' },
  { id: '03', title: '春霞、せりと牡蠣の余白',              locale: '宮城',  kind: 'explore', date: '2026.04.21', pizza: 'exploreMix' },
  { id: '04', title: '亘理パプリカと蔵王モッツァ',           locale: '宮城',  kind: 'exploit', date: '2026.04.03', pizza: 'paprikaMozza' },
  { id: '05', title: '名取せり、根まで一枚',                locale: '宮城',  kind: 'tune',    date: '2026.03.18', pizza: 'seriClassic' },
];

function LibraryScreen({ empty = false }) {
  return (
    <Phone>
      <div style={{ height: 54 }}/>
      {/* topRow: avatar is now a direct link to /library (no dropdown) */}
      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: T.kinari,
          border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon.chev('left', T.sumi, 14)}
        </div>
        <div style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600, color: T.sumi }}>ピザ帳</div>
        <Avatar size={32} initials="M"/>
      </div>

      {/* hero */}
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 5 }}>MY LIBRARY</div>
        <div style={{ fontFamily: T.mincho, fontSize: 26, fontWeight: 600, color: T.sumi,
          marginTop: 6, lineHeight: 1.35 }}>
          あなたの一枚を、<br/>集める。
        </div>
        {!empty && (
          <div style={{ marginTop: 10, fontFamily: T.gothic, fontSize: 13, color: T.sumiSoft }}>
            保存中 <span style={{ color: T.sumi, fontWeight: 700, fontFamily: T.mono }}>{LIB_SAVED.length}</span> 件
          </div>
        )}
      </div>

      {/* profile strip — sign-out access lives here, not in a header dropdown */}
      <div style={{ margin: '14px 16px 0', padding: '10px 12px', borderRadius: 12,
        background: T.kinari, border: `1px solid ${T.hairline}`,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={36} initials="M"/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi }}>松島 一郎</div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, marginTop: 1, letterSpacing: 0.5 }}>matsushima@gmail.com</div>
        </div>
        <div style={{ padding: '5px 10px', borderRadius: 999, background: 'transparent',
          border: `1px solid ${T.hairline}`, fontFamily: T.gothic, fontSize: 11, fontWeight: 600,
          color: T.sumiSoft, letterSpacing: 0.5 }}>サインアウト</div>
      </div>

      {empty ? (
        <div style={{ padding: '60px 28px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <div style={{
              width: 120, height: 120, borderRadius: 60,
              background: T.kinari, border: `1px dashed ${T.sumiMuted}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Icon.heart(false, T.sumiMuted, 38)}
            </div>
          </div>
          <div style={{ fontFamily: T.mincho, fontSize: 20, fontWeight: 600, color: T.sumi, lineHeight: 1.45 }}>
            まだ保存したピザは、<br/>ありません。
          </div>
          <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 12, lineHeight: 1.85 }}>
            気になる一枚に出会ったら、<br/>
            ハートで集めましょう。
          </div>
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 220 }}>
              <PrimaryBtn>ピザを探す {Icon.arrow('#fff', 14)}</PrimaryBtn>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 16px 60px', display: 'flex', flexDirection: 'column', gap: 10,
          height: 'calc(100% - 308px)', overflowY: 'auto' }}>
          {LIB_SAVED.map(it => <LibraryCard key={it.id} item={it}/>)}
          <div style={{ textAlign: 'center', padding: '8px 0 0', fontFamily: T.mincho,
            fontSize: 10, color: T.sumiMuted, letterSpacing: 3 }}>
            ── 以上、{LIB_SAVED.length} 件 ──
          </div>
        </div>
      )}
    </Phone>
  );
}

function LibraryCard({ item }) {
  const seal = { exploit: { jp: '王道', ink: T.exploitInk, bg: T.exploitBg },
                 tune:    { jp: '一歩外す', ink: T.tuneInk,    bg: T.tuneBg },
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
          <span style={{ fontFamily: T.gothic, fontSize: 10, color: T.sumiSoft }}>
            {item.locale}
          </span>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, marginTop: 6, letterSpacing: 1 }}>
          {item.date}
        </div>
      </div>
      <div style={{ flexShrink: 0, padding: 6 }}>
        {Icon.heart(true, T.shu, 20)}
      </div>
    </div>
  );
}

// ===================================================================
// 12 · Heart states + toast — overlay showcase
// ===================================================================
function HeartShowcase() {
  return (
    <div style={{ width: W, height: H, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, padding: '54px 0 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: '10px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>DETAIL · HEART</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 6, lineHeight: 1.35 }}>
          ハートの 3 状態と<br/>保存トースト
        </div>
      </div>

      {/* three mini hero crops */}
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <HeartMiniHero state="guest"  caption="① 未サインイン"  sub="タップで案内文を表示 → サインイン UI へ"/>
        <HeartMiniHero state="empty"  caption="② サインイン済・未保存" sub="タップで朱に塗り、トースト表示"/>
        <HeartMiniHero state="saved"  caption="③ サインイン済・保存済み" sub="タップで解除、解除トースト表示"/>
      </div>

      {/* toast */}
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 64 }}>
        <Toast kind="success" message="ピザ帳に保存しました" auto/>
      </div>
    </div>
  );
}

function HeartMiniHero({ state, caption, sub }) {
  const filled = state === 'saved';
  const ghostColor = state === 'guest' ? 'rgba(255,255,255,0.55)' : T.shu;
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3, marginBottom: 5, paddingLeft: 4 }}>{caption}</div>
      <div style={{ position: 'relative', height: 110, borderRadius: 14, overflow: 'hidden',
        background: 'radial-gradient(80% 70% at 50% 40%, #F2E1C7 0%, #C98947 100%)',
        border: `1px solid ${T.hairline}` }}>
        {/* back chip */}
        <div style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderRadius: 15,
          background: 'rgba(251,247,237,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon.chev('left', T.sumi, 12)}
        </div>
        {/* heart */}
        <div style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16,
          background: 'rgba(31,26,18,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)' }}>
          {Icon.heart(filled, filled ? T.shu : ghostColor, 16)}
        </div>
        {/* pizza preview */}
        <div style={{ position: 'absolute', left: 84, top: 4, transform: 'scale(0.5)', transformOrigin: 'top left' }}>
          {Pizzas.seriOyster(180)}
        </div>
        {/* sub hint for guest state */}
        {state === 'guest' && (
          <div style={{ position: 'absolute', right: 50, top: 12, padding: '4px 8px', borderRadius: 6,
            background: 'rgba(31,26,18,0.78)', color: '#FBF7ED', fontSize: 9, fontFamily: T.gothic, letterSpacing: 0.3 }}>
            サインインしてピザ帳に保存
          </div>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: T.sumiSoft, paddingLeft: 4, lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

// ===================================================================
// Reusable Toast (kind + message)
// ===================================================================
function Toast({ kind = 'success', message, auto, closable = false }) {
  const tones = {
    success: { ink: T.shu,    icon: '✓' },
    info:    { ink: T.ai,     icon: 'ⓘ' },
    warning: { ink: T.yamabuki, icon: '⚠' },
  };
  const t = tones[kind];
  return (
    <div style={{
      background: T.washiDeep, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      border: `1px solid ${T.hairline}`,
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 14px 36px rgba(31,26,18,0.18), 0 2px 6px rgba(31,26,18,0.10)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: t.ink }}/>
      <div style={{ width: 28, height: 28, borderRadius: 14, background: `${t.ink}1F`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.ink, fontFamily: T.mono, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{t.icon}</div>
      <div style={{ flex: 1, fontFamily: T.gothic, fontSize: 13, color: T.sumi, lineHeight: 1.55, letterSpacing: 0.2 }}>
        {message}
      </div>
      {closable && (
        <div style={{ fontSize: 14, color: T.sumiMuted, padding: '0 4px' }}>✕</div>
      )}
      {auto && (
        <div style={{ position: 'absolute', left: 3, right: 0, bottom: 0, height: 2, background: 'rgba(31,26,18,0.06)' }}>
          <div style={{ width: '40%', height: '100%', background: t.ink, opacity: 0.5 }}/>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// 13 · Toast variants showcase
// ===================================================================
function ToastShowcase() {
  return (
    <div style={{ width: W, height: H, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, padding: '54px 0 0', overflow: 'hidden' }}>
      <div style={{ padding: '10px 24px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>COMMON · TOAST</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 6, lineHeight: 1.35 }}>
          3 トーンの通知<br/>コンポーネント
        </div>
        <div style={{ fontSize: 11, color: T.sumiSoft, marginTop: 8, lineHeight: 1.7 }}>
          画面下中央 / 自動 close (2.5s) / 手動 close 可。<br/>
          朱の細い縦線でトーンを示します。
        </div>
      </div>

      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ShowItem caption="① success — 朱">
          <Toast kind="success" message="ピザ帳に保存しました" auto/>
        </ShowItem>
        <ShowItem caption="② info — 藍">
          <Toast kind="info" message="サインインしました。ピザ帳が使えます。" auto/>
        </ShowItem>
        <ShowItem caption="③ warning — 山吹">
          <Toast kind="warning" message="ネットワークに繋がりませんでした。" closable/>
        </ShowItem>
        <ShowItem caption="④ 2 行 + ✕ で手動 close">
          <Toast kind="success" message={<><b style={{ fontFamily: T.mincho }}>保存を解除しました</b><br/><span style={{ color: T.sumiSoft, fontSize: 12 }}>もう一度ハートで戻せます。</span></>} closable/>
        </ShowItem>
      </div>

      {/* anatomy note */}
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 50,
        padding: '10px 12px', borderRadius: 10, background: 'rgba(31,26,18,0.04)',
        fontSize: 10, color: T.sumiSoft, lineHeight: 1.65, fontFamily: T.mono, letterSpacing: 0.5 }}>
        ANATOMY · accent-bar 3px · radius 14 · padding 14×16 · shadow lg
      </div>
    </div>
  );
}

function ShowItem({ caption, children }) {
  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3, marginBottom: 6, paddingLeft: 4 }}>{caption}</div>
      {children}
    </div>
  );
}

Object.assign(window, {
  TopScreen, HeaderShowcase, SignInPage, SignInModal,
  LibraryScreen, HeartShowcase, ToastShowcase, Toast, Avatar, GoogleButton, GoogleG,
});
