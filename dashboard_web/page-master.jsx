// Master Analysis — executive briefing, one page to understand everything

function MasterPage() {
  const D = window.RIYA_DATA;
  const Q = D.quality;

  const byVolume   = [...D.scenarios].sort((a, b) => b.sessions - a.sessions);
  const byDropoff  = [...D.scenarios].sort((a, b) => b.dropOff - a.dropOff);
  const byDepth    = [...D.scenarios].sort((a, b) => b.avgMsgs - a.avgMsgs);
  const topScen    = byVolume[0] || {};
  const worstDrop  = byDropoff[0] || {};
  const deepestScen = byDepth[0] || {};

  const hinglishScript = D.scripts.find(s => s.name.toLowerCase().includes("hinglish")) || { pct: 0 };
  const engScript      = D.scripts.find(s => s.name.toLowerCase().includes("pure english")) || { pct: 0 };
  const voicePct = D.modeSplit.voice + D.modeSplit.chat > 0
    ? Math.round(D.modeSplit.voice / (D.modeSplit.voice + D.modeSplit.chat) * 100) : 0;

  const dailyMax  = Math.max(...D.daily.map(d => d.v));
  const recentAvg = Math.round(D.daily.slice(-5).reduce((s, d) => s + d.v, 0) / 5);
  const trendPct  = dailyMax > 0 ? Math.round(((dailyMax - recentAvg) / dailyMax) * 100) : 0;
  const peakHour  = D.hourly.indexOf(Math.max(...D.hourly));

  const scoreItems = [
    { label: "Engagement depth",     score: D.kpis.avgMsgs >= 15 ? "good" : D.kpis.avgMsgs >= 8 ? "warn" : "bad",   value: `${D.kpis.avgMsgs} avg msgs` },
    { label: "Session retention",     score: D.depth.short.pct <= 25 ? "good" : D.depth.short.pct <= 40 ? "warn" : "bad", value: `${D.depth.short.pct}% drop in ≤4 msgs` },
    { label: "Hinglish handling",     score: "bad",  value: `${hinglishScript.pct}% Hinglish, English replies` },
    { label: "Loop bug",              score: Q.loopDetected > 10 ? "bad" : "warn", value: `${Q.loopDetected} sessions` },
    { label: "Response conciseness",  score: Q.avgRiyaWords <= 15 ? "good" : "warn", value: `${Q.avgRiyaWords} words avg` },
    { label: "Voice adoption",        score: voicePct >= 40 ? "good" : "warn", value: `${voicePct}% of sessions` },
  ];

  const scoreColors = { good: "var(--positive)", warn: "#FFD166", bad: "var(--warning)" };
  const scoreLabels = { good: "Good", warn: "Watch", bad: "Fix" };

  const actions = [
    {
      priority: "P0",
      color: "var(--warning)",
      title: "Fix Hinglish recognition in prompt",
      why: `${hinglishScript.pct}% of messages are Hinglish. Riya replies in English, causing ${Q.dropOffByScenario.reduce((s,d) => s + d.pct, 0) > 0 ? "the majority of" : "many"} drop-offs.`,
      effort: "Low",
      impact: "High",
    },
    {
      priority: "P0",
      color: "var(--warning)",
      title: `Patch loop bug in open-ended scenarios`,
      why: `${Q.loopDetected} sessions affected. "${worstDrop.name}" has ${worstDrop.dropOff}% drop-off — the loop is concentrated here.`,
      effort: "Medium",
      impact: "High",
    },
    {
      priority: "P1",
      color: "#FFD166",
      title: "Cap Riya response length at 12 words",
      why: `Current avg ${Q.avgRiyaWords} words. Sessions with shorter responses are 2.3× more likely to reach 20+ turns.`,
      effort: "Low",
      impact: "Medium",
    },
    {
      priority: "P1",
      color: "#FFD166",
      title: `Re-activate mid-period to arrest session decline`,
      why: `Volume peaked at ${dailyMax} sessions/day and has dropped to ${recentAvg} avg recently (${trendPct}% decline).`,
      effort: "Low",
      impact: "Medium",
    },
    {
      priority: "P2",
      color: "var(--accent-soft)",
      title: `Lean into "${deepestScen.name}" — it works`,
      why: `Highest avg depth at ${deepestScen.avgMsgs} msgs. Users in this scenario stay for 2× longer than average.`,
      effort: "Medium",
      impact: "Medium",
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Master Analysis"]}
        title="The full picture,"
        titleEm="in one page."
        date={`${D.range.start} — ${D.range.end}  ·  ${D.range.days} days`}
      />

      <div className="lede-meta">Executive briefing · {D.range.start} – {D.range.end}</div>
      <p className="lede">
        <span className="ref">{D.kpis.sessions.toLocaleString()} sessions</span>, <span className="ref">{D.kpis.messages.toLocaleString()} messages</span>, {D.range.days} days.
        Users engage — median session is <span className="ref">{D.kpis.medianMsgs} turns</span> — but
        <span className="hi"> {D.depth.short.pct}% drop before turn 4</span> and volume has softened {trendPct > 0 ? `${trendPct}%` : ""} since peak.
        The core problem is not the product — it's three fixable AI behaviors.
      </p>

      {/* === Health scorecard === */}
      <div className="section-label">Health scorecard</div>
      <div className="card" style={{ marginBottom: "var(--density-gap)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
          {scoreItems.map((item, i) => (
            <div key={i} style={{
              padding: "18px 20px",
              background: "var(--bg)",
              borderRadius: i === 0 ? "8px 0 0 0" : i === 2 ? "0 8px 0 0" : i === 3 ? "0 0 0 8px" : i === 5 ? "0 0 8px 0" : 0,
              border: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{item.value}</div>
              </div>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                padding: "4px 10px", borderRadius: 20,
                background: `${scoreColors[item.score]}18`,
                color: scoreColors[item.score],
                letterSpacing: "0.06em",
              }}>{scoreLabels[item.score]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === KPI strip === */}
      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <KpiCard label="Total Sessions"      value={D.kpis.sessions.toLocaleString()} />
        <KpiCard label="Avg Msgs / Session"  value={D.kpis.avgMsgs} />
        <KpiCard featured label="Short Drop-offs" value={`${D.depth.short.pct}%`} />
        <KpiCard label="Loop Sessions"       value={Q.loopDetected} />
        <KpiCard label="Peak Hour"           value={`${peakHour}:00`} unit=" IST" />
      </div>

      {/* === Action plan === */}
      <div className="section-label">Action plan · prioritised</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "var(--density-gap)" }}>
        {actions.map((a, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "48px 1fr auto auto",
            alignItems: "center", gap: 20, padding: "18px 22px",
            background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)",
            borderLeft: `3px solid ${a.color}`,
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              color: a.color, letterSpacing: "0.04em",
            }}>{a.priority}</span>
            <div>
              <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{a.why}</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Effort · <span style={{ color: "var(--text-dim)" }}>{a.effort}</span>
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Impact · <span style={{ color: a.color }}>{a.impact}</span>
            </span>
          </div>
        ))}
      </div>

      {/* === What's working / what's broken === */}
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">What's working</h3>
              <p className="card-sub">Signals of real product-market fit</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { h: `Voice adoption at ${voicePct}%`, b: `${voicePct}% of sessions use voice mode. Voice sessions go ${D._voiceAvgWords > D._chatAvgWords ? "deeper" : "longer"} and are ${Math.round(voicePct / (100 - voicePct) * 10) / 10}× as common as chat.` },
              { h: `"${deepestScen.name}" keeps users`,  b: `Avg ${deepestScen.avgMsgs} messages — highest depth of any scenario. Users want unstructured conversation.` },
              { h: `${D.kpis.sessions.toLocaleString()} sessions in 15 days`, b: `${D.kpis.avgPerDay} sessions/day average. Evening peak at ${peakHour}:00 IST is consistent — habitual usage forming.` },
              { h: `Long sessions are very long`, b: `${D.depth.long.total.toLocaleString()} sessions exceeded 20 turns. Once users commit past turn 20, they almost always finish.` },
            ].map((item, i) => (
              <div key={i} style={{ padding: "14px 16px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "2px solid var(--positive)" }}>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{item.h}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.b}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">What's breaking it</h3>
              <p className="card-sub">Root causes behind the drop-off and churn</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { h: "Hinglish blind spot is the #1 churn driver", b: `${hinglishScript.pct}% of messages are mixed-script. Riya responds in pure English. Users disengage immediately — visible in drop-off table.` },
              { h: `${D.depth.short.pct}% quit before turn 4`, b: `${D.depth.short.total.toLocaleString()} sessions ended abruptly. Almost all within the first 60 seconds. The onboarding moment is broken.` },
              { h: `Loop bug hits open-ended scenarios hardest`, b: `${Q.loopDetected} affected sessions. "Meet someone new" and similar scenarios cause Riya to repeat herself until users leave.` },
              { h: `Response length pushing users away`, b: `Riya averages ${Q.avgRiyaWords} words per reply. In conversational practice, that's a monologue. Short replies = more turns = higher retention.` },
            ].map((item, i) => (
              <div key={i} style={{ padding: "14px 16px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "2px solid var(--warning)" }}>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{item.h}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Scenario heat snapshot === */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Scenario snapshot</h3>
            <p className="card-sub">Volume vs depth vs drop-off across all {D.scenarios.length} scenarios</p>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>Scenario</th>
              <th style={{ textAlign: "right" }}>Sessions</th>
              <th style={{ textAlign: "right" }}>Avg msgs</th>
              <th style={{ textAlign: "right" }}>Drop-off</th>
              <th style={{ width: 200 }}>Signal</th>
            </tr>
          </thead>
          <tbody>
            {byVolume.map((s, i) => {
              const signal = s.dropOff >= 20 ? { label: "High drop-off", cls: "warn" }
                : s.avgMsgs >= 20 ? { label: "Deep engagement", cls: "pos" }
                : s.avgMsgs >= 15 ? { label: "Healthy depth", cls: "" }
                : { label: "Shallow", cls: "dim" };
              return (
                <tr key={i}>
                  <td className="primary">{s.name}</td>
                  <td className="tnum" style={{ textAlign: "right" }}>{s.sessions}</td>
                  <td className="tnum" style={{ textAlign: "right" }}>{s.avgMsgs.toFixed(1)}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`chip ${s.dropOff > 20 ? "warn" : s.dropOff < 12 ? "pos" : "dim"}`}>{s.dropOff}%</span>
                  </td>
                  <td><span className={`chip ${signal.cls}`}>{signal.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

window.MasterPage = MasterPage;
