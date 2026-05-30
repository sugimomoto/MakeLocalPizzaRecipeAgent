// slice8-screens.jsx — Slice 8 design proposal canvases
// 「ふるさとピザ帳」 — ENRO 推奨 + 機材プロファイル切替。
// Uses tokens from pizza-tokens.jsx; reuses Phone / Pizzas / Icon / Chip /
// StrategySeal / HeaderRow7 / HeaderDropdown / Avatar / Annot / Cap7.

const W8 = 393;
const H8 = 852;
const SAFE_TOP_8 = 54;
const SAFE_BOT_8 = 34;

// LP artboard size — not a phone frame; a tall scrollable web canvas.
const LP_W = 720;

// ── Small shared helpers ────────────────────────────────────────────
// External-link arrow (top-right)
const ExtLink = (c = '#fff', s = 14) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
    <path d="M6 3h7v7M13 3L7 9M11 12v1H3V5h1" stroke={c} strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ENRO line-art placeholder. Boxy electric pizza oven seen from 3/4.
// Used in the hero. Intentionally schematic — meant to be replaced by a
// real product photo before launch.
function OvenIllustration({ width = 360, ink = T.sumi, accent = T.shu }) {
  const h = Math.round(width * 0.72);
  return (
    <svg width={width} height={h} viewBox="0 0 360 260" fill="none" aria-label="ENRO 電気ピザ窯 (placeholder)">
      {/* counter line */}
      <line x1="14" y1="232" x2="346" y2="232" stroke={ink} strokeWidth="1" opacity="0.18"/>
      {/* chimney */}
      <rect x="170" y="14" width="22" height="34" rx="2" fill="none" stroke={ink} strokeWidth="1.4"/>
      <path d="M178 14c-2-6 6-8 8-2" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <path d="M184 14c-1.5-4 4-5 5-1" stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
      {/* body */}
      <rect x="40" y="48" width="280" height="170" rx="14" fill={T.kinari} stroke={ink} strokeWidth="1.6"/>
      {/* top panel divider */}
      <line x1="40" y1="86" x2="320" y2="86" stroke={ink} strokeWidth="1" opacity="0.3"/>
      {/* brand strip */}
      <text x="56" y="74" fontFamily={T.mono} fontSize="11" letterSpacing="6" fill={ink} opacity="0.55">ELECTRIC · 400°C</text>
      {/* dial */}
      <circle cx="290" cy="68" r="9" fill="none" stroke={ink} strokeWidth="1.4"/>
      <line x1="290" y1="68" x2="290" y2="62" stroke={accent} strokeWidth="1.6" strokeLinecap="round"/>
      {/* door (round window) */}
      <rect x="58" y="98" width="244" height="106" rx="10" fill="rgba(31,26,18,0.05)" stroke={ink} strokeWidth="1.3"/>
      <circle cx="180" cy="151" r="48" fill="none" stroke={ink} strokeWidth="1.5"/>
      <circle cx="180" cy="151" r="44" fill="url(#flameGlow8)"/>
      {/* fire inside */}
      <defs>
        <radialGradient id="flameGlow8" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#FFD37A"/>
          <stop offset="55%" stopColor="#E07A2B"/>
          <stop offset="100%" stopColor="#8E2F18"/>
        </radialGradient>
      </defs>
      {/* tiny pizza inside */}
      <g transform="translate(180 151) scale(0.18)">
        <circle r="100" fill="#E2A35F"/>
        <circle r="86" fill="#A8331C"/>
        <circle r="78" fill="#F4C944"/>
        <circle cx="-26" cy="-18" r="14" fill="#D44A2A"/>
        <circle cx="22" cy="14" r="14" fill="#D44A2A"/>
        <circle cx="-10" cy="32" r="12" fill="#D44A2A"/>
        <ellipse cx="14" cy="-28" rx="10" ry="5" fill="#5B7C3A"/>
      </g>
      {/* handle */}
      <line x1="76" y1="218" x2="284" y2="218" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
      <line x1="76" y1="218" x2="76" y2="210" stroke={ink} strokeWidth="1.6"/>
      <line x1="284" y1="218" x2="284" y2="210" stroke={ink} strokeWidth="1.6"/>
      {/* feet */}
      <line x1="62" y1="232" x2="62" y2="240" stroke={ink} strokeWidth="2"/>
      <line x1="298" y1="232" x2="298" y2="240" stroke={ink} strokeWidth="2"/>
      {/* power cord trailing right */}
      <path d="M320 200 Q344 210 340 232" stroke={ink} strokeWidth="1.4" fill="none" opacity="0.7"/>
    </svg>
  );
}

// Image frame — the wrapper that surrounds the placeholder. Acts as a
// real image slot when a photo is later dropped in, otherwise wraps the
// schematic illustration with a small "placeholder" tag (top-right).
function ImageSlot({ width, height, caption, children, accent = T.shu, src, alt }) {
  const hasImage = !!src;
  // Caption defaults: 「仮」 in placeholder mode, none with a real image.
  // Caller can still pass an explicit string to override.
  const captionText = caption === undefined ? (hasImage ? null : '機材写真 · 仮') : caption;
  // When src is provided, render the actual image full-bleed and drop the
  // placeholder corner-ticks + caption (a real photo doesn't need a frame to
  // not-look-broken). Caller can still override caption explicitly.
  return (
    <div style={{
      width, height, borderRadius: 18, position: 'relative', overflow: 'hidden',
      background: T.kinari, backgroundImage: hasImage ? 'none' : WASHI_NOISE,
      backgroundBlendMode: 'multiply',
      border: `1px solid ${T.hairline}`,
      boxShadow: '0 14px 36px rgba(31,26,18,0.10), 0 2px 6px rgba(31,26,18,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {hasImage && (
        <img src={src} alt={alt || ''} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', display: 'block',
        }}/>
      )}
      {/* corner tick marks (cinematic frame feel) — placeholder mode only */}
      {!hasImage && [[12,12,'tl'],[12,12,'tr'],[12,12,'bl'],[12,12,'br']].map(([w,h,p], i) => {
        const pos = ['tl','tr','bl','br'][i];
        return (
          <div key={pos} style={{
            position: 'absolute',
            top:    pos.startsWith('t') ? 10 : 'auto',
            bottom: pos.startsWith('b') ? 10 : 'auto',
            left:   pos.endsWith('l')   ? 10 : 'auto',
            right:  pos.endsWith('r')   ? 10 : 'auto',
            width: 14, height: 14,
            borderTop:    pos.startsWith('t') ? `1.5px solid ${T.sumiMuted}` : 'none',
            borderBottom: pos.startsWith('b') ? `1.5px solid ${T.sumiMuted}` : 'none',
            borderLeft:   pos.endsWith('l')   ? `1.5px solid ${T.sumiMuted}` : 'none',
            borderRight:  pos.endsWith('r')   ? `1.5px solid ${T.sumiMuted}` : 'none',
            opacity: 0.45,
          }}/>
        );
      })}
      {children}
      {captionText && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          padding: '4px 10px', borderRadius: 999, background: 'rgba(31,26,18,0.78)',
          color: '#FBF7ED', fontFamily: T.mono, fontSize: 9.5, letterSpacing: 2,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: accent }}/>
          {captionText}
        </div>
      )}
    </div>
  );
}

// LP section eyebrow (centered)
function Eyebrow8({ children, accent = T.shu, center }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      justifyContent: center ? 'center' : 'flex-start',
    }}>
      <span style={{ width: 18, height: 1, background: accent }}/>
      <span style={{ fontFamily: T.mono, fontSize: 10.5, color: accent, letterSpacing: 5 }}>{children}</span>
      <span style={{ width: 18, height: 1, background: accent }}/>
    </div>
  );
}

// Primary CTA — full-width shu button with optional external-link icon.
function CtaShu({ children, external, small, style }) {
  return (
    <div style={{
      height: small ? 48 : 56, padding: '0 22px', borderRadius: 999,
      background: T.shu, color: '#fff',
      boxShadow: '0 10px 26px rgba(200,65,42,0.32), inset 0 -2px 0 rgba(0,0,0,0.12)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: T.gothic, fontWeight: 700, fontSize: small ? 14 : 15.5, letterSpacing: 0.6,
      ...style,
    }}>
      {children}
      {external && ExtLink('#fff', small ? 13 : 14)}
    </div>
  );
}

// Ghost CTA — outlined matcha.
function CtaGhost({ children, small, accent = T.matcha, style }) {
  return (
    <div style={{
      height: small ? 48 : 56, padding: '0 22px', borderRadius: 999,
      background: 'transparent', border: `1.5px solid ${accent}`,
      color: accent,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: T.gothic, fontWeight: 700, fontSize: small ? 14 : 15.5, letterSpacing: 0.6,
      ...style,
    }}>{children}</div>
  );
}

// ===================================================================
// HERO
// ===================================================================
function HeroSection({ standalone }) {
  return (
    <section style={{
      position: 'relative',
      padding: standalone ? '64px 56px 64px' : '88px 56px 72px',
      background: standalone ? 'transparent' : 'transparent',
    }}>
      {/* vertical stamp on right */}
      <div style={{
        position: 'absolute', top: 36, right: 28,
        writingMode: 'vertical-rl', fontFamily: T.mincho, fontWeight: 500,
        fontSize: 11, color: T.shu, letterSpacing: 5, opacity: 0.55,
      }}>推 奨 機 材</div>

      <Eyebrow8>EQUIPMENT GUIDE · 機材ガイド</Eyebrow8>

      <h1 style={{
        margin: '20px 0 0', fontFamily: T.mincho, fontWeight: 600,
        fontSize: 64, color: T.sumi, lineHeight: 1.15, letterSpacing: 2,
      }}>
        400°C の窯が、<br/>家で<span style={{ color: T.shu }}>焼ける</span>。
      </h1>

      <p style={{
        margin: '24px 0 0', maxWidth: 520, fontFamily: T.gothic,
        fontSize: 16, color: T.sumiSoft, lineHeight: 1.85, letterSpacing: 0.4,
      }}>
        ふるさとピザ帳が前提にしているのは、<br/>
        <b style={{ color: T.sumi, fontWeight: 700 }}>ENRO の電気ピザ窯</b>です。
        家庭オーブンでは越えられなかった<wbr/>90 秒・400℃ の世界を、
        電源さえあれば屋内でも持ち出し先でも。
      </p>

      {/* image slot — real illustration of ENRO in use */}
      <div style={{ marginTop: 40 }}>
        <ImageSlot
          width={608}
          height={400}
          src="assets/enro-hero.png"
          alt="ENRO 電気ピザ窯で焼き上がるピザ"
        />
      </div>

      {/* CTAs */}
      <div style={{ marginTop: 36, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <CtaShu external>ENRO を見る (楽天)</CtaShu>
        <CtaGhost>アプリで食材を選ぶ →</CtaGhost>
        <span style={{
          fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, letterSpacing: 1.5,
          marginLeft: 4,
        }}>
          ※ 楽天アフィリエイト · <code>rel="sponsored"</code>
        </span>
      </div>
    </section>
  );
}

// ===================================================================
// DEVELOPER VOICE — first-person block
// ===================================================================
function DeveloperVoice() {
  return (
    <section style={{ padding: '32px 56px 56px' }}>
      <div style={{
        padding: '40px 44px 42px', borderRadius: 18, background: T.kinari,
        border: `1px solid ${T.hairline}`, position: 'relative',
        boxShadow: '0 1px 2px rgba(31,26,18,0.04)',
      }}>
        {/* opening quote — large mincho mark */}
        <div style={{
          position: 'absolute', top: 18, left: 22, fontFamily: T.mincho,
          fontSize: 88, color: T.shuPale, lineHeight: 1, fontWeight: 700,
        }}>「</div>

        <div style={{ display: 'flex', gap: 28, position: 'relative' }}>
          {/* developer "card" — schematic, intentionally illustrative */}
          <div style={{ flexShrink: 0, width: 96 }}>
            <div style={{
              width: 96, height: 96, borderRadius: 48, background: T.washiDeep,
              border: `1px solid ${T.hairline}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* small pizza + flame composite icon */}
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="22" cy="32" r="16" fill="#E2A35F" stroke={T.sumi} strokeWidth="1"/>
                <circle cx="22" cy="32" r="13" fill="#F4C944"/>
                <circle cx="17" cy="29" r="3" fill="#D44A2A"/>
                <circle cx="26" cy="34" r="3" fill="#D44A2A"/>
                <ellipse cx="22" cy="26" rx="3" ry="1.5" fill="#5B7C3A"/>
                <path d="M40 10c1 4 6 5 6 11a5 5 0 1 1-10 0c0-3 2-4 3-5-1 5 3 5 3 1 0-2-1-4-2-7z"
                  fill={T.shu}/>
              </svg>
            </div>
            <div style={{
              marginTop: 12, textAlign: 'center',
              fontFamily: T.mincho, fontSize: 12, color: T.sumi, fontWeight: 600,
              letterSpacing: 1.5,
            }}>開発者</div>
            <div style={{
              textAlign: 'center',
              fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 1.5, marginTop: 3,
            }}>SENDAI · 仙台</div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>FROM THE MAKER · 開発者から</div>
            <div style={{
              fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi,
              marginTop: 10, lineHeight: 1.45, letterSpacing: 0.5,
            }}>
              家庭オーブンの壁を、<br/>ENRO で越えられました。
            </div>
            <p style={{
              margin: '16px 0 0', fontFamily: T.mincho, fontSize: 14.5,
              color: T.sumiSoft, lineHeight: 2, letterSpacing: 0.3,
            }}>
              仙台で地元食材を活かしたピザパーティをやっているうちに、
              家庭オーブンでは越えられない壁があることに気付きました。
              ENRO の電気ピザ窯を導入してからは、縁が膨らみ、中央がしっとりした
              <b style={{ color: T.sumi, fontWeight: 600 }}>"店レベル"</b> の一枚が家で焼けるようになりました。
              このアプリのレシピは、その体験を前提に最適化されています。
            </p>
            <div style={{
              marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '6px 12px', borderRadius: 999,
              background: 'rgba(96,119,68,0.10)', border: '1px solid rgba(96,119,68,0.22)',
              fontFamily: T.gothic, fontSize: 11, color: '#3F5028', fontWeight: 600, letterSpacing: 0.5,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: T.matcha }}/>
              一個人ユーザとしての推奨です (案件・提携ではありません)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===================================================================
// THREE BENEFITS
// ===================================================================
function BenefitsSection() {
  // Each benefit: { id, icon SVG renderer, jp, en, body, emphasis (boolean) }
  const items = [
    {
      id: 'heat', icon: 'flame', jp: '400°C の高温焼成', en: 'HIGH HEAT',
      body: '90〜120 秒で焼き上げる短時間高温が、ナポリピザ本来の「縁ふくらみ・中しっとり」の食感を生む。家庭オーブンの 250℃ ではどうしても辿り着けない領域。',
    },
    {
      id: 'portable', icon: 'pack', jp: 'ポータブル運用', en: 'PORTABLE',
      emphasis: true,
      body: '電源さえあれば、レンタルキッチン・友人宅・屋外イベントに持ち出せる。 「その場で焼きたてを振る舞う」のが本来のピザ体験 — このアプリのホスト体験は、ENRO の可搬性が前提。',
    },
    {
      id: 'price', icon: 'coin', jp: '個人で買える価格帯', en: 'AFFORDABLE',
      body: '業務用石窯と違って、ホスト個人で導入できる価格と設置サイズ。レンタルや日割りに頼らず、自分の道具として育てていける。',
    },
  ];

  const renderIcon = (kind, c = T.shu, s = 36) => {
    if (kind === 'flame') return (
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <path d="M18 4c2 6 8 8 8 16a8 8 0 1 1-16 0c0-4 2-6 4-8-2 8 4 8 4 2 0-4-2-6 0-10z"
          fill={c}/>
        <path d="M18 16c0.6 2 2.5 3 2.5 5a2.5 2.5 0 1 1-5 0c0-1.2 0.6-1.8 1.2-2.5-0.6 2.5 1.3 2.5 1.3 0.6 0-1-0.5-1.8 0-3.1z"
          fill="#fff" opacity="0.7"/>
      </svg>
    );
    if (kind === 'pack') return (
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        {/* suitcase with handle */}
        <rect x="6" y="11" width="24" height="20" rx="2.5" fill="none" stroke={c} strokeWidth="2"/>
        <path d="M13 11V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <line x1="18" y1="16" x2="18" y2="26" stroke={c} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="18" cy="21" r="2" fill={c}/>
      </svg>
    );
    return (
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" fill="none" stroke={c} strokeWidth="2"/>
        <text x="18" y="23" textAnchor="middle" fontFamily={T.mincho} fontWeight="700"
          fontSize="16" fill={c}>¥</text>
      </svg>
    );
  };

  return (
    <section style={{ padding: '32px 56px 64px' }}>
      <Eyebrow8>3 EXPERIENCE SHIFTS · 体験変化</Eyebrow8>
      <h2 style={{
        margin: '18px 0 0', fontFamily: T.mincho, fontSize: 36, fontWeight: 600,
        color: T.sumi, lineHeight: 1.3, letterSpacing: 1,
      }}>
        ENRO で何が、変わるのか。
      </h2>
      <p style={{ margin: '12px 0 0', fontFamily: T.gothic, fontSize: 14, color: T.sumiSoft, lineHeight: 1.85 }}>
        家庭オーブンとの差は <b style={{ color: T.sumi }}>3 つ</b>。
        中でも <b style={{ color: T.matcha }}>ポータブル運用</b> はこのプロダクトの根幹に直結します。
      </p>

      <div style={{
        marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 16,
      }}>
        {items.map(it => {
          const emph = it.emphasis;
          return (
            <div key={it.id} style={{
              padding: emph ? '28px 24px 26px' : '24px 22px 22px',
              borderRadius: 16,
              background: emph ? T.sumi : T.kinari,
              color: emph ? '#FBF7ED' : T.sumi,
              border: emph ? 'none' : `1px solid ${T.hairline}`,
              boxShadow: emph
                ? '0 18px 40px rgba(31,26,18,0.22), inset 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 1px 2px rgba(31,26,18,0.04)',
              position: 'relative', overflow: 'hidden',
            }}>
              {emph && (
                <div style={{
                  position: 'absolute', top: 18, right: 16,
                  padding: '4px 9px', borderRadius: 999,
                  background: T.shu, color: '#fff',
                  fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                }}>★ KEY</div>
              )}
              <div style={{
                width: 56, height: 56, borderRadius: 28,
                background: emph ? 'rgba(220,138,42,0.18)' : 'rgba(200,65,42,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {renderIcon(it.icon, emph ? T.yamabuki : T.shu, 30)}
              </div>
              <div style={{
                marginTop: 18, fontFamily: T.mono, fontSize: 10,
                color: emph ? '#E8B97A' : T.shu, letterSpacing: 3,
              }}>{it.en}</div>
              <h3 style={{
                margin: '6px 0 0', fontFamily: T.mincho, fontSize: 22, fontWeight: 600,
                color: emph ? '#FBF7ED' : T.sumi, lineHeight: 1.35, letterSpacing: 0.5,
              }}>{it.jp}</h3>
              <p style={{
                margin: '14px 0 0', fontFamily: T.gothic, fontSize: 13.5, lineHeight: 1.9,
                color: emph ? 'rgba(251,247,237,0.78)' : T.sumiSoft,
              }}>{it.body}</p>

              {emph && (
                <div style={{
                  marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    fontFamily: T.mincho, fontSize: 11, fontWeight: 600,
                    color: '#E8B97A', letterSpacing: 1,
                  }}>このアプリの背骨</span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }}/>
                  <span style={{ fontFamily: T.mono, fontSize: 9, color: 'rgba(251,247,237,0.5)', letterSpacing: 1.5 }}>
                    HOST × ANYWHERE
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ===================================================================
// USAGE: 5 STEPS + COMPARISON TABLE
// ===================================================================
function StepNumber({ n, accent }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 19,
      background: T.kinari, border: `1px solid ${accent || T.hairline}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.mincho, fontWeight: 700, fontSize: 18, color: accent || T.sumi,
      flexShrink: 0,
    }}>{n}</div>
  );
}

function UsageSection() {
  const steps = [
    { n: '一', t: '予熱', sub: '15〜20 分で 400°C 到達。庫内温度計で確認。', tone: T.shu },
    { n: '二', t: '生地を伸ばす', sub: '直径 25cm、薄手。中央 4mm・縁 8mm を目安に。', tone: T.shu },
    { n: '三', t: 'ソース + トッピング', sub: '水分の多い具は予め水切り。チーズは最後に。', tone: T.shu },
    { n: '四', t: '投入', sub: '専用ピールで一気に。庫内中央 + やや奥に。', tone: T.shu },
    { n: '五', t: '焼き上がり', sub: '90〜120 秒。途中 1 回 180° 回転で均一に。', tone: T.shu },
  ];
  return (
    <section style={{ padding: '32px 56px 56px' }}>
      <Eyebrow8>HOW IT WORKS · ENRO で焼く基本手順</Eyebrow8>
      <h2 style={{
        margin: '18px 0 0', fontFamily: T.mincho, fontSize: 34, fontWeight: 600,
        color: T.sumi, lineHeight: 1.3, letterSpacing: 1,
      }}>
        5 ステップ、<span style={{ color: T.shu }}>2 分</span>で焼ける。
      </h2>

      {/* steps */}
      <ol style={{
        margin: '32px 0 0', padding: 0, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {steps.map((s, i) => (
          <li key={i} style={{
            display: 'flex', gap: 18, alignItems: 'flex-start',
            padding: '14px 18px', background: T.kinari, borderRadius: 14,
            border: `1px solid ${T.hairline}`,
          }}>
            <StepNumber n={s.n} accent={s.tone}/>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: T.mincho, fontSize: 18, fontWeight: 600, color: T.sumi, letterSpacing: 1 }}>
                  {s.t}
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 1.5 }}>
                  STEP {i + 1} / 5
                </span>
              </div>
              <div style={{ marginTop: 4, fontFamily: T.gothic, fontSize: 13, color: T.sumiSoft, lineHeight: 1.75 }}>
                {s.sub}
              </div>
            </div>
            {i === 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(220,138,42,0.14)', border: '1px solid rgba(220,138,42,0.3)',
                fontFamily: T.mono, fontSize: 9.5, color: '#7A4C16', letterSpacing: 1.5,
                alignSelf: 'center',
              }}>15〜20 min</div>
            )}
            {i === 4 && (
              <div style={{
                padding: '4px 10px', borderRadius: 6,
                background: T.shu, color: '#fff',
                fontFamily: T.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.5,
                alignSelf: 'center',
              }}>90〜120 sec</div>
            )}
          </li>
        ))}
      </ol>

      {/* comparison table */}
      <div style={{ marginTop: 36 }}>
        <CompareTable/>
      </div>

      {/* youtube list */}
      <div style={{ marginTop: 36 }}>
        <YoutubeList/>
      </div>
    </section>
  );
}

function CompareTable() {
  // Two-column comparison; rendered as a side-by-side card pair with a
  // vertical washi divider — feels more "和帳" than a HTML <table>.
  const rows = [
    { label: '最高温度', oven: '250〜300°C', enro: '400〜450°C', win: 'enro' },
    { label: '焼成時間', oven: '8〜15 分',   enro: '90〜120 秒',   win: 'enro' },
    { label: '縁の食感', oven: 'しっかり / 締まる', enro: 'ふっくら / 香ばしい', win: 'enro' },
    { label: '中央の状態', oven: '乾きやすい', enro: 'しっとり保つ', win: 'enro' },
    { label: '一枚あたり', oven: '〜 15 分', enro: '〜 2 分', win: 'enro' },
    { label: '屋内 / 持ち出し', oven: '固定設置', enro: '電源があれば可搬', win: 'enro' },
    { label: '導入コスト', oven: 'すでにある',  enro: '個人で買える価格帯', win: 'oven', winNote: '初期 0' },
  ];
  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      background: T.kinari, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      border: `1px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(31,26,18,0.04)',
    }}>
      {/* header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${T.hairline}`,
      }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>COMPARE · 比較</div>
        <div style={{ fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi, marginTop: 4 }}>
          家庭オーブン と ENRO
        </div>
      </div>

      {/* column heads */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 16px 1.4fr',
        alignItems: 'center', padding: '16px 24px 12px',
      }}>
        <div/>
        <div style={{
          fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, fontWeight: 700,
          letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🍳</span>
          家庭用オーブン
        </div>
        <div/>
        <div style={{
          fontFamily: T.gothic, fontSize: 11.5, color: T.shu, fontWeight: 700,
          letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          ENRO 電気ピザ窯
          <span style={{
            padding: '2px 7px', borderRadius: 999, background: T.shu, color: '#fff',
            fontFamily: T.mono, fontSize: 9, letterSpacing: 1.5,
          }}>推奨</span>
        </div>
      </div>

      {/* rows */}
      <div style={{ padding: '0 24px 16px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 16px 1.4fr',
            alignItems: 'center', padding: '12px 0',
            borderTop: i ? `1px dashed ${T.hairline}` : 'none',
          }}>
            <div style={{
              fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi, letterSpacing: 1,
            }}>{r.label}</div>
            <div style={{
              fontFamily: T.gothic, fontSize: 13.5,
              color: r.win === 'oven' ? T.sumi : T.sumiMuted,
              fontWeight: r.win === 'oven' ? 700 : 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {r.oven}
              {r.win === 'oven' && r.winNote && (
                <span style={{
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(220,138,42,0.14)', color: '#7A4C16',
                  fontFamily: T.mono, fontSize: 9, letterSpacing: 1,
                }}>{r.winNote}</span>
              )}
            </div>
            <div style={{
              width: 1, height: 24, background: T.hairline, justifySelf: 'center',
            }}/>
            <div style={{
              fontFamily: T.gothic, fontSize: 13.5,
              color: r.win === 'enro' ? T.sumi : T.sumiMuted,
              fontWeight: r.win === 'enro' ? 700 : 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {r.enro}
              {r.win === 'enro' && (
                <span style={{
                  width: 6, height: 6, borderRadius: 3, background: T.shu,
                  boxShadow: '0 0 0 4px rgba(200,65,42,0.15)',
                }}/>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* footer note */}
      <div style={{
        padding: '14px 24px',
        background: 'rgba(31,26,18,0.03)',
        borderTop: `1px solid ${T.hairline}`,
        fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.7,
      }}>
        <b style={{ color: T.sumi, fontFamily: T.mincho }}>結局のところ</b> ―
        ENRO は 「短時間 × 高温」 で家庭オーブンが届かない領域に行きます。
        家庭オーブンも <b>機材プロファイル</b> を切り替えれば、温度・時間に合わせたレシピに再生成されます。
      </div>
    </div>
  );
}

function YoutubeList() {
  const vids = [
    { jp: 'ENRO 開封 & 初焼成 — 仙台のキッチンで', dur: '12:48', tag: '基本' },
    { jp: '90 秒で焼く・コツ 5 つ',                dur: '08:21', tag: '実践' },
    { jp: 'ピールの使い方と庫内回転',              dur: '06:04', tag: '実践' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <span style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600, color: T.sumi, letterSpacing: 1 }}>
          動画で見る
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 1.5 }}>
          YOUTUBE · 公式
        </span>
        <span style={{ flex: 1, height: 1, background: T.hairline }}/>
        <a style={{
          fontFamily: T.gothic, fontSize: 11, color: T.shu, fontWeight: 700, letterSpacing: 0.5,
          textDecoration: 'underline', textDecorationColor: 'rgba(200,65,42,0.4)', textUnderlineOffset: 3,
        }}>チャンネルへ →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {vids.map((v, i) => (
          <a key={i} style={{
            display: 'block', borderRadius: 12, overflow: 'hidden', background: T.kinari,
            border: `1px solid ${T.hairline}`, textDecoration: 'none', color: 'inherit',
          }}>
            <div style={{
              height: 108, background: 'linear-gradient(135deg, #2A1B12 0%, #5C3110 70%, #8E2F18 100%)',
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* play triangle */}
              <div style={{
                width: 42, height: 42, borderRadius: 21,
                background: 'rgba(255,255,255,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill={T.sumi}>
                  <path d="M3 1.5v11l9-5.5z"/>
                </svg>
              </div>
              {/* duration */}
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.7)',
                color: '#fff', fontFamily: T.mono, fontSize: 9.5, letterSpacing: 0.5,
              }}>{v.dur}</div>
              {/* tag */}
              <div style={{
                position: 'absolute', top: 8, left: 8,
                padding: '2px 7px', borderRadius: 999,
                background: T.shu, color: '#fff',
                fontFamily: T.mincho, fontSize: 9, fontWeight: 700, letterSpacing: 1,
              }}>{v.tag}</div>
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{
                fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi,
                lineHeight: 1.5,
              }}>{v.jp}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ===================================================================
// HOME OVEN FALLBACK — quiet section
// ===================================================================
function HomeOvenSection() {
  return (
    <section style={{
      padding: '24px 56px 56px',
    }}>
      <div style={{
        padding: '32px 36px 36px',
        borderRadius: 18,
        background: 'rgba(31,26,18,0.025)',
        border: `1px dashed ${T.hairline}`,
      }}>
        <Eyebrow8 accent={T.sumiSoft}>FOR HOME OVENS · 機材を揃える前に</Eyebrow8>
        <h2 style={{
          margin: '14px 0 0', fontFamily: T.mincho, fontSize: 26, fontWeight: 600,
          color: T.sumi, lineHeight: 1.4, letterSpacing: 0.8,
        }}>
          いまある家庭用オーブンで、<br/>まず試したい方へ。
        </h2>

        <div style={{
          marginTop: 24,
          display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{
              margin: 0, fontFamily: T.gothic, fontSize: 14, color: T.sumiSoft, lineHeight: 2,
            }}>
              アプリ内の設定で <b style={{ color: T.sumi }}>機材プロファイル</b> を
              <Chip tone="ghost" size="sm" style={{ margin: '0 4px' }}>🍳 家庭用オーブン</Chip>
              に切り替えると、レシピが <b style={{ color: T.sumi }}>250〜300°C / 8〜15 分</b>
              の前提で再生成されます。
            </p>
            <p style={{
              margin: '14px 0 0', fontFamily: T.gothic, fontSize: 12.5, color: T.sumiMuted, lineHeight: 1.85,
            }}>
              ただし、本アプリの本領は ENRO による高温焼成にあります。
              「今夜試したい」から始めて、ハマったら ENRO に進む — その順序で問題ありません。
            </p>

            <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <CtaGhost small accent={T.sumiSoft}>
                <span style={{ fontFamily: T.gothic, fontWeight: 700, color: T.sumi }}>
                  アプリで機材プロファイルを変更する →
                </span>
              </CtaGhost>
            </div>
          </div>

          {/* profile switch illustration */}
          <ProfileSwitchIllustration/>
        </div>
      </div>
    </section>
  );
}

// Small illustrative mock of the profile switcher inside the app.
function ProfileSwitchIllustration() {
  return (
    <div style={{
      padding: 18, borderRadius: 16, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', border: `1px solid ${T.hairline}`,
      boxShadow: '0 10px 30px rgba(31,26,18,0.10)', position: 'relative',
    }}>
      <div style={{
        fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 2,
      }}>SCREEN · 機材プロファイル切替</div>

      {/* "ENRO" row */}
      <div style={{
        marginTop: 12, padding: '12px 14px', borderRadius: 12,
        background: T.kinari, border: `1.5px solid ${T.shu}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: 'rgba(200,65,42,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🔥</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi }}>ENRO 電気ピザ窯</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, marginTop: 2, letterSpacing: 0.5 }}>
            400〜450°C · 90〜120 秒
          </div>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 11, background: T.shu,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.check('#fff', 12)}</div>
      </div>

      {/* "Home oven" row */}
      <div style={{
        marginTop: 8, padding: '12px 14px', borderRadius: 12,
        background: T.kinari, border: `1px solid ${T.hairline}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: 'rgba(220,138,42,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>🍳</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi }}>家庭用オーブン</div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, marginTop: 2, letterSpacing: 0.5 }}>
            250〜300°C · 8〜15 分
          </div>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 11,
          border: `1.5px solid ${T.hairline}`,
        }}/>
      </div>

      {/* tap indicator */}
      <div style={{
        position: 'absolute', top: 88, left: -22, width: 22, height: 22, borderRadius: 11,
        background: T.matcha, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(96,119,68,0.45)',
        fontFamily: T.mono, fontSize: 10, fontWeight: 700,
      }}>↻</div>
    </div>
  );
}

// ===================================================================
// FINAL CTA
// ===================================================================
function FinalCtaSection() {
  return (
    <section style={{ padding: '48px 56px 56px' }}>
      <div style={{
        padding: '52px 48px',
        borderRadius: 22,
        background: 'linear-gradient(135deg, #2A1B12 0%, #5C3110 60%, #8E2F18 130%)',
        color: '#FBF7ED',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* embers */}
        {[[60,40],[640,80],[120,240],[600,260],[420,140],[80,160]].map(([x,y], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: 2,
            background: i % 2 ? '#FFC04A' : '#FFE079', opacity: 0.65,
            boxShadow: `0 0 ${8 + (i % 3) * 6}px ${i % 2 ? '#FFC04A' : '#FFE079'}`,
          }}/>
        ))}

        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10.5, color: '#E8B97A', letterSpacing: 5,
          }}>READY · 始める</div>
          <h2 style={{
            margin: '14px 0 0', fontFamily: T.mincho, fontSize: 42, fontWeight: 600,
            color: '#FBF7ED', lineHeight: 1.25, letterSpacing: 1.5,
          }}>
            400°C の世界を、<br/>今夜の食卓へ。
          </h2>
          <p style={{
            margin: '18px 0 0', fontFamily: T.gothic, fontSize: 13.5, color: 'rgba(251,247,237,0.7)',
            lineHeight: 1.85, maxWidth: 460,
          }}>
            ENRO で焼くことを前提に作ったレシピが、3 枚すぐ届きます。
            家庭オーブンの方は機材プロファイル切替で同じレシピを再生成。
          </p>

          <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <CtaShu external style={{
              background: '#FBF7ED', color: T.shuDeep,
              boxShadow: '0 14px 32px rgba(0,0,0,0.32)',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                ENRO を見る (楽天)
                {ExtLink(T.shuDeep, 14)}
              </span>
            </CtaShu>
            <CtaGhost accent="#FBF7ED">
              <span style={{ color: '#FBF7ED', fontWeight: 700 }}>ふるさとピザ帳を試す →</span>
            </CtaGhost>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===================================================================
// FOOTER NOTICE — affiliate disclosure
// ===================================================================
function FooterNotice({ standalone }) {
  return (
    <footer style={{
      padding: standalone ? '24px 48px 28px' : '0 56px 56px',
    }}>
      <div style={{
        padding: '20px 24px', borderRadius: 12,
        background: T.kinari, border: `1px solid ${T.hairline}`,
        display: 'flex', gap: 18, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15, flexShrink: 0,
          background: 'rgba(31,26,18,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke={T.sumiSoft} strokeWidth="1.4"/>
            <line x1="7" y1="5" x2="7" y2="8" stroke={T.sumiSoft} strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="7" cy="10" r="0.7" fill={T.sumiSoft}/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: T.mincho, fontSize: 11.5, fontWeight: 600, color: T.sumi,
            letterSpacing: 1.5, marginBottom: 4,
          }}>
            アフィリエイトに関する透明性表示
          </div>
          <div style={{
            fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft, lineHeight: 1.85,
          }}>
            ※ 本ページのリンク (<code style={{ fontFamily: T.mono, fontSize: 10.5 }}>ENRO を見る</code>)
            は楽天アフィリエイトを含みます (<code style={{ fontFamily: T.mono, fontSize: 10.5 }}>rel="sponsored"</code>)。
            運営者は ENRO の <b style={{ color: T.sumi }}>1 ユーザ</b> として本機材を推奨していますが、
            メーカー・販売店との <b style={{ color: T.sumi }}>提携・PR 案件ではありません</b>。
            クリックによる紹介手数料が、運営費に充当されます。
          </div>
        </div>
        <div style={{
          padding: '4px 9px', borderRadius: 999,
          background: 'rgba(31,26,18,0.04)', border: `1px solid ${T.hairline}`,
          fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 1.5,
          alignSelf: 'flex-start', flexShrink: 0,
        }}>SLICE 8</div>
      </div>
    </footer>
  );
}

// ===================================================================
// EquipmentLP — the full canvas (long scroll)
// ===================================================================
function EquipmentLP() {
  return (
    <div style={{
      width: LP_W, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, color: T.sumi,
      boxSizing: 'border-box', position: 'relative',
    }}>
      {/* simulated browser bar — just to ground "this is a web LP, not a phone" */}
      <div style={{
        height: 42, padding: '0 16px',
        borderBottom: `1px solid ${T.hairline}`,
        background: 'rgba(251,247,237,0.6)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#E15757','#E8B72A','#3FB955'].map((c,i)=>(
            <div key={i} style={{ width: 11, height: 11, borderRadius: 6, background: c, opacity: 0.85 }}/>
          ))}
        </div>
        <div style={{
          flex: 1, height: 24, borderRadius: 12,
          background: T.washi, border: `1px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
          fontFamily: T.mono, fontSize: 10, color: T.sumiSoft, letterSpacing: 0.5,
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="2" y="4.5" width="6" height="4.5" rx="0.7" stroke={T.sumiMuted} strokeWidth="1"/>
            <path d="M3.5 4.5V3a1.5 1.5 0 0 1 3 0v1.5" stroke={T.sumiMuted} strokeWidth="1" fill="none"/>
          </svg>
          mlpr-web.run.app/equipment
        </div>
        <div style={{
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(200,65,42,0.10)', border: '1px solid rgba(200,65,42,0.22)',
          fontFamily: T.mono, fontSize: 9, color: T.shu, letterSpacing: 1.5,
        }}>EQUIPMENT · /equipment</div>
      </div>

      {/* mini brand bar */}
      <div style={{
        padding: '16px 56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${T.hairline}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FurusatoMark variant="B" size={32}/>
          <span style={{ fontFamily: T.mincho, fontSize: 16, fontWeight: 600, color: T.sumi, letterSpacing: 2 }}>
            ふるさとピザ帳
          </span>
          <span style={{
            marginLeft: 10, padding: '3px 8px', borderRadius: 4,
            background: 'rgba(31,26,18,0.05)', fontFamily: T.mono, fontSize: 9.5,
            color: T.sumiSoft, letterSpacing: 1.5,
          }}>機材ガイド</span>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft, fontWeight: 500 }}>つくる</span>
          <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumi, fontWeight: 700,
            borderBottom: `2px solid ${T.shu}`, paddingBottom: 2 }}>機材</span>
          <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft, fontWeight: 500 }}>保存帳</span>
          <span style={{ fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft, fontWeight: 500 }}>振り返り帳</span>
        </div>
      </div>

      <HeroSection/>
      <DeveloperVoice/>
      <BenefitsSection/>
      <UsageSection/>
      <HomeOvenSection/>
      <FinalCtaSection/>
      <FooterNotice/>

      {/* page-end mark */}
      <div style={{
        padding: '28px 56px 36px', borderTop: `1px solid ${T.hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 2,
      }}>
        <span>FURUSATO PIZZA-CHŌ · 2026 · /equipment</span>
        <span>v0.8 · ENRO RECOMMENDED</span>
      </div>
    </div>
  );
}

// ===================================================================
// Closeups — Hero / Compare / Footer notice
// ===================================================================
function EquipmentHero() {
  return (
    <div style={{
      width: LP_W, background: T.washi, backgroundImage: WASHI_NOISE,
      backgroundBlendMode: 'multiply', fontFamily: T.gothic, color: T.sumi,
    }}>
      <HeroSection standalone/>
    </div>
  );
}

function EquipmentCompare() {
  return (
    <div style={{
      width: LP_W, padding: '40px 56px 48px', background: T.washi,
      backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      fontFamily: T.gothic, color: T.sumi,
    }}>
      <Eyebrow8>COMPARE · 比較表クローズアップ</Eyebrow8>
      <div style={{ height: 18 }}/>
      <CompareTable/>
    </div>
  );
}

function EquipmentFooterNote() {
  return (
    <div style={{
      width: LP_W, padding: '36px 0 8px', background: T.washi,
      backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      fontFamily: T.gothic, color: T.sumi,
    }}>
      <div style={{ padding: '0 48px 12px' }}>
        <Eyebrow8 accent={T.sumiSoft}>TRANSPARENCY · 透明性の見せ方</Eyebrow8>
      </div>
      <FooterNotice standalone/>

      {/* annotation strip */}
      <div style={{ padding: '12px 48px 32px' }}>
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(96,119,68,0.08)', border: '1px solid rgba(96,119,68,0.22)',
          fontFamily: T.gothic, fontSize: 11.5, color: '#3F5028', lineHeight: 1.85,
        }}>
          <b style={{ fontFamily: T.mincho, fontSize: 12.5 }}>デザイン判断 ·</b>{' '}
          フッター固定ではなく、ページ末尾に <b>カードとして同居</b>。
          注意書きであっても「ブランドの一部」として読まれる位置に置き、
          <code style={{ fontFamily: T.mono, fontSize: 11 }}>rel="sponsored"</code> も
          見える場所に明示。Hero の CTA 下にも 1 行小さな注記を入れ、
          <b style={{ color: T.sumi }}>クリック前にすでに開示</b>している状態を作る。
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  EquipmentLP, EquipmentHero, EquipmentCompare, EquipmentFooterNote,
  HeroSection, DeveloperVoice, BenefitsSection, UsageSection,
  HomeOvenSection, FinalCtaSection, FooterNotice, CompareTable,
  OvenIllustration, ImageSlot, Eyebrow8, CtaShu, CtaGhost,
});
