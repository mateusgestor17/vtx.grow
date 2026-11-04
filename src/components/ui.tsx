import { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Cores de score: vermelho (crítico) → laranja → amarelo → verde (bom)
// ---------------------------------------------------------------------------
export const C = { red: '#e5484d', orange: '#f2711c', yellow: '#f2a516', green: '#1fa463', blue: '#3d73e8', purple: '#7c5cf0', teal: '#10a5b8' };
export function scoreColor(s: number) { return s < 40 ? C.red : s < 55 ? C.orange : s < 70 ? C.yellow : C.green; }
export function scoreLabel(s: number) { return s < 40 ? 'Crítico' : s < 55 ? 'Atenção' : s < 70 ? 'Regular' : 'Bom'; }
export function scoreTagClass(s: number) { return s < 40 ? 'red' : s < 55 ? 'orange' : s < 70 ? 'yellow' : 'green'; }
export function priorityColor(p: string) { return p === 'CRÍTICA' ? C.red : p === 'ALTA' ? C.orange : p === 'MÉDIA' ? C.yellow : C.green; }

export function Brand({ small }: { small?: boolean }) {
  return (
    <div className="brand-top">
      <img src="/vortex-logo-ink.png" alt="Vortex Company" className="brand-logo" style={small ? { width: 42, height: 42 } : undefined} />
      <div className="brand-word">VTX<span>.</span>GROW</div>
    </div>
  );
}

export function VortexRings() {
  return <div className="vortex-rings" aria-hidden><span /><span /><span /><span /><span /></div>;
}

export function ScoreRing({ value, size = 150, label, stroke = 12, color }: { value: number; size?: number; label?: string; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const off = c * (1 - v / 100);
  const col = color || scoreColor(v);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={`${label || 'Score'} ${value} de 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#edf1f7" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: size * 0.28, lineHeight: 1, color: col }}>{value}</div>
          <div style={{ fontSize: Math.max(10.5, size * 0.075), color: 'var(--muted)', marginTop: 4 }}>{label || 'de 100'}</div>
        </div>
      </div>
    </div>
  );
}

/** Velocímetro de 0 a 100 com faixas vermelho / laranja / amarelo / verde. */
export function Gauge({ value, size = 260, label }: { value: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const w = size, h = size * 0.62, cx = w / 2, cy = size * 0.52, r = size * 0.4, sw = size * 0.075;
  const pt = (p: number, rr = r) => { const a = Math.PI * (1 - p / 100); return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; };
  const arc = (a: number, b: number) => { const [x1, y1] = pt(a); const [x2, y2] = pt(b); return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`; };
  const bands: [number, number, string][] = [[0, 40, C.red], [40, 55, C.orange], [55, 70, C.yellow], [70, 100, C.green]];
  const [nx, ny] = pt(v, r - sw * 1.1);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label || 'Score'}: ${value} de 100`} style={{ maxWidth: '100%' }}>
      {bands.map(([a, b, col]) => <path key={a} d={arc(a + 0.6, b - 0.6)} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="butt" opacity={v >= a && v <= b ? 1 : 0.28} />)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f1a33" strokeWidth={4} strokeLinecap="round" style={{ transition: 'all 1s' }} />
      <circle cx={cx} cy={cy} r={9} fill="#0f1a33" />
      <text x={pt(0)[0]} y={cy + 20} fontSize={11} fill="#94a0b8" textAnchor="middle">0</text>
      <text x={pt(100)[0]} y={cy + 20} fontSize={11} fill="#94a0b8" textAnchor="middle">100</text>
    </svg>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-row">
      <span>{label}</span>
      <div className="bar"><i style={{ width: `${value}%`, background: scoreColor(value) }} /></div>
      <b style={{ color: scoreColor(value) }}>{value}</b>
    </div>
  );
}

export function PriorityTag({ p }: { p: string }) {
  const k = p === 'CRÍTICA' ? 'red' : p === 'ALTA' ? 'orange' : p === 'MÉDIA' ? 'yellow' : 'green';
  return <span className={`tag ${k}`}>{p}</span>;
}
export function ScoreTag({ s }: { s: number }) { return <span className={`tag ${scoreTagClass(s)}`}>{scoreLabel(s)}</span>; }

/** Gráfico de colunas verticais coloridas por score. */
export function ColumnChart({ data, height = 200 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const W = 100 / data.length;
  return (
    <div style={{ position: 'relative', height: height + 40 }}>
      {[0, 25, 50, 75, 100].map(g => (
        <div key={g} style={{ position: 'absolute', left: 28, right: 0, bottom: 40 + (g / 100) * height, borderTop: '1px dashed #e6ebf3' }}>
          <span style={{ position: 'absolute', left: -28, top: -8, fontSize: 11, color: '#94a0b8' }}>{g}</span>
        </div>
      ))}
      <div style={{ position: 'absolute', left: 34, right: 0, bottom: 0, top: 0, display: 'flex' }}>
        {data.map(d => {
          const col = d.color || scoreColor(d.value);
          return (
            <div key={d.label} style={{ width: `${W}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <b style={{ fontFamily: 'var(--display)', fontSize: 14, color: col, marginBottom: 4 }}>{d.value}</b>
              <div style={{ width: '56%', maxWidth: 54, height: (d.value / 100) * height, background: `linear-gradient(180deg, ${col}, ${col}cc)`, borderRadius: '8px 8px 2px 2px', transition: 'height .8s' }} />
              <div style={{ height: 40, fontSize: 12, color: 'var(--muted)', textAlign: 'center', paddingTop: 8, lineHeight: 1.2 }}>{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Barras horizontais agrupadas (ex.: investimento x receita por cenário). */
export function PairBars({ rows, a, b, fmt }: { rows: { label: string; a: number; b: number }[]; a: { name: string; color: string }; b: { name: string; color: string }; fmt: (n: number) => string }) {
  const max = Math.max(1, ...rows.flatMap(r => [r.a, r.b]));
  return (
    <div>
      <div className="legend-dots mt8"><span><i style={{ background: a.color }} />{a.name}</span><span><i style={{ background: b.color }} />{b.name}</span></div>
      {rows.map(r => (
        <div key={r.label} style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>{r.label}</div>
          {[[r.a, a.color], [r.b, b.color]].map(([v, col], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <div className="bar" style={{ height: 14 }}><i style={{ width: `${((v as number) / max) * 100}%`, background: col as string }} /></div>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{fmt(v as number)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Gráfico de linhas/área simples (SVG) para a rampa mês a mês. */
export function LineChart({ labels, series, height = 220, fmt }: { labels: string[]; series: { name: string; color: string; values: number[]; area?: boolean }[]; height?: number; fmt: (n: number) => string }) {
  const W = 640, H = height, pl = 70, pr = 16, pt = 16, pb = 30;
  const max = Math.max(1, ...series.flatMap(s => s.values)) * 1.08;
  const x = (i: number) => pl + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * (W - pl - pr));
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução mês a mês">
        {[0, .25, .5, .75, 1].map(g => (
          <g key={g}><line x1={pl} x2={W - pr} y1={y(max * g)} y2={y(max * g)} stroke="#e6ebf3" strokeDasharray="4 4" />
            <text x={pl - 8} y={y(max * g) + 4} fontSize={10.5} fill="#94a0b8" textAnchor="end">{fmt(max * g)}</text></g>
        ))}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 8} fontSize={10.5} fill="#94a0b8" textAnchor="middle">{l}</text>)}
        {series.map(s => {
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
          return (
            <g key={s.name}>
              {s.area && <path d={`${d} L ${x(s.values.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill={s.color} opacity={0.1} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} />)}
            </g>
          );
        })}
      </svg>
      <div className="legend-dots">{series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div>
    </div>
  );
}

export function Section({ title, desc, children, right }: { title: string; desc?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="section">
      <div className="section-title">
        <div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

const paths: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  gauge: 'M12 14l4-4M3.5 17a9 9 0 1 1 17 0',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  message: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  channels: 'M4 6h16M4 12h10M4 18h6',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  plus: 'M12 5v14M5 12h14',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  whatsapp: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z',
  log: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
  money: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] || paths.file} />
    </svg>
  );
}

export function Loading() {
  return <div className="center-page"><div className="loader" /></div>;
}
