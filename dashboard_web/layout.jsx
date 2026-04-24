// Sidebar + navigation shell

function Icon({ name }) {
  const paths = {
    master: "M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z",
    overview: "M3 12h4l3-9 4 18 3-9h4",
    depth: "M3 3v18h18 M7 14l4-4 4 4 4-6",
    scenarios: "M4 6h16 M4 12h10 M4 18h6",
    behavior: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4l1.4-1.4 M17 7l1.4-1.4",
    quality: "M12 2l2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z",
    topics: "M21 21l-4.35-4.35 M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z",
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

function Sidebar({ page, setPage, filters, setFilters }) {
  const items = [
    { id: "overview",  label: "Overview",            icon: "overview",  count: "01" },
    { id: "quality",   label: "Conversation Quality", icon: "quality",  count: "02" },
    { id: "topics",    label: "AI Synthesis",         icon: "topics",   count: "03" },
  ];
  const secondary = [
    { id: "depth",      label: "Session Depth",    icon: "depth",      count: "04" },
    { id: "scenarios",  label: "Scenarios",        icon: "scenarios",  count: "05" },
    { id: "behavior",   label: "User Behavior",    icon: "behavior",   count: "06" },
  ];

  const [dateOpen, setDateOpen] = React.useState(false);
  const [lengthOpen, setLengthOpen] = React.useState(false);
  const dateRef = React.useRef(null);
  const lenRef = React.useRef(null);

  React.useEffect(() => {
    const onClick = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false);
      if (lenRef.current && !lenRef.current.contains(e.target)) setLengthOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const datePresets = [
    { label: "Last 7 days",   range: "Apr 16 – Apr 22" },
    { label: "Last 15 days",  range: "Apr 8 – Apr 22" },
    { label: "Last 30 days",  range: "Mar 24 – Apr 22" },
    { label: "Month to date", range: "Apr 1 – Apr 22" },
  ];
  const [customMode, setCustomMode] = React.useState(false);
  const [customFrom, setCustomFrom] = React.useState("2026-04-08");
  const [customTo, setCustomTo] = React.useState("2026-04-22");
  const applyCustom = () => {
    const fmt = (iso) => {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    const range = `${fmt(customFrom)} – ${fmt(customTo)}`;
    setFilters({ ...filters, dateRange: range, dateLabel: "Custom range" });
    setDateOpen(false);
    setCustomMode(false);
  };
  const lengthOpts = [
    { id: "short",  label: "Short (≤4 msgs)" },
    { id: "medium", label: "Medium (5–20)" },
    { id: "long",   label: "Long (>20)" },
  ];
  const toggleLength = (id) => {
    const next = filters.sessionLengths.includes(id)
      ? filters.sessionLengths.filter(x => x !== id)
      : [...filters.sessionLengths, id];
    setFilters({ ...filters, sessionLengths: next });
  };
  const lengthLabel = filters.sessionLengths.length === 0 || filters.sessionLengths.length === 3
    ? "All lengths"
    : filters.sessionLengths.length === 1
      ? lengthOpts.find(l => l.id === filters.sessionLengths[0]).label
      : `${filters.sessionLengths.length} selected`;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">r</div>
        <div className="brand-text">
          <div className="brand-product">Riya Analytics</div>
          <div className="brand-company">lokal · sahi english</div>
        </div>
      </div>

      <div>
        <div className="nav-section-label">Insights</div>
        <div className="nav">
          {items.map(it => (
            <button key={it.id} className={`nav-item ${page === it.id ? "active" : ""}`} onClick={() => setPage(it.id)}>
              <span className="nav-icon"><Icon name={it.icon} /></span>
              <span>{it.label}</span>
              <span className="nav-count">{it.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="nav-section-label">Detail Views</div>
        <div className="nav">
          {secondary.map(it => (
            <button key={it.id} className={`nav-item ${page === it.id ? "active" : ""}`} onClick={() => setPage(it.id)}>
              <span className="nav-icon"><Icon name={it.icon} /></span>
              <span>{it.label}</span>
              <span className="nav-count">{it.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-filters">
        <div style={{ position: "relative" }} ref={dateRef}>
          <div className="filter-label">Date Range</div>
          <button className="filter-control" onClick={() => setDateOpen(o => !o)}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{filters.dateRange}</span>
            <span className="chev">▾</span>
          </button>
          {dateOpen && (
            <div className="popover">
              {!customMode && datePresets.map(p => (
                <button key={p.label} className={`popover-item ${filters.dateRange === p.range ? "on" : ""}`}
                  onClick={() => { setFilters({ ...filters, dateRange: p.range, dateLabel: p.label }); setDateOpen(false); }}>
                  <span>{p.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{p.range}</span>
                </button>
              ))}
              {!customMode && (
                <button className="popover-item" onClick={() => setCustomMode(true)}>
                  <span>Custom range…</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>Pick dates</span>
                </button>
              )}
              {customMode && (
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div className="filter-label" style={{ marginBottom: 4 }}>From</div>
                    <input type="date" className="input" value={customFrom} min="2025-01-01" max={customTo} onChange={e => setCustomFrom(e.target.value)} style={{ colorScheme: "dark", padding: "6px 10px", fontSize: 12 }} />
                  </div>
                  <div>
                    <div className="filter-label" style={{ marginBottom: 4 }}>To</div>
                    <input type="date" className="input" value={customTo} min={customFrom} max="2026-12-31" onChange={e => setCustomTo(e.target.value)} style={{ colorScheme: "dark", padding: "6px 10px", fontSize: 12 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn ghost" style={{ flex: 1, padding: "6px 10px", fontSize: 12 }} onClick={() => setCustomMode(false)}>Back</button>
                    <button className="btn primary" style={{ flex: 1, padding: "6px 10px", fontSize: 12 }} onClick={applyCustom}>Apply</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="filter-label">Mode</div>
          <div className="segmented">
            {["All", "Voice", "Chat"].map(m => (
              <button key={m} className={filters.mode === m ? "on" : ""} onClick={() => setFilters({ ...filters, mode: m })}>{m}</button>
            ))}
          </div>
        </div>
        <div style={{ position: "relative" }} ref={lenRef}>
          <div className="filter-label">Session Length</div>
          <button className="filter-control" onClick={() => setLengthOpen(o => !o)}>
            <span style={{ color: filters.sessionLengths.length === 0 ? "var(--text-muted)" : "var(--text)" }}>{lengthLabel}</span>
            <span className="chev">▾</span>
          </button>
          {lengthOpen && (
            <div className="popover">
              {lengthOpts.map(l => (
                <button key={l.id} className={`popover-item ${filters.sessionLengths.includes(l.id) ? "on" : ""}`}
                  onClick={() => toggleLength(l.id)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid var(--border-strong)", background: filters.sessionLengths.includes(l.id) ? "var(--accent)" : "transparent", display: "grid", placeItems: "center", color: "white", fontSize: 10 }}>
                      {filters.sessionLengths.includes(l.id) && "✓"}
                    </span>
                    {l.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--positive)", boxShadow: "0 0 0 3px rgba(95,227,192,0.15)" }} />
        Live · updated 2m ago
      </div>
    </aside>
  );
}

function PageHeader({ crumbs, title, titleEm, date }) {
  return (
    <header className="page-head">
      <div>
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <span style={{ opacity: i === crumbs.length - 1 ? 1 : 0.6 }}>{c}</span>
              {i < crumbs.length - 1 && <span className="sep">/</span>}
            </React.Fragment>
          ))}
        </div>
        <h1 className="page-title">{title} {titleEm && <em>{titleEm}</em>}</h1>
      </div>
      <div className="page-date">
        <span className="dot" />
        {date}
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, PageHeader, Icon });
