// Lightweight SVG chart primitives for Riya Analytics
// No dependencies — React only.

const chartColors = {
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  positive: "var(--positive)",
  warning: "var(--warning)",
  negative: "var(--negative)",
  dim: "var(--text-muted)",
  surface2: "var(--surface-2)",
};

// === LINE / AREA CHART ===
function LineChart({ data, height = 220, showArea = true, accent = "#7C5CFF", annotations = [], yLabel, xLabelEvery = 2 }) {
  const gradId = "ag_" + React.useId().replace(/:/g, "");
  const W = 640;
  const H = height;
  const PAD = { top: 20, right: 16, bottom: 28, left: 36 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map(d => d.v)) * 1.1;
  const min = 0;
  const xs = (i) => PAD.left + (i / (data.length - 1)) * iw;
  const ys = (v) => PAD.top + ih - ((v - min) / (max - min)) * ih;

  const points = data.map((d, i) => `${xs(i)},${ys(d.v)}`).join(" ");
  const areaPath = `M ${xs(0)},${ys(min)} L ${points.split(" ").join(" L ")} L ${xs(data.length - 1)},${ys(min)} Z`;
  const linePath = "M " + points.split(" ").join(" L ");

  // gridlines
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  const peakIdx = data.reduce((m, d, i) => (d.v > data[m].v ? i : m), 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* grid */}
      {gridVals.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={ys(g)} y2={ys(g)} stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 0 ? "" : "2,4"} opacity={i === 0 ? 0.6 : 0.4} />
          <text x={PAD.left - 8} y={ys(g)} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end" alignmentBaseline="middle">{Math.round(g)}</text>
        </g>
      ))}
      {/* x labels */}
      {data.map((d, i) => (i % xLabelEvery === 0) && (
        <text key={i} x={xs(i)} y={H - 8} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">{d.d}</text>
      ))}
      {/* area + line */}
      {showArea && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={linePath} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* peak dot */}
      <circle cx={xs(peakIdx)} cy={ys(data[peakIdx].v)} r="4" fill={accent} />
      <circle cx={xs(peakIdx)} cy={ys(data[peakIdx].v)} r="9" fill={accent} opacity="0.2" />
      {/* peak label */}
      <text x={xs(peakIdx)} y={ys(data[peakIdx].v) - 12} fill="var(--text)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="500">{data[peakIdx].v}</text>
      {/* last dot */}
      <circle cx={xs(data.length - 1)} cy={ys(data[data.length - 1].v)} r="3" fill={accent} />

      {/* annotations */}
      {annotations.map((a, i) => (
        <g key={i}>
          <line x1={xs(a.index)} x2={xs(a.index)} y1={PAD.top} y2={H - PAD.bottom} stroke={accent} strokeDasharray="3,3" opacity="0.4" />
          <rect x={xs(a.index) + 6} y={PAD.top + 4} width={a.label.length * 6 + 12} height="18" rx="3" fill="var(--surface-2)" stroke="var(--border)" />
          <text x={xs(a.index) + 12} y={PAD.top + 16} fill="var(--text-dim)" fontSize="10" fontFamily="var(--font-mono)">{a.label}</text>
        </g>
      ))}
    </svg>
  );
}

// === BAR CHART (vertical) ===
function BarChart({ data, height = 220, accent = "#7C5CFF", highlightIndex = null, labelEvery = 2 }) {
  const W = 640;
  const H = height;
  const PAD = { top: 16, right: 8, bottom: 28, left: 36 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map(d => d.v)) * 1.1;
  const bw = iw / data.length - 3;
  const ys = (v) => PAD.top + ih - (v / max) * ih;

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {gridVals.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={ys(g)} y2={ys(g)} stroke="var(--border)" strokeDasharray={i === 0 ? "" : "2,4"} opacity={i === 0 ? 0.6 : 0.4} />
          <text x={PAD.left - 8} y={ys(g)} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end" alignmentBaseline="middle">{Math.round(g)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = PAD.left + i * (iw / data.length) + 1.5;
        const h = (d.v / max) * ih;
        const y = PAD.top + ih - h;
        const isHi = highlightIndex === i;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="1.5" fill={accent} opacity={isHi ? 1 : 0.55} />
            {isHi && (
              <text x={x + bw / 2} y={y - 6} fill="var(--text)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="500">{d.v}</text>
            )}
            {i % labelEvery === 0 && (
              <text x={x + bw / 2} y={H - 10} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">{d.label ?? d.d ?? i}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// === SPARKLINE ===
function Sparkline({ data, width = 100, height = 30, accent = "#7C5CFF" }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" vectorEffect="non-scaling-stroke" />
      <circle cx={width} cy={height - ((data[data.length-1] - min) / range) * (height - 4) - 2} r="2.5" fill={accent} />
    </svg>
  );
}

// === DONUT (with center label) ===
function Donut({ data, size = 200, innerRatio = 0.65, colors }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 6;
  const ir = r * innerRatio;
  let a0 = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const frac = d.v / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi0 = cx + ir * Math.cos(a0), yi0 = cy + ir * Math.sin(a0);
    const xi1 = cx + ir * Math.cos(a1), yi1 = cy + ir * Math.sin(a1);
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0} Z`;
    const result = { path, color: colors[i % colors.length], label: d.label, pct: Math.round(frac * 100), v: d.v };
    a0 = a1;
    return result;
  });
  return { size, arcs, total, cx, cy, ir };
}

function DonutChart({ data, colors, centerLabel, centerValue, size = 200 }) {
  const d = Donut({ data, size, colors });
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {d.arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} />
        ))}
        {centerValue && (
          <>
            <text x={d.cx} y={d.cy - 4} fill="var(--text)" fontSize="22" fontFamily="var(--font-serif)" textAnchor="middle">{centerValue}</text>
            <text x={d.cx} y={d.cy + 14} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" letterSpacing="0.5">{centerLabel}</text>
          </>
        )}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {d.arcs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--text-dim)" }}>{a.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text)", fontSize: 12, fontFeatureSettings: "'tnum' 1" }}>{a.pct}%</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 11, width: 52, textAlign: "right" }}>{a.v.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === STACKED HORIZONTAL BAR (for depth buckets) ===
function StackedBar({ segments, height = 44 }) {
  const total = segments.reduce((s, x) => s + x.v, 0);
  let acc = 0;
  return (
    <div>
      <div style={{ display: "flex", width: "100%", height, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        {segments.map((s, i) => {
          const w = (s.v / total) * 100;
          const el = <div key={i} style={{ width: `${w}%`, background: s.color, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
            {w > 10 ? `${Math.round(w)}%` : ""}
          </div>;
          acc += w;
          return el;
        })}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 12 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span style={{ color: "var(--text-dim)" }}>{s.label}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{s.v.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// === HORIZONTAL BAR LIST ===
function HBarList({ items, accent = "#7C5CFF", accentField = null, valueFormat = v => v }) {
  const max = Math.max(...items.map(i => i.v));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item, i) => {
        const w = (item.v / max) * 100;
        const color = accentField && item[accentField] ? item[accentField] : accent;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 52px", gap: 14, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text)" }}>{item.label}</span>
                {item.sub && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{item.sub}</span>}
              </div>
              <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 2 }} />
              </div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)", textAlign: "right", fontFeatureSettings: "'tnum' 1" }}>{valueFormat(item.v)}</span>
          </div>
        );
      })}
    </div>
  );
}

// === HEATMAP (hour × day) ===
function Heatmap({ data, rows, cols, accent = "#7C5CFF" }) {
  // data is 2D [row][col] numeric
  const flat = data.flat();
  const max = Math.max(...flat);
  const cell = 14;
  const gap = 2;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `40px repeat(${cols.length}, ${cell}px)`, gap, alignItems: "center" }}>
        <div />
        {cols.map((c, i) => (
          <div key={i} style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textAlign: "center" }}>{c}</div>
        ))}
        {rows.map((r, rI) => (
          <React.Fragment key={rI}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textAlign: "right", paddingRight: 8 }}>{r}</div>
            {data[rI].map((v, cI) => {
              const opacity = 0.08 + (v / max) * 0.92;
              return (
                <div key={cI} title={`${r} ${cols[cI]}: ${v}`} style={{ width: cell, height: cell, background: accent, opacity, borderRadius: 2 }} />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LineChart, BarChart, Sparkline, DonutChart, StackedBar, HBarList, Heatmap, chartColors });
