// slice8-app.jsx — In-app pieces for Slice 8:
//   - OvenProfileSelector (modal / bottom-sheet, 3 states)
//   - HeaderDropdownV3 (Slice 7 dropdown + 機材ガイド)
//   - DetailOvenBadge (badge on the detail screen)
//   - TopEquipmentLink (2 placement options on the TOP)
//   - EquipmentSpecCard (design decisions, handoff)
//
// Loaded after pizza-tokens.jsx + slice4-screens.jsx + slice7-screens.jsx +
// slice8-screens.jsx.

const Wa = 393;
const Ha = 852;
const SAFE_TOP_A = 54;
const SAFE_BOT_A = 34;

// ── Local Cap (avoid colliding with Cap7) ───────────────────────────
function Cap8({ children, accent = T.shu }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, paddingLeft: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: accent }}/>
      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3 }}>{children}</span>
    </div>
  );
}

// ===================================================================
// 機材プロファイル切替モーダル (ボトムシート)
// ===================================================================
// Bottom-sheet style modal. Shows two options + an info link to /equipment.
// `selected` is 'enro' or 'home'.
function ProfileOption({ kind, selected, recommended }) {
  const isEnro = kind === 'enro';
  const meta = isEnro
    ? { jp: 'ENRO 電気ピザ窯', en: 'ENRO · 400°C · 90s', emoji: '🔥', tempLine: '400〜450°C', timeLine: '90〜120 秒',
        desc: '本アプリ推奨。短時間高温で店レベルのナポリ寄り仕上がり。' }
    : { jp: '家庭用オーブン',  en: 'HOME OVEN · 280°C · 10m', emoji: '🍳', tempLine: '250〜300°C', timeLine: '8〜15 分',
        desc: '家庭オーブンに合わせて温度・時間をレシピ側で再生成。' };

  return (
    <div style={{
      position: 'relative',
      padding: '16px 16px 14px',
      borderRadius: 14,
      background: T.kinari,
      border: selected ? `2px solid ${T.shu}` : `1px solid ${T.hairline}`,
      boxShadow: selected ? '0 8px 22px rgba(200,65,42,0.20)' : 'none',
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: isEnro ? 'rgba(200,65,42,0.10)' : 'rgba(220,138,42,0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26,
      }}>{meta.emoji}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: T.mincho, fontSize: 14.5, fontWeight: 600, color: T.sumi, letterSpacing: 0.5,
          }}>{meta.jp}</span>
          {recommended && (
            <span style={{
              padding: '1px 6px', borderRadius: 4,
              background: T.shu, color: '#fff',
              fontFamily: T.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.5,
            }}>推奨</span>
          )}
        </div>
        <div style={{
          fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, letterSpacing: 1, marginTop: 3,
        }}>{meta.en}</div>

        {/* metric chips */}
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 999,
            background: 'rgba(31,26,18,0.05)', border: `1px solid ${T.hairline}`,
            fontFamily: T.gothic, fontSize: 10.5, color: T.sumi, fontWeight: 600,
          }}>
            <span style={{ fontSize: 9, color: T.sumiMuted, fontFamily: T.mono, letterSpacing: 1 }}>TEMP</span>
            {meta.tempLine}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 999,
            background: 'rgba(31,26,18,0.05)', border: `1px solid ${T.hairline}`,
            fontFamily: T.gothic, fontSize: 10.5, color: T.sumi, fontWeight: 600,
          }}>
            <span style={{ fontSize: 9, color: T.sumiMuted, fontFamily: T.mono, letterSpacing: 1 }}>TIME</span>
            {meta.timeLine}
          </span>
        </div>

        <div style={{
          marginTop: 10, fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.7,
        }}>{meta.desc}</div>
      </div>

      {/* radio */}
      <div style={{
        width: 22, height: 22, borderRadius: 11,
        background: selected ? T.shu : 'transparent',
        border: `1.5px solid ${selected ? T.shu : T.hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && Icon.check('#fff', 12)}
      </div>
    </div>
  );
}

function OvenProfileSheet({ selected = 'enro' }) {
  return (
    <Phone>
      <div style={{ height: SAFE_TOP_A }}/>
      {/* dimmed page behind — sketched mini Tap2 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(31,26,18,0.45)', zIndex: 1,
      }}/>
      {/* tiny ghost of Tap2 header — peek through */}
      <div style={{
        position: 'absolute', top: SAFE_TOP_A + 6, left: 16, right: 16, height: 36,
        borderRadius: 10, background: 'rgba(251,247,237,0.20)', zIndex: 0,
      }}/>
      <div style={{
        position: 'absolute', top: SAFE_TOP_A + 50, left: 16, width: 130, height: 26,
        borderRadius: 999, background: 'rgba(251,247,237,0.16)', zIndex: 0,
      }}/>

      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
        borderRadius: '22px 22px 0 0',
        boxShadow: '0 -22px 50px rgba(31,26,18,0.32)',
        padding: '12px 18px 22px',
        zIndex: 2,
      }}>
        {/* drag handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2, background: T.hairline, margin: '0 auto 16px',
        }}/>

        {/* header */}
        <div style={{ padding: '0 4px 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 9.5, color: T.shu, letterSpacing: 4 }}>
              EQUIPMENT PROFILE
            </div>
            <div style={{
              fontFamily: T.mincho, fontSize: 19, fontWeight: 600, color: T.sumi, marginTop: 4,
              letterSpacing: 0.5,
            }}>
              機材を選ぶ
            </div>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: 15, background: 'rgba(31,26,18,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T.gothic, fontSize: 16, color: T.sumiSoft,
          }}>×</div>
        </div>

        <div style={{
          marginTop: 4, padding: '0 4px',
          fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.7,
        }}>
          選んだ機材に合わせて、レシピの <b style={{ color: T.sumi }}>温度・時間</b> が再生成されます。
        </div>

        {/* options */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ProfileOption kind="enro"  selected={selected === 'enro'}  recommended/>
          <ProfileOption kind="home"  selected={selected === 'home'}/>
        </div>

        {/* link to LP */}
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 10,
          background: 'rgba(31,26,18,0.03)', border: `1px solid ${T.hairline}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 14 }}>📖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.mincho, fontSize: 12, fontWeight: 600, color: T.sumi }}>
              機材ガイドを見る
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 1, marginTop: 2 }}>
              /equipment · ENRO の使い方と比較
            </div>
          </div>
          {Icon.chev('right', T.sumiMuted, 12)}
        </div>

        {/* confirm */}
        <div style={{ marginTop: 16 }}>
          <Shu7Button>
            {Icon.check('#fff', 14)}
            この機材で続ける
          </Shu7Button>
        </div>
      </div>
    </Phone>
  );
}

// State C — Tap2 with confirmation toast right after switching
function OvenProfileToast({ toProfile = 'home' }) {
  const isHome = toProfile === 'home';
  return (
    <Phone>
      <div style={{ height: SAFE_TOP_A }}/>

      {/* Tap2-style header */}
      <div style={{ padding: '4px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: T.kinari, borderRadius: 999, border: `1px solid ${T.hairline}` }}>
          {Icon.pin(T.shu, 14)}
          <span style={{ fontSize: 13, fontWeight: 600, color: T.sumi, fontFamily: T.gothic }}>宮城県・仙台市</span>
          {Icon.chev('down', T.sumiMuted, 12)}
        </div>
        {/* in-context profile selector — case B */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          background: isHome ? 'rgba(220,138,42,0.14)' : 'rgba(200,65,42,0.10)',
          border: `1px solid ${isHome ? 'rgba(220,138,42,0.3)' : 'rgba(200,65,42,0.22)'}`,
          borderRadius: 999,
        }}>
          <span style={{ fontSize: 13 }}>{isHome ? '🍳' : '🔥'}</span>
          <span style={{
            fontFamily: T.gothic, fontSize: 11.5, fontWeight: 700,
            color: isHome ? '#7A4C16' : T.shuDeep, letterSpacing: 0.5,
          }}>{isHome ? '家庭用オーブン' : 'ENRO'}</span>
          {Icon.chev('down', isHome ? '#7A4C16' : T.shuDeep, 11)}
        </div>
      </div>

      {/* heading */}
      <div style={{ padding: '18px 24px 0' }}>
        <div style={{
          fontFamily: T.mincho, fontSize: 22, fontWeight: 600, color: T.sumi,
          lineHeight: 1.35, letterSpacing: 0.5,
        }}>
          地元の食材を、<br/><span style={{ color: T.shu }}>1〜3 個</span>選びましょう。
        </div>
        <div style={{ fontSize: 12, color: T.sumiMuted, marginTop: 6 }}>
          {isHome ? '家庭用オーブン (250〜300°C / 8〜15 分) 用に再生成します' : 'ENRO (400°C / 90〜120 秒) 用に最適化します'}
        </div>
      </div>

      {/* ghost grid — abbreviated */}
      <div style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            height: 96, borderRadius: 16, background: T.kinari,
            border: `1px solid ${T.hairline}`, position: 'relative', opacity: 0.5,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(31,26,18,0.05)', margin: 12,
            }}/>
            <div style={{
              height: 10, width: 64, background: 'rgba(31,26,18,0.05)',
              borderRadius: 2, marginLeft: 12, marginTop: 4,
            }}/>
            <div style={{
              height: 6, width: 40, background: 'rgba(31,26,18,0.04)',
              borderRadius: 2, marginLeft: 12, marginTop: 4,
            }}/>
          </div>
        ))}
      </div>

      {/* toast */}
      <div style={{
        position: 'absolute', left: 16, right: 16, top: 160,
        padding: '12px 14px', borderRadius: 14,
        background: T.sumi, color: '#fff',
        boxShadow: '0 14px 32px rgba(31,26,18,0.32)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: isHome ? 'rgba(220,138,42,0.22)' : 'rgba(200,65,42,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{isHome ? '🍳' : '🔥'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.mincho, fontSize: 12.5, fontWeight: 600, color: '#FBF7ED', letterSpacing: 0.5,
          }}>
            {isHome ? '家庭用オーブン' : 'ENRO'} に切り替えました
          </div>
          <div style={{
            fontFamily: T.gothic, fontSize: 10.5, color: 'rgba(251,247,237,0.65)', marginTop: 2,
          }}>
            {isHome ? '次の提案は 250〜300°C / 8〜15 分前提で生成' : '次の提案は 400°C / 90〜120 秒前提で生成'}
          </div>
        </div>
        <div style={{
          padding: '5px 9px', borderRadius: 6,
          background: 'rgba(251,247,237,0.10)', color: '#FBF7ED',
          fontFamily: T.gothic, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        }}>取消</div>
      </div>
    </Phone>
  );
}

// Showcase of all three states + interaction annotations.
function OvenProfileSelector() {
  return (
    <div style={{
      width: Wa * 3 + 64, padding: '32px 24px 36px',
      background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      fontFamily: T.gothic, color: T.sumi, boxSizing: 'border-box',
    }}>
      <div style={{ paddingLeft: 12 }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.shu, letterSpacing: 5 }}>
          SLICE 8 · 02 · OVEN PROFILE SELECTOR
        </div>
        <div style={{
          fontFamily: T.mincho, fontSize: 26, fontWeight: 600, color: T.sumi,
          marginTop: 8, lineHeight: 1.35, letterSpacing: 1,
        }}>
          機材プロファイル切替<br/>
          <span style={{ color: T.sumiSoft, fontSize: 16 }}>ボトムシート 2 状態 + 切替直後の Toast</span>
        </div>
      </div>

      <div style={{
        marginTop: 24,
        display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <div style={{ width: Wa }}>
          <Cap8>① ENRO 選択中 (既定)</Cap8>
          <div style={{ borderRadius: 28, overflow: 'hidden' }}>
            <OvenProfileSheet selected="enro"/>
          </div>
        </div>
        <div style={{ width: Wa }}>
          <Cap8 accent={T.yamabuki}>② 家庭用オーブン 選択中</Cap8>
          <div style={{ borderRadius: 28, overflow: 'hidden' }}>
            <OvenProfileSheet selected="home"/>
          </div>
        </div>
        <div style={{ width: Wa }}>
          <Cap8 accent={T.matcha}>③ 切替直後 (Tap2 上に Toast)</Cap8>
          <div style={{ borderRadius: 28, overflow: 'hidden' }}>
            <OvenProfileToast toProfile="home"/>
          </div>
        </div>
      </div>

      {/* interaction notes */}
      <div style={{
        marginTop: 28, padding: '16px 20px', borderRadius: 14,
        background: T.kinari, border: `1px solid ${T.hairline}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22,
      }}>
        <div>
          <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi, letterSpacing: 1 }}>
            開き方
          </div>
          <div style={{ fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.8, marginTop: 6 }}>
            メニュー (案 A) もしくは Tap2 ヘッダ右の独立セレクタ (案 B) からタップ。
            iOS bottom sheet で開き、背面はディム + 1 段下げ。
          </div>
        </div>
        <div>
          <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi, letterSpacing: 1 }}>
            選択モデル
          </div>
          <div style={{ fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.8, marginTop: 6 }}>
            ラジオ単一選択。<b style={{ color: T.sumi }}>選んだ瞬間にコミット</b>せず、
            「この機材で続ける」で確定 (誤タップ防止)。<code style={{ fontFamily: T.mono }}>Esc</code> / 外側で破棄。
          </div>
        </div>
        <div>
          <div style={{ fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi, letterSpacing: 1 }}>
            切替後フィードバック
          </div>
          <div style={{ fontFamily: T.gothic, fontSize: 11.5, color: T.sumiSoft, lineHeight: 1.8, marginTop: 6 }}>
            Toast を <b>4 秒</b>表示。<b>「取消」</b>を含めることで <b>undoable</b> に。
            候補生成中の場合は再生成を促す注記を追記。
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// HeaderDropdownV3 — Slice 7 dropdown + 機材ガイド (with current profile)
// ===================================================================
function HeaderDropdownV3Items({ user, currentRoute, currentProfile = 'enro' }) {
  const profileLabel = currentProfile === 'enro' ? 'ENRO' : '家庭用オーブン';
  const profileEmoji = currentProfile === 'enro' ? '🔥' : '🍳';
  const items = [
    { id: 'library', icon: '📔', jp: 'ピザ帳 (保存)',       en: 'SAVED',     route: '/library' },
    { id: 'journal', icon: '📓', jp: '振り返り帳 (作った)', en: 'JOURNAL',   route: '/journal' },
    {
      id: 'equipment', icon: '🔥', jp: '機材ガイド',         en: 'EQUIPMENT', route: '/equipment',
      sub: <>現在: <b style={{ color: T.sumi }}>{profileLabel}</b></>,
      isNew: true,
    },
  ];
  return (
    <div role="menu" aria-label="ユーザーメニュー" style={{
      position: 'absolute', top: 60, right: 14, width: 268,
      background: T.kinari, borderRadius: 14, border: `1px solid ${T.hairline}`,
      boxShadow: '0 18px 44px rgba(31,26,18,0.20), 0 4px 10px rgba(31,26,18,0.08)',
      overflow: 'hidden', zIndex: 8,
    }}>
      {/* user info row */}
      <div style={{
        padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${T.hairline}`,
        background: 'linear-gradient(180deg, rgba(200,65,42,0.04), transparent)',
      }}>
        <Avatar size={38} initials={user.initials}/>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi, lineHeight: 1.2 }}>
            {user.displayName}
          </div>
          <div style={{
            fontFamily: T.mono, fontSize: 9.5, color: T.sumiMuted, marginTop: 3,
            letterSpacing: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
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
            {active && <div style={{
              position: 'absolute', left: 0, top: 6, bottom: 6, width: 2,
              background: T.shu, borderRadius: 2,
            }}/>}
            <span style={{ fontSize: 16, lineHeight: 1, width: 18, textAlign: 'center' }}>{it.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  fontFamily: T.mincho, fontSize: 13, fontWeight: 600, color: T.sumi, lineHeight: 1.2,
                }}>{it.jp}</span>
                {it.isNew && (
                  <span style={{
                    padding: '1px 5px', borderRadius: 3,
                    background: T.shu, color: '#fff',
                    fontFamily: T.mono, fontSize: 7.5, fontWeight: 700, letterSpacing: 1,
                  }}>NEW</span>
                )}
              </div>
              <div style={{
                fontFamily: it.sub ? T.gothic : T.mono,
                fontSize: it.sub ? 10.5 : 8.5,
                color: T.sumiMuted, marginTop: 2, letterSpacing: it.sub ? 0.3 : 1.2,
              }}>
                {it.sub
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {profileEmoji}{it.sub}
                    </span>
                  : it.en}
              </div>
            </div>
            {Icon.chev('right', T.sumiMuted, 11)}
          </div>
        );
      })}

      {/* divider + sign out */}
      <div style={{ height: 1, background: T.hairline }}/>
      <div role="menuitem" style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: T.gothic, fontSize: 12, fontWeight: 500, color: T.sumiMuted, letterSpacing: 0.3,
      }}>
        <span style={{ width: 18, textAlign: 'center', fontSize: 13 }}>↪</span>
        <span style={{ flex: 1 }}>サインアウト</span>
      </div>
    </div>
  );
}

function HeaderDropdownV3() {
  const user = { initials: '松', displayName: '松島 一郎', email: 'matsushima@gmail.com' };
  return (
    <div style={{
      width: Wa, height: Ha,
      background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      fontFamily: T.gothic, padding: '54px 0 0', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>
          SLICE 8 · 03 · HEADER DROPDOWN v3
        </div>
        <div style={{
          fontFamily: T.mincho, fontSize: 19, fontWeight: 600, color: T.sumi,
          marginTop: 5, lineHeight: 1.3,
        }}>
          機材ガイド + 現在プロファイルを<br/>
          <span style={{ color: T.sumiSoft, fontSize: 13 }}>Slice 7 Dropdown に 1 項目追加 (現在: ENRO)</span>
        </div>
      </div>

      {/* header */}
      <div style={{ margin: '18px 4px 0', position: 'relative', paddingBottom: 280 }}>
        <div style={{ paddingLeft: 16 }}><Cap8 accent={T.matcha}>Dropdown 展開時 (current: /journal)</Cap8></div>
        <HeaderRow7 mode="open" title="振り返り帳" user={user}/>
        <HeaderDropdownV3Items user={user} currentRoute="/journal" currentProfile="enro"/>
      </div>

      {/* spec note */}
      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 44,
        padding: '12px 14px', borderRadius: 12, background: T.kinari,
        border: `1px solid ${T.hairline}`,
        fontSize: 10.5, color: T.sumiSoft, lineHeight: 1.65,
      }}>
        <div style={{
          fontFamily: T.mincho, fontWeight: 600, color: T.sumi, fontSize: 11.5,
          letterSpacing: 1.5, marginBottom: 4,
        }}>追加項目の仕様</div>
        <div>· 位置: 振り返り帳の <b style={{ color: T.sumi }}>下</b>、区切り線の上 (3 番目)</div>
        <div>· 副題: 現在のプロファイル名 <code style={{ fontFamily: T.mono }}>"🔥 現在: ENRO"</code> を二行目に表示</div>
        <div>· 初回露出時のみ <b style={{ color: T.shu }}>NEW</b> バッジ。次回以降は非表示 (per-user flag)</div>
        <div>· タップ → <code style={{ fontFamily: T.mono }}>/equipment</code> (LP) へ遷移</div>
      </div>
    </div>
  );
}

// ===================================================================
// DetailOvenBadge — detail screen badge
// ===================================================================
function DetailOvenBadge() {
  // Tiny prop variant — three states. Each renders a small badge next to
  // the temp/time metadata so the user knows what assumption was used.
  const variants = [
    { kind: 'enro', label: '🔥 ENRO 機材プロファイル', accent: T.shu },
    { kind: 'home', label: '🍳 家庭用オーブン 機材プロファイル', accent: T.yamabuki },
  ];

  return (
    <div style={{
      width: Wa, height: 720,
      background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      fontFamily: T.gothic, padding: '32px 0 0', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 4 }}>
          SLICE 8 · 04 · DETAIL OVEN BADGE
        </div>
        <div style={{
          fontFamily: T.mincho, fontSize: 18, fontWeight: 600, color: T.sumi,
          marginTop: 5, lineHeight: 1.35,
        }}>
          詳細画面の機材バッジ<br/>
          <span style={{ color: T.sumiSoft, fontSize: 12 }}>温度・時間の近くに、控えめに添える</span>
        </div>
      </div>

      {/* mock detail block */}
      <div style={{ padding: '20px 20px 0' }}>
        {variants.map((v, vi) => (
          <div key={v.kind} style={{
            marginTop: vi ? 16 : 0,
            padding: '16px 18px 18px', background: T.kinari, borderRadius: 14,
            border: `1px solid ${T.hairline}`,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 9.5, color: v.accent, letterSpacing: 3 }}>
              {v.kind === 'enro' ? 'PROFILE · ENRO' : 'PROFILE · HOME OVEN'}
            </div>
            <div style={{
              fontFamily: T.mincho, fontSize: 16, fontWeight: 600, color: T.sumi, marginTop: 4,
              lineHeight: 1.3,
            }}>
              松島牡蠣と仙台せりの<br/>春一枚
            </div>

            {/* meta row + badge */}
            <div style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.sumiSoft }}>⏱ 35 分</span>
              <span style={{ color: T.sumiMuted }}>·</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.sumiSoft }}>
                🔥 {v.kind === 'enro' ? '420°C / 95 秒' : '280°C / 10 分'}
              </span>
              <span style={{ color: T.sumiMuted }}>·</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.sumiSoft }}>👥 4 人前</span>
            </div>

            {/* the badge — tappable, leads to /equipment */}
            <div style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px 5px 8px', borderRadius: 999,
              background: v.kind === 'enro' ? 'rgba(200,65,42,0.08)' : 'rgba(220,138,42,0.12)',
              border: `1px solid ${v.kind === 'enro' ? 'rgba(200,65,42,0.22)' : 'rgba(220,138,42,0.3)'}`,
            }}>
              <span style={{ fontSize: 11 }}>{v.kind === 'enro' ? '🔥' : '🍳'}</span>
              <span style={{
                fontFamily: T.gothic, fontSize: 10.5, fontWeight: 700,
                color: v.kind === 'enro' ? T.shuDeep : '#7A4C16', letterSpacing: 0.5,
              }}>
                {v.label.replace(/^\S+\s/, '')} の前提
              </span>
              {Icon.chev('right', v.kind === 'enro' ? T.shuDeep : '#7A4C16', 10)}
            </div>

            <div style={{
              marginTop: 10, fontFamily: T.gothic, fontSize: 11, color: T.sumiMuted, lineHeight: 1.7,
            }}>
              {v.kind === 'enro'
                ? '高温短時間が前提のレシピです。バッジをタップで機材ガイドへ。'
                : '家庭オーブン向けに温度・時間を再生成しました。'}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', left: 16, right: 16, bottom: 16,
        padding: '12px 14px', borderRadius: 12,
        background: 'rgba(31,26,18,0.04)', border: `1px solid ${T.hairline}`,
        fontFamily: T.gothic, fontSize: 10.5, color: T.sumiSoft, lineHeight: 1.7,
      }}>
        <b style={{ fontFamily: T.mincho, color: T.sumi }}>原則:</b>{' '}
        ピル型・<b>機能色 + 透明背景</b> で「メタ情報」感を保つ。CTA 色 (朱) と
        競合しないよう不透明度を落とす。タップで <code style={{ fontFamily: T.mono }}>/equipment</code> へ。
      </div>
    </div>
  );
}

// ===================================================================
// TopEquipmentLink — 2 placement options
// ===================================================================
function TopEquipmentLink() {
  // Compares: (A) small footer link inside TOP, (B) sub-link under hero CTA.
  const Mock = ({ kind }) => (
    <Phone>
      <div style={{ height: 54 }}/>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 0' }}>
        <FurusatoMark variant="B" size={88}/>
      </div>

      <div style={{ padding: '14px 32px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, color: T.shu, letterSpacing: 5, fontWeight: 500 }}>
          地 元 × ピ ザ × A I
        </div>
        <div style={{ margin: '12px auto 0', display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: T.mincho, fontSize: 14, fontWeight: 600, color: T.sumi, letterSpacing: 4 }}>
            ふるさとピザ帳
          </span>
        </div>
        <div style={{
          fontFamily: T.mincho, fontSize: 28, fontWeight: 600, color: T.sumi,
          marginTop: 18, lineHeight: 1.35, letterSpacing: 1,
        }}>
          未来の一枚は、<br/>あなたの地元にある。
        </div>
        <div style={{ fontSize: 12, color: T.sumiSoft, marginTop: 16, lineHeight: 1.85, letterSpacing: 0.3 }}>
          地元の食材と季節から、<br/>
          AI があなただけのピザを 3 案。
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', left: 32, right: 32, bottom: kind === 'B' ? 138 : 100 }}>
        <div style={{
          width: '100%', height: 52, borderRadius: 999,
          background: T.shu, color: '#fff',
          boxShadow: '0 6px 18px rgba(200,65,42,0.32), inset 0 -2px 0 rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: T.gothic, fontWeight: 700, fontSize: 15, letterSpacing: 0.6,
        }}>
          ピザ作りを始める {Icon.arrow('#fff', 14)}
        </div>

        {kind === 'B' && (
          <div style={{
            marginTop: 14, display: 'flex', gap: 6, justifyContent: 'center',
          }}>
            {[
              { emoji: '📔', jp: 'ピザ帳',     route: '/library'   },
              { emoji: '📓', jp: '振り返り帳', route: '/journal'   },
              { emoji: '🔥', jp: '機材ガイド', route: '/equipment', accent: true },
            ].map(l => (
              <div key={l.route} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 10px', borderRadius: 999,
                background: l.accent ? 'rgba(200,65,42,0.08)' : T.kinari,
                border: `1px solid ${l.accent ? 'rgba(200,65,42,0.22)' : T.hairline}`,
              }}>
                <span style={{ fontSize: 11 }}>{l.emoji}</span>
                <span style={{
                  fontFamily: T.gothic, fontSize: 11, fontWeight: 700,
                  color: l.accent ? T.shuDeep : T.sumi, letterSpacing: 0.3,
                  whiteSpace: 'nowrap',
                }}>{l.jp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: SAFE_BOT_A + 8, textAlign: 'center',
      }}>
        {kind === 'A' ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12, padding: '0 24px',
            fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft, letterSpacing: 0.5,
          }}>
            {[
              { emoji: '📔', jp: 'ピザ帳' },
              { emoji: '📓', jp: '振り返り帳' },
              { emoji: '🔥', jp: '機材ガイド', accent: true },
            ].map((l, i, arr) => (
              <React.Fragment key={l.jp}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
                  color: l.accent ? T.shu : T.sumiSoft,
                  textDecoration: 'underline', textDecorationColor: l.accent ? 'rgba(200,65,42,0.4)' : 'rgba(146,133,113,0.4)',
                  textUnderlineOffset: 3,
                }}>
                  <span style={{ fontSize: 11 }}>{l.emoji}</span>
                  {l.jp}
                </span>
                {i < arr.length - 1 && <span style={{ width: 1, height: 11, background: T.hairline }}/>}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.sumiMuted, letterSpacing: 3 }}>
            FURUSATO PIZZA-CHO · 2026
          </div>
        )}
      </div>
    </Phone>
  );

  return (
    <div style={{
      width: Wa * 2 + 48, padding: '32px 24px 36px',
      background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      fontFamily: T.gothic, color: T.sumi, boxSizing: 'border-box',
    }}>
      <div style={{ paddingLeft: 12 }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.shu, letterSpacing: 5 }}>
          SLICE 8 · 05 · TOP → /equipment 動線
        </div>
        <div style={{
          fontFamily: T.mincho, fontSize: 24, fontWeight: 600, color: T.sumi,
          marginTop: 8, lineHeight: 1.35, letterSpacing: 1,
        }}>
          TOP からの誘導 — 2 案
        </div>
      </div>

      <div style={{
        marginTop: 22, display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <div style={{ width: Wa }}>
          <Cap8 accent={T.sumiSoft}>案 A · フッターに小さく</Cap8>
          <div style={{ borderRadius: 28, overflow: 'hidden' }}><Mock kind="A"/></div>
          <div style={{
            marginTop: 10, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(31,26,18,0.03)', border: `1px solid ${T.hairline}`,
            fontFamily: T.gothic, fontSize: 11, color: T.sumiSoft, lineHeight: 1.7,
          }}>
            <b style={{ color: T.sumi, fontFamily: T.mincho }}>長所:</b> 既存トーンと一貫し、TOP の余韻を切らない。<br/>
            <b style={{ color: T.sumi, fontFamily: T.mincho }}>短所:</b> 「始める」前に機材を意識する人には届きにくい。
          </div>
        </div>
        <div style={{ width: Wa }}>
          <Cap8 accent={T.shu}>案 B · 主 CTA 下の朱ピル (推奨)</Cap8>
          <div style={{ borderRadius: 28, overflow: 'hidden' }}><Mock kind="B"/></div>
          <div style={{
            marginTop: 10, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(200,65,42,0.06)', border: '1px solid rgba(200,65,42,0.22)',
            fontFamily: T.gothic, fontSize: 11, color: T.shuDeep, lineHeight: 1.7,
          }}>
            <b style={{ fontFamily: T.mincho }}>推奨:</b> Slice 8 の主役 (/equipment) なので、TOP でも見える位置に。
            主 CTA を邪魔しない控えめなピル型。「始める」を選ぶ前に
            ENRO の存在を匂わせ、後で迷子にしない。
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// EquipmentSpecCard — design decisions / handoff notes
// ===================================================================
function EquipmentSpecCard() {
  const Section = ({ jp, en, children }) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: T.mincho, fontSize: 15, fontWeight: 600, color: T.sumi, letterSpacing: 1 }}>{jp}</span>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.sumiMuted, letterSpacing: 2 }}>{en}</span>
      </div>
      <div style={{
        marginTop: 8, padding: '12px 14px', background: T.kinari, borderRadius: 10,
        border: `1px solid ${T.hairline}`,
        fontSize: 12.5, color: T.sumiSoft, lineHeight: 1.85,
      }}>{children}</div>
    </div>
  );
  const Code = ({ children }) => (
    <span style={{
      fontFamily: T.mono, fontSize: 11.5, padding: '1px 5px', borderRadius: 4,
      background: 'rgba(31,26,18,0.06)', color: T.sumi,
    }}>{children}</span>
  );

  return (
    <div style={{
      width: 760, minHeight: 1500,
      background: T.washi, backgroundImage: WASHI_NOISE, backgroundBlendMode: 'multiply',
      padding: '36px 40px 40px', fontFamily: T.gothic, color: T.sumi, boxSizing: 'border-box',
    }}>
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.shu, letterSpacing: 5 }}>
        SLICE 8 · DESIGN DECISIONS
      </div>
      <div style={{
        fontFamily: T.mincho, fontSize: 26, fontWeight: 600, color: T.sumi,
        marginTop: 8, lineHeight: 1.3,
      }}>
        機材ガイド &amp; 機材プロファイル<br/>確定した仕様
      </div>

      <Section jp="プロファイル切替 UI の配置 · 結論: 案 A + 案 B のハイブリッド" en="PLACEMENT">
        · <b style={{ color: T.sumi }}>常設エントリ (案 A)</b>: HeaderRow Dropdown に「🔥 機材ガイド · 現在: ENRO」を追加。
          全画面共通で常に「現在のプロファイル」が見え、ガイドへ 1 タップで届く。<br/>
        · <b style={{ color: T.sumi }}>レシピ直前エントリ (案 B)</b>: 食材選択 (Tap2) のヘッダ右にだけ、独立した
          <Code>🔥 ENRO ▾</Code> セレクタを並列配置 (地元 <Code>📍</Code> と対) — 生成直前の確認ポイント。<br/>
        · 設定ページ案 (案 C) は <b>不採用</b>: Slice 8 のスコープでは重く、導線も浅くなる。
      </Section>

      <Section jp="切替モーダルの確定挙動" en="BOTTOM SHEET">
        · 形態: <b>iOS bottom sheet</b> (角丸 22px、ドラッグハンドル、背面ディム 0.45)。<br/>
        · 選択は <b>ラジオ単一</b>。タップで <b>仮選択</b>、「この機材で続ける」ボタンで <b>確定</b>。<br/>
        · <Code>Esc</Code> / 外側タップ / × ボタン / ハンドル下スワイプで <b>破棄</b>。<br/>
        · 切替後は <b>4 秒の Toast</b> を出し、「取消」でロールバック可能 (undoable)。<br/>
        · 直前にレシピ候補が表示されていた場合 → Toast に「再生成しますか？」を追記。
      </Section>

      <Section jp="アフィリエイト注記の最終配置 · 文言" en="AFFILIATE DISCLOSURE">
        · <b style={{ color: T.sumi }}>3 箇所に分散</b> (= 多重透明性):<br/>
          &nbsp;&nbsp;<b>1</b>. Hero の CTA 下 1 行: <Code>※ 楽天アフィリエイト · rel="sponsored"</Code><br/>
          &nbsp;&nbsp;<b>2</b>. ページ末尾の <b>FooterNotice カード</b> (中身が透けて見える生成り地)<br/>
          &nbsp;&nbsp;<b>3</b>. リンク自体に <Code>rel="sponsored noopener"</Code><br/>
          一方、フッター <b>固定</b> (sticky) は <b>不採用</b>: 既存トーンと合わず、信頼向上より圧迫が勝る。
        <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(31,26,18,0.04)', border: `1px solid ${T.hairline}`,
          fontFamily: T.gothic, fontSize: 11.5, color: T.sumi, lineHeight: 1.8 }}>
          <b style={{ fontFamily: T.mincho, fontSize: 12 }}>確定文言 (FooterNotice):</b><br/>
          「※ 本ページのリンクは楽天アフィリエイトを含みます。
          運営者は ENRO の 1 ユーザとして本機材を推奨していますが、
          メーカー・販売店との提携・PR 案件ではありません。
          クリックによる紹介手数料が、運営費に充当されます。」
        </div>
      </Section>

      <Section jp="LP の機材画像 (実イラスト適用済み)" en="HERO IMAGE">
        · Hero 画像は <b>ENRO の電気ピザ窯 + 食卓シーン</b>のイラスト
          (<Code>assets/enro-hero.png</Code>) を <b>ImageSlot</b> に流し込み済み。<br/>
        · <b>ImageSlot</b> は <Code>src</Code> propを渡すと「実画像モード」になり、コーナーティック・
          仮タグ・washi 背景を自動で抑制。実写真への差し替えも同じ API で。<br/>
        · 差し替え時の置換: <Code>{`<ImageSlot src="..." alt=".." />`}</Code><br/>
        · 仮イラスト時に使っていた <b>OvenIllustration</b> 線画コンポーネントは
          コードに残置 (将来の二次利用用)。</Section>

      <Section jp="比較表のデザインパターン" en="COMPARE TABLE">
        · HTML <Code>{`<table>`}</Code> ではなく、<b>和帳風 2 カラム</b>。中央を <b>細い縦線</b> で仕切る (帳面の罫線)。<br/>
        · 各行はラベル + 家庭オーブン値 + 縦線 + ENRO 値。<b>勝ち側</b>を太字 +
          ENRO 側には小さな朱ドット (発光感) を添える。<br/>
        · ENRO が勝ち項目 6 / 家庭オーブン 1 (= 初期コスト): <b>偏りを認める</b> ことで誠実さを担保。<br/>
        · 表のすぐ下に「結局のところ」段落を 1 つ追加し、判断軸を一文で要約。
      </Section>

      <Section jp="「ポータブル運用」の視覚強調" en="PORTABLE EMPHASIS">
        · 3 カードのうち <b>中央のみ反転 (墨地・生成り文字)</b>。色の刷り込みではなく <b>明度反転</b> で目立たせる。<br/>
        · 右上に <Code>★ KEY</Code> バッジ (朱)、下部に「HOST × ANYWHERE」スタンプ。<br/>
        · アイコンは <b>スーツケース</b>: 「持ち出せる調理器具」というメタファーで一発理解。<br/>
        · コピーで「このプロダクトのコンセプトと深く繋がる」を明示。
      </Section>

      <Section jp="HeaderDropdown · 機材ガイド項目" en="DROPDOWN ITEM">
        · 位置: 振り返り帳の下、区切り線の前 (= 3 番目)。<br/>
        · 副題行は <b>"🔥 現在: ENRO"</b> — モノラベルではなくゴシック (機能情報のため)。<br/>
        · 初回のみ <b>NEW バッジ (朱・極小)</b>。<Code>localStorage.equipmentLinkSeen=true</Code> で抑制。<br/>
        · タップ → <Code>/equipment</Code>。
      </Section>

      <Section jp="詳細画面のオーブンバッジ (任意)" en="DETAIL BADGE">
        · 温度・時間メタ行の <b>直下</b>に、<b>ピル型バッジ</b> として配置。<br/>
        · 色: ENRO = 朱の極薄塗り / 家庭オーブン = 山吹の極薄塗り。<br/>
        · 主 CTA (朱) と <b>競合しない透明度</b>。タップで <Code>/equipment</Code> へリンク。<br/>
        · 「主張しすぎず、気付ける」線を明度差 + 太字ラベルで担保。
      </Section>

      <Section jp="TOP からの動線 · 結論: 案 B (主 CTA 下の朱ピル)" en="TOP HOOK">
        · Slice 8 の主役は <b>/equipment</b>。フッター案 (A) は控えめすぎる。<br/>
        · 「始める」直下に <b>朱ピル</b>「🔥 ENRO の機材ガイドを見る」。主 CTA より <b>1 段下げた</b> 重量。<br/>
        · 既存の朱トーンと矛盾せず、初訪問の人にも「機材がある」が伝わる。
      </Section>

      <div style={{
        marginTop: 24, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(96,119,68,0.10)', border: '1px solid rgba(96,119,68,0.22)',
        fontSize: 12, color: '#3F5028', lineHeight: 1.85,
      }}>
        <b style={{ fontFamily: T.mincho, fontSize: 13 }}>透明性ガイドライン (運用ルール)</b><br/>
        · リンクには必ず <Code>rel="sponsored noopener"</Code><br/>
        · 「メーカーとの関係性」と「個人ユーザとしての立場」を毎回明示する<br/>
        · ENRO 専用感が出すぎないよう、家庭オーブン補足セクション + 機材プロファイル切替 UI を維持
      </div>
    </div>
  );
}

Object.assign(window, {
  OvenProfileSelector, OvenProfileSheet, OvenProfileToast,
  HeaderDropdownV3, HeaderDropdownV3Items,
  DetailOvenBadge, TopEquipmentLink, EquipmentSpecCard,
  Cap8,
});
