/**
 * PizzaDisk — トップダウン視点のピザイラスト (SVG)
 * 元: design/pizza-tokens.jsx の PizzaDisk 関数
 * 決定論的: (seed, toppings) が同じなら毎回同じ出力。
 */

export type ToppingType = 'spot' | 'leaf' | 'ring';

export type Topping = {
  color: string;
  count?: number;
  size?: number;
  type?: ToppingType;
};

type PizzaDiskProps = {
  size?: number;
  toppings?: Topping[];
  seed?: number;
  label?: string;
};

const pseudoRandom = (s: number): number => {
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
};

export function PizzaDisk({ size = 200, toppings = [], seed = 1, label }: PizzaDiskProps) {
  const r = size / 2;
  const crust = size * 0.46;
  const sauce = size * 0.4;

  const spots: Array<{ topping: Topping; x: number; y: number; sz: number }> = [];
  let spotIdx = 0;
  for (const t of toppings) {
    const count = t.count ?? 6;
    for (let i = 0; i < count; i++) {
      const k = spotIdx++;
      const angle = pseudoRandom(seed + k * 1.7) * Math.PI * 2;
      const dist = (0.18 + pseudoRandom(seed + k * 2.3) * 0.78) * sauce;
      const sz = (t.size ?? 9) * (0.7 + pseudoRandom(seed + k * 3.1) * 0.6);
      spots.push({
        topping: t,
        x: r + Math.cos(angle) * dist,
        y: r + Math.sin(angle) * dist,
        sz,
      });
    }
  }

  const crustSpeckles = Array.from({ length: 30 }, (_, i) => {
    const a = pseudoRandom(seed + 100 + i) * Math.PI * 2;
    const dd = sauce + (crust - sauce) * (0.3 + pseudoRandom(seed + 200 + i) * 0.7);
    return {
      cx: r + Math.cos(a) * dd,
      cy: r + Math.sin(a) * dd,
      rr: 0.6 + pseudoRandom(seed + 300 + i) * 1.0,
    };
  });

  const cheeseBlobs = Array.from({ length: 14 }, (_, i) => {
    const a = pseudoRandom(seed + 500 + i) * Math.PI * 2;
    const dd = pseudoRandom(seed + 600 + i) * sauce * 0.9;
    const rr = 5 + pseudoRandom(seed + 700 + i) * 8;
    return { cx: r + Math.cos(a) * dd, cy: r + Math.sin(a) * dd, rr };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? 'pizza illustration'}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`crust-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8B97A" />
          <stop offset="70%" stopColor="#C98947" />
          <stop offset="100%" stopColor="#8E5824" />
        </radialGradient>
        <radialGradient id={`sauce-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D8552F" />
          <stop offset="100%" stopColor="#A53A1C" />
        </radialGradient>
      </defs>

      {/* outer shadow */}
      <circle cx={r} cy={r} r={r - 2} fill="#000" opacity={0.18} transform="translate(0,3)" />

      {/* crust */}
      <circle
        cx={r}
        cy={r}
        r={crust}
        fill={`url(#crust-${seed})`}
        stroke="#7A4419"
        strokeWidth={0.5}
      />

      {/* crust speckles */}
      {crustSpeckles.map((s, i) => (
        <circle key={`speckle-${i}`} cx={s.cx} cy={s.cy} r={s.rr} fill="#5C3110" opacity={0.4} />
      ))}

      {/* sauce */}
      <circle cx={r} cy={r} r={sauce} fill={`url(#sauce-${seed})`} />

      {/* cheese blobs */}
      {cheeseBlobs.map((c, i) => (
        <circle key={`cheese-${i}`} cx={c.cx} cy={c.cy} r={c.rr} fill="#F2E5BF" opacity={0.85} />
      ))}

      {/* toppings */}
      {spots.map((s, i) => {
        if (s.topping.type === 'leaf') {
          return (
            <g
              key={`topping-${i}`}
              transform={`translate(${s.x},${s.y}) rotate(${pseudoRandom(seed + i) * 360})`}
            >
              <ellipse cx={0} cy={0} rx={s.sz} ry={s.sz * 0.45} fill={s.topping.color} />
              <path d={`M${-s.sz},0 L${s.sz},0`} stroke="#3A4F1F" strokeWidth={0.6} opacity={0.5} />
            </g>
          );
        }
        if (s.topping.type === 'ring') {
          return (
            <circle
              key={`topping-${i}`}
              cx={s.x}
              cy={s.y}
              r={s.sz}
              fill="none"
              stroke={s.topping.color}
              strokeWidth={2.5}
            />
          );
        }
        return (
          <circle key={`topping-${i}`} cx={s.x} cy={s.y} r={s.sz / 2} fill={s.topping.color} />
        );
      })}

      {/* highlight */}
      <ellipse
        cx={r - sauce * 0.3}
        cy={r - sauce * 0.4}
        rx={sauce * 0.4}
        ry={sauce * 0.15}
        fill="#fff"
        opacity={0.1}
      />
    </svg>
  );
}
