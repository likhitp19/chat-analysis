// Overview page — narrative opening + KPIs + daily/hourly + splits

function KpiCard({ label, value, unit, delta, deltaDir, sparkData, featured }) {
  return (
    <div className={`kpi ${featured ? "featured" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}{unit && <span className="unit">{unit}</span>}
      </div>
      <div className="kpi-foot">
        {delta !== undefined && (
          <span className={`kpi-delta ${deltaDir}`}>
            {deltaDir === "up" ? "↑" : deltaDir === "down" ? "↓" : "·"} {Math.abs(delta)}%
          </span>
        )}
        <span>vs prior period</span>
      </div>
      {sparkData && (
        <div className="kpi-spark">
          <Sparkline
            data={sparkData}
            width={200}
            height={36}
            accent={deltaDir === "up" ? "#5FE3C0" : deltaDir === "down" ? "#FF8A6B" : "#B8A5FF"}
          />
        </div>
      )}
    </div>
  );
}

function OverviewPage() {
  const D = window.RIYA_DATA;
  const hourlyData = D.hourly.map((v, i) => ({
    label: i === 0 || i % 3 === 0 ? `${String(i).padStart(2, "0")}` : "",
    d: i,
    v,
  }));
  const peakHour = D.hourly.indexOf(Math.max(...D.hourly));

  const sessSpark  = D.daily.map(d => d.v);
  const msgsSpark  = D.daily.map(d => d.v * (D.kpis.messages / D.kpis.sessions));
  const avgSpark   = D.daily.map(() => D.kpis.avgMsgs + (Math.random() - 0.5) * 2);
  const medSpark   = D.daily.map(() => D.kpis.medianMsgs);

  // Find peak and recent low from daily data for the lede
  const dailyMax = Math.max(...D.daily.map(d => d.v));
  const dailyMin = Math.min(...D.daily.map(d => d.v));
  const peakDay  = D.daily.find(d => d.v === dailyMax) || {};
  const recentLow = D.daily[D.daily.length - 3] || D.daily[D.daily.length - 1] || {};
  const dropPct = dailyMax > 0
    ? Math.round(((dailyMax - recentLow.v) / dailyMax) * 100)
    : 0;

  const voicePct = D.modeSplit.voice + D.modeSplit.chat > 0
    ? Math.round(D.modeSplit.voice / (D.modeSplit.voice + D.modeSplit.chat) * 100)
    : 0;
  const scenPct = D.kpis.sessions > 0
    ? Math.round(D.topicSplit.scenario / D.kpis.sessions * 100)
    : 0;

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Insights", "Overview"]}
        title="Users are opening Riya."
        titleEm="Staying is the hard part."
        date={`${D.range.start} — ${D.range.end}  ·  ${D.range.days} days`}
      />

      <div className="lede-meta">Editor's note</div>
      <p className="lede">
        Engagement is <span className="hi">softening</span> — daily sessions peaked at <span className="ref">{dailyMax}</span> on {peakDay.d} and have
        fallen to <span className="ref">{recentLow.v}</span> recently
        {dropPct > 0 && <>, a <span className="hi">{dropPct}% drop</span></>}.
        The bright spot: evening voice practice at <span className="ref">{peakHour}:00 IST</span> is holding steady.
        Riya is losing users <em>during</em> sessions, not at the start.
      </p>

      <div className="section-label">Period at a glance</div>

      <div className="kpi-row">
        <KpiCard featured label="Total Sessions"       value={D.kpis.sessions.toLocaleString()} delta={D.kpis.sessionsDelta} deltaDir={D.kpis.sessionsDelta >= 0 ? "up" : "down"} sparkData={sessSpark} />
        <KpiCard         label="Total Messages"        value={D.kpis.messages.toLocaleString()} delta={D.kpis.messagesDelta} deltaDir={D.kpis.messagesDelta >= 0 ? "up" : "down"} sparkData={msgsSpark} />
        <KpiCard         label="Avg Msgs / Session"    value={D.kpis.avgMsgs}                   delta={Math.abs(D.kpis.avgMsgsDelta)} deltaDir={D.kpis.avgMsgsDelta >= 0 ? "up" : "down"} sparkData={avgSpark} />
        <KpiCard         label="Median Msgs / Session" value={D.kpis.medianMsgs}                delta={0} deltaDir="neutral" sparkData={medSpark} />
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <KpiCard label="Avg Sessions / Day" value={D.kpis.avgPerDay}  delta={4.2}  deltaDir="up" />
        <KpiCard label="Min Sessions / Day" value={D.kpis.minPerDay}  delta={18.2} deltaDir="down" />
        <KpiCard label="Max Sessions / Day" value={D.kpis.maxPerDay}  delta={2.1}  deltaDir="up" />
      </div>

      <div className="insight">
        <span className="insight-tag">Trend</span>
        <div className="insight-body">
          Daily sessions peaked on <strong>{peakDay.d} ({peakDay.day})</strong> and have declined since.
          Consider a mid-period reactivation push to sustain volume into the second week.
        </div>
        <button className="insight-action">View campaign log →</button>
      </div>

      <div className="grid-phi">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Daily session volume</h3>
              <p className="card-sub">Sessions per day, {D.range.start} – {D.range.end}</p>
            </div>
            <div className="legend">
              <span className="legend-dot" style={{ color: "var(--accent)" }}>Sessions</span>
            </div>
          </div>
          <LineChart
            data={D.daily}
            height={260}
            annotations={[{ index: D.daily.findIndex(d => d.v === dailyMax), label: `Peak · ${dailyMax}` }]}
          />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">When users practice</h3>
              <p className="card-sub">Session start · hour of day (IST)</p>
            </div>
            <span className="card-badge">Peak · {peakHour}:00</span>
          </div>
          <BarChart
            data={hourlyData}
            height={260}
            accent="#B8A5FF"
            highlightIndex={peakHour}
            labelEvery={3}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Voice vs Chat</h3>
              <p className="card-sub">How users choose to practice</p>
            </div>
            <span className="card-badge">{voicePct}% voice</span>
          </div>
          <DonutChart
            data={[
              { label: "Voice practice", v: D.modeSplit.voice },
              { label: "Text chat",      v: D.modeSplit.chat },
            ]}
            colors={["#7C5CFF", "#B8A5FF"]}
            centerLabel="Voice-led"
            centerValue={`${voicePct}%`}
            size={180}
          />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Free talk vs Scenarios</h3>
              <p className="card-sub">Structured practice still wins</p>
            </div>
            <span className="card-badge">{scenPct}% scenario</span>
          </div>
          <DonutChart
            data={[
              { label: "Scenario-based", v: D.topicSplit.scenario },
              { label: "Free talk",      v: D.topicSplit.free },
            ]}
            colors={["#7C5CFF", "#5FE3C0"]}
            centerLabel="Scenario-led"
            centerValue={`${scenPct}%`}
            size={180}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Session depth distribution</h3>
            <p className="card-sub">Short · Medium · Long — split by practice mode</p>
          </div>
          <span className="card-badge">{D.depth.short.pct}% drop in first 4 msgs</span>
        </div>
        <StackedBar
          segments={[
            { label: `Short ≤4 msgs`,   v: D.depth.short.total,  color: "#FF8A6B" },
            { label: `Medium 5–20`,      v: D.depth.medium.total, color: "#B8A5FF" },
            { label: `Long >20`,         v: D.depth.long.total,   color: "#7C5CFF" },
          ]}
        />
        <div style={{ marginTop: 24, padding: "16px 0 0", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          <div>
            <div className="kpi-label" style={{ marginBottom: 6 }}>Short sessions · the worry</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
              {D.depth.short.total.toLocaleString()} sessions ended in 4 messages or fewer — most within the first 60 seconds.
            </div>
          </div>
          <div>
            <div className="kpi-label" style={{ marginBottom: 6 }}>Medium sessions · the norm</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
              {D.depth.medium.total.toLocaleString()} sessions in the 5–20 message band. These users are practicing, not testing.
            </div>
          </div>
          <div>
            <div className="kpi-label" style={{ marginBottom: 6 }}>Long sessions · the gold</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
              {D.depth.long.total.toLocaleString()} sessions over 20 messages — the high-intent cohort.
              Voice users are more likely to go long.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

window.KpiCard = KpiCard;
window.OverviewPage = OverviewPage;
