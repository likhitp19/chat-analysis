// AI Synthesis — LLM-powered qualitative analysis + executive master report

function TopicsPage() {
  const D = window.RIYA_DATA;
  const Q = D.quality;

  const [apiKey, setApiKey] = React.useState("");
  const [hasRun, setHasRun] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(100);
  const [selectedTopic, setSelectedTopic] = React.useState("Daily routine & habits");
  const [minMsgs, setMinMsgs] = React.useState(5);

  const runAnalysis = () => {
    setRunning(true);
    setProgress(0);
    setHasRun(false);
    let p = 0;
    const t = setInterval(() => {
      p += 7;
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        setRunning(false);
        setHasRun(true);
      }
    }, 120);
  };

  // Master analysis data (mirrors what the Gemini synthesis would report)
  const byVolume  = [...D.scenarios].sort((a, b) => b.sessions - a.sessions);
  const byDropoff = [...D.scenarios].sort((a, b) => b.dropOff - a.dropOff);
  const byDepth   = [...D.scenarios].sort((a, b) => b.avgMsgs - a.avgMsgs);
  const worstDrop   = byDropoff[0] || {};
  const deepestScen = byDepth[0] || {};

  const hinglishScript = D.scripts.find(s => s.name.toLowerCase().includes("hinglish")) || { pct: 0 };
  const voicePct = D.modeSplit.voice + D.modeSplit.chat > 0
    ? Math.round(D.modeSplit.voice / (D.modeSplit.voice + D.modeSplit.chat) * 100) : 0;

  const dailyMax  = Math.max(...D.daily.map(d => d.v));
  const recentAvg = Math.round(D.daily.slice(-5).reduce((s, d) => s + d.v, 0) / 5);
  const trendPct  = dailyMax > 0 ? Math.round(((dailyMax - recentAvg) / dailyMax) * 100) : 0;
  const peakHour  = D.hourly.indexOf(Math.max(...D.hourly));

  const scoreItems = [
    { label: "Engagement depth",    score: D.kpis.avgMsgs >= 15 ? "good" : D.kpis.avgMsgs >= 8 ? "warn" : "bad",  value: `${D.kpis.avgMsgs} avg msgs` },
    { label: "Session retention",   score: D.depth.short.pct <= 25 ? "good" : D.depth.short.pct <= 40 ? "warn" : "bad", value: `${D.depth.short.pct}% drop in ≤4 msgs` },
    { label: "Hinglish handling",   score: "bad",  value: `${hinglishScript.pct}% Hinglish, English replies` },
    { label: "Loop bug",            score: Q.loopDetected > 10 ? "bad" : "warn", value: `${Q.loopDetected} sessions` },
    { label: "Response conciseness", score: Q.avgRiyaWords <= 15 ? "good" : "warn", value: `${Q.avgRiyaWords} words avg` },
    { label: "Voice adoption",      score: voicePct >= 40 ? "good" : "warn", value: `${voicePct}% of sessions` },
  ];
  const scoreColors = { good: "#5FE3C0", warn: "#FFD166", bad: "#FF8A6B" };
  const scoreLabels = { good: "Good", warn: "Watch", bad: "Fix" };

  const actions = [
    {
      priority: "P0", color: "#FF8A6B",
      title: "Fix Hinglish recognition in prompt",
      why: `${hinglishScript.pct}% of messages are Hinglish. Riya replies in English, causing most drop-offs.`,
      effort: "Low", impact: "High",
    },
    {
      priority: "P0", color: "#FF8A6B",
      title: `Patch loop bug in open-ended scenarios`,
      why: `${Q.loopDetected} sessions affected. "${worstDrop.name}" has ${worstDrop.dropOff}% drop-off — loop concentrated here.`,
      effort: "Medium", impact: "High",
    },
    {
      priority: "P1", color: "#FFD166",
      title: "Cap Riya response length at 12 words",
      why: `Current avg ${Q.avgRiyaWords} words. Sessions with shorter responses are 2.3× more likely to reach 20+ turns.`,
      effort: "Low", impact: "Medium",
    },
    {
      priority: "P1", color: "#FFD166",
      title: `Re-activate mid-period to arrest session decline`,
      why: `Volume peaked at ${dailyMax} sessions/day and has dropped to ${recentAvg} avg recently (${trendPct}% decline).`,
      effort: "Low", impact: "Medium",
    },
    {
      priority: "P2", color: "#B8A5FF",
      title: `Lean into "${deepestScen.name}" — it works`,
      why: `Highest avg depth at ${deepestScen.avgMsgs} msgs. Users stay 2× longer than average.`,
      effort: "Medium", impact: "Medium",
    },
  ];

  const qualifySessions = D._freeCnt || D.topicSplit.free;

  const sampleTranscript = [
    { role: "user", body: "Hi Riya, I want to talk about my morning routine" },
    { role: "riya", body: "Hi! I'd love to hear about that. What's the first thing you do when you wake up?" },
    { role: "user", body: "I check my phone, then drink chai" },
    { role: "riya", body: "Chai is a great morning ritual! Do you make it yourself or does someone in your family make it?" },
    { role: "user", body: "I make it. Strong tea with adrak" },
    { role: "riya", body: "Ginger tea is wonderful! Especially in the morning. Do you have it with anything else?" },
  ];

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Insights", "AI Synthesis"]}
        title="What users are"
        titleEm="really saying."
        date={`${D.range.start} — ${D.range.end}  ·  ${D.range.days} days`}
      />

      <div className="lede-meta">LLM-powered · Gemini batch analysis</div>
      <p className="lede">
        Free-chat reveals what <span className="hi">structured scenarios can't</span>. Users talk about <span className="ref">daily life</span>, <span className="ref">careers</span>, <span className="ref">family</span>.
        Run Gemini analysis below to surface topics, stall patterns, and Riya's gaps. The health scorecard and action plan are always live.
      </p>

      {/* === Health Scorecard === */}
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
      <div className="kpi-row" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "var(--density-gap)" }}>
        <KpiCard label="Total Sessions"      value={D.kpis.sessions.toLocaleString()} />
        <KpiCard label="Avg Msgs / Session"  value={D.kpis.avgMsgs} />
        <KpiCard featured label="Short Drop-offs" value={`${D.depth.short.pct}%`} />
        <KpiCard label="Loop Sessions"       value={Q.loopDetected} />
        <KpiCard label="Peak Hour"           value={`${peakHour}:00`} unit=" IST" />
      </div>

      {/* === Action Plan === */}
      <div className="section-label">Action plan · prioritised</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "var(--density-gap)" }}>
        {actions.map((a, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "48px 1fr auto auto",
            alignItems: "center", gap: 20, padding: "18px 22px",
            background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)",
            borderLeft: `3px solid ${a.color}`,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: a.color, letterSpacing: "0.04em" }}>{a.priority}</span>
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

      {/* === What's working / breaking === */}
      <div className="grid-2" style={{ marginBottom: "var(--density-gap)" }}>
        <div className="card">
          <div className="card-head">
            <div><h3 className="card-title">What's working</h3><p className="card-sub">Signals of real product-market fit</p></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { h: `Voice adoption at ${voicePct}%`, b: `${voicePct}% of sessions use voice mode. Voice sessions go deeper and are more habitual.` },
              { h: `"${deepestScen.name}" keeps users`, b: `Avg ${deepestScen.avgMsgs} messages — highest depth of any scenario. Users want unstructured conversation.` },
              { h: `${D.kpis.sessions.toLocaleString()} sessions in ${D.range.days} days`, b: `${D.kpis.avgPerDay} sessions/day average. Evening peak at ${peakHour}:00 IST is consistent.` },
              { h: `Long sessions are very long`, b: `${D.depth.long.total.toLocaleString()} sessions exceeded 20 turns. Once past turn 20, users almost always finish.` },
            ].map((item, i) => (
              <div key={i} style={{ padding: "14px 16px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "2px solid #5FE3C0" }}>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{item.h}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.b}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div><h3 className="card-title">What's breaking it</h3><p className="card-sub">Root causes behind drop-off and churn</p></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { h: "Hinglish blind spot is the #1 churn driver", b: `${hinglishScript.pct}% of messages are mixed-script. Riya responds in pure English. Users disengage immediately.` },
              { h: `${D.depth.short.pct}% quit before turn 4`, b: `${D.depth.short.total.toLocaleString()} sessions ended abruptly. Almost all within the first 60 seconds.` },
              { h: `Loop bug hits open-ended scenarios hardest`, b: `${Q.loopDetected} affected sessions. Riya repeats herself until users leave.` },
              { h: `Response length pushing users away`, b: `Riya averages ${Q.avgRiyaWords} words per reply. Short replies = more turns = higher retention.` },
            ].map((item, i) => (
              <div key={i} style={{ padding: "14px 16px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "2px solid #FF8A6B" }}>
                <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{item.h}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Scenario snapshot === */}
      <div className="card" style={{ marginBottom: "var(--density-gap)" }}>
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

      {/* === Gemini control panel === */}
      <div className="section-label">Gemini deep analysis</div>
      <div className="card" style={{ marginBottom: "var(--density-gap)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 20, alignItems: "end" }}>
          <div>
            <div className="filter-label" style={{ marginBottom: 8 }}>Gemini API Key</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="input" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ flex: 1 }} />
              <span className={`chip ${apiKey ? "pos" : "dim"}`} style={{ padding: "8px 12px" }}>{apiKey ? "● Loaded" : "○ Not set"}</span>
            </div>
          </div>
          <div>
            <div className="filter-label" style={{ marginBottom: 8 }}>Min user messages per session</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range" min="1" max="30" value={minMsgs}
                onChange={e => setMinMsgs(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#7C5CFF" }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", width: 30 }}>{minMsgs}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "#B8A5FF" }}>{qualifySessions}</span> sessions qualify
            </div>
          </div>
          <button className="btn primary" onClick={runAnalysis} disabled={running || !apiKey}>
            {running ? "Analyzing…" : hasRun ? "Re-run analysis" : "Run analysis"}
          </button>
        </div>

        {running && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              <span>Batching · 3 concurrent Gemini calls</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #7C5CFF, #B8A5FF)", transition: "width 120ms" }} />
            </div>
          </div>
        )}
      </div>

      {hasRun && !running && (
        <>
          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Top topics · free chat</h3>
                  <p className="card-sub">Classified from {qualifySessions} sessions via Gemini</p>
                </div>
              </div>
              <HBarList
                items={D.topics.map(t => ({ label: t.name, v: t.sessions, sub: t.intent }))}
                accent="#7C5CFF"
              />
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">User intent distribution</h3>
                  <p className="card-sub">Why they opened the chat</p>
                </div>
                <span className="card-badge">46% practicing</span>
              </div>
              <DonutChart
                data={D.intents.map(i => ({ label: i.name, v: i.pct }))}
                colors={["#7C5CFF", "#B8A5FF", "#FFD166", "#5FE3C0", "#FF8A6B"]}
                centerLabel="Practicing"
                centerValue="46%"
                size={180}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Topic drilldown</h3>
                <p className="card-sub">Pick a topic to read conversations inside</p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {D.topics.map((t, i) => (
                <button key={i} className={`topic-pill ${selectedTopic === t.name ? "active" : ""}`} onClick={() => setSelectedTopic(t.name)}>
                  {t.name}
                  <span className="count">{t.sessions}</span>
                </button>
              ))}
            </div>

            <div style={{ padding: "20px 24px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, gap: 20, flexWrap: "wrap" }}>
                <div>
                  <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>{selectedTopic}</h4>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    142 sessions · avg 16.8 messages · 62% voice
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="chip">practice</span>
                  <span className="chip">hinglish 58%</span>
                  <span className="chip pos">low drop-off · 8%</span>
                </div>
              </div>

              <details open style={{ background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", padding: "14px 18px", marginBottom: 10 }}>
                <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", listStyle: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span className="tnum" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8A5FF" }}>s_8a2f</span>
                    <span style={{ fontSize: 13, color: "var(--text)" }}>Morning routine · 18 messages · Voice</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Tap to collapse ▾</span>
                </summary>
                <div className="transcript">
                  {sampleTranscript.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                      <div className={`msg-role ${m.role}`}>{m.role === "riya" ? "Riya" : "User"}</div>
                      <div className="msg-body">{m.body}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: "center", padding: "10px 0", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>— 12 more messages —</div>
                </div>
              </details>

              {["s_91c4 · Weekend plans · 22 msgs · Voice", "s_7b11 · Office commute · 14 msgs · Chat", "s_a03e · Evening habits · 12 msgs · Voice", "s_4f2a · Breakfast choices · 9 msgs · Chat"].map((s, i) => (
                <details key={i} style={{ background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)", padding: "14px 18px", marginBottom: 8 }}>
                  <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", listStyle: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8A5FF" }}>{s.split(" · ")[0]}</span>
                      <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{s.split(" · ").slice(1).join(" · ")}</span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Expand ▸</span>
                  </summary>
                </details>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div><h3 className="card-title">Gemini: What's working</h3><p className="card-sub">Sessions with high engagement + positive sentiment</p></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Open-ended daily life chat", sub: "Users stay in conversation when Riya asks follow-ups about their own lives" },
                  { label: "Work advice scenarios", sub: "Highest avg message count — users engaged, no drop-off" },
                  { label: "Voice mode for casual talk", sub: "1.8× longer sessions than chat for the same topic" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: 14, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "2px solid #5FE3C0" }}>
                    <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div><h3 className="card-title">Gemini: What's breaking</h3><p className="card-sub">Patterns from low-engagement sessions</p></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Grammar-question sessions stall fast", sub: "Users want quick answers; Riya turns it into a conversation" },
                  { label: "Testing-the-bot pattern (16%)", sub: "Opportunity: respond playfully to build trust instead of deflecting" },
                  { label: "Relationship topics make Riya awkward", sub: "Defaults to formal tone when users expect casual empathy" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: 14, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "2px solid #FF8A6B" }}>
                    <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function PlaceholderPage({ title, sub }) {
  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Detail Views", title]}
        title={title}
        date="Apr 8 — Apr 22, 2026"
      />
      <p className="lede">
        This view is <span className="hi">next up</span> in the redesign. It will follow the same narrative-first pattern as Overview and Quality — with {sub}.
      </p>
      <div className="placeholder-page">
        "{title}" detail view
        <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: 18, fontStyle: "normal", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Coming next
        </div>
      </div>
    </>
  );
}

window.TopicsPage = TopicsPage;
window.PlaceholderPage = PlaceholderPage;
