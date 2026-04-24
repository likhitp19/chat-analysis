// Filter summary + helper components

function FilterSummary({ filters }) {
  const active = [];
  if (filters.mode !== "All") active.push({ label: "Mode", value: filters.mode });
  if (filters.sessionLengths.length > 0 && filters.sessionLengths.length < 3) {
    active.push({ label: "Length", value: filters.sessionLengths.join(", ") });
  }
  if (filters.dateLabel !== "Last 15 days") active.push({ label: "Range", value: filters.dateLabel });
  if (active.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Filtered by</span>
      {active.map((a, i) => (
        <span key={i} className="chip" style={{ background: "var(--accent-bg)", borderColor: "rgba(124,92,255,0.3)", color: "var(--accent-soft)" }}>
          {a.label}: {a.value}
        </span>
      ))}
    </div>
  );
}

function CollapsibleCard({ title, sub, badge, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="card">
      <div className="card-head" style={{ cursor: "pointer", marginBottom: open ? 20 : 0 }} onClick={() => setOpen(o => !o)}>
        <div>
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform 150ms", display: "inline-block" }}>▸</span>
            {title}
          </h3>
          {sub && <p className="card-sub" style={{ marginLeft: 21 }}>{sub}</p>}
        </div>
        {badge}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

window.FilterSummary = FilterSummary;
window.CollapsibleCard = CollapsibleCard;
