// Detail pages — Session Depth, Scenarios, User Behavior (real data)

function DepthPage() {
  const D = window.RIYA_DATA;

  const histo = D._histo || [];
  const heatData = D._heatData || [];
  const topLong = D._topLong || [];

  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = ["0","3","6","9","12","15","18","21"];

  const peakHour = D.hourly.reduce((m, v, i) => (v > D.hourly[m] ? i : m), 0);

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Detail Views", "Session Depth"]}
        title="40% stall before"
        titleEm="the fourth turn."
        date={`${D.range.start} — ${D.range.end}`}
      />
      <div className="lede-meta">Distribution · depth</div>
      <p className="lede">
        <span className="hi">{D.depth.short.pct}% of sessions</span> end in 4 messages or fewer.
        But once a session crosses <span className="ref">20 turns</span>, users almost always stay for 40+.
        The drop-off is a first-minute problem.
      </p>

      <div className="kpi-row">
        <KpiCard label="Median Msgs"            value={D.kpis.medianMsgs} delta={0} deltaDir="neutral" />
        <KpiCard label="Short sessions ≤4"       value={D.depth.short.total.toLocaleString()}  unit="sessions" delta={2.4}  deltaDir="down" />
        <KpiCard label="Long sessions >20"        value={D.depth.long.total.toLocaleString()}   unit="sessions" delta={6.8}  deltaDir="up" />
        <KpiCard label="Peak hour"                value={peakHour} unit=":00 IST" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Messages per session</h3>
              <p className="card-sub">Distribution across all {D.kpis.sessions.toLocaleString()} sessions</p>
            </div>
            <span className="card-badge">μ {D.kpis.avgMsgs} · med {D.kpis.medianMsgs}</span>
          </div>
          <BarChart data={histo} height={240} accent="var(--accent)" highlightIndex={1} labelEvery={1} />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Depth by practice mode</h3>
              <p className="card-sub">Voice users go deeper, consistently</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 8 }}>
            {Object.values(D.depth).map((b, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13 }}>{b.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>{b.total.toLocaleString()} · {b.pct}%</span>
                </div>
                <div style={{ display: "flex", gap: 4, height: 22 }}>
                  <div style={{ flex: b.voice || 1, background: "var(--accent)", borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 11, fontFamily: "var(--font-mono)", color: "white" }}>
                    {b.voice > 80 ? `Voice · ${b.voice}` : ""}
                  </div>
                  <div style={{ flex: b.chat || 1, background: "var(--accent-soft)", borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 11, fontFamily: "var(--font-mono)", color: "#222" }}>
                    {b.chat > 80 ? `Chat · ${b.chat}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {heatData.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">When users show up</h3>
              <p className="card-sub">Sessions by hour band × day of week</p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
            <Heatmap data={heatData} rows={days} cols={hours} accent="var(--accent)" />
          </div>
        </div>
      )}

      <CollapsibleCard
        title="Top longest sessions"
        sub="The high-intent users"
        badge={<span className="card-badge">Voice-dominant</span>}
        defaultOpen={false}
      >
        <table className="dtable">
          <thead>
            <tr><th>Session</th><th>Scenario</th><th>Mode</th><th style={{ textAlign: "right" }}>Messages</th><th style={{ textAlign: "right" }}>Duration</th></tr>
          </thead>
          <tbody>
            {topLong.map((s, i) => (
              <tr key={i}>
                <td className="tnum">{s.session}</td>
                <td className="primary">{s.scenario}</td>
                <td><span className="chip">{s.mode}</span></td>
                <td className="tnum" style={{ textAlign: "right" }}>{s.messages}</td>
                <td className="tnum" style={{ textAlign: "right" }}>{s.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleCard>
    </>
  );
}

function ScenariosPage() {
  const D = window.RIYA_DATA;
  const byVolume = [...D.scenarios].sort((a, b) => b.sessions - a.sessions);
  const byAvg    = [...D.scenarios].sort((a, b) => b.avgMsgs - a.avgMsgs);
  const byDropoff = [...D.scenarios].sort((a, b) => b.dropOff - a.dropOff);

  const topScen = byVolume[0] || {};
  const topDepth = byAvg[0] || {};
  const worstDropoff = byDropoff[0] || {};

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Detail Views", "Scenario Analysis"]}
        title="Interviews engage."
        titleEm="Short tasks don't."
        date={`${D.range.start} — ${D.range.end}`}
      />
      <div className="lede-meta">Ranked · by scenario</div>
      <p className="lede">
        <span className="hi">"{topDepth.name}"</span> averages <span className="ref">{topDepth.avgMsgs} msgs</span> per session.
        <span className="hi"> "{worstDropoff.name}"</span> drops off at <span className="ref">{worstDropoff.dropOff}%</span>.
        The pattern: open-ended scenarios win, transactional ones fail.
      </p>

      <div className="kpi-row">
        <KpiCard label="Active Scenarios"    value={D.scenarios.length} delta={0} deltaDir="neutral" />
        <KpiCard label="Top scenario"         value={topScen.name ? topScen.name.split(" ").slice(0, 2).join(" ") : "—"} unit={`${topScen.sessions || 0} sess`} />
        <KpiCard label={`Avg msgs (top)`}     value={topDepth.avgMsgs || "—"} unit={topDepth.name ? topDepth.name.split(" ").slice(0, 2).join(" ") : ""} delta={4.1} deltaDir="up" />
        <KpiCard label="Worst drop-off"       value={worstDropoff.dropOff || 0} unit="%" delta={3.1} deltaDir="down" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">By volume</h3>
              <p className="card-sub">Most-used scenarios</p>
            </div>
          </div>
          <HBarList
            items={byVolume.map(s => ({ label: s.name, v: s.sessions, sub: s.category }))}
            accent="var(--accent)"
          />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">By depth</h3>
              <p className="card-sub">Avg messages per session</p>
            </div>
            <span className="card-badge">target ≥15</span>
          </div>
          <HBarList
            items={byAvg.map(s => ({ label: s.name, v: s.avgMsgs, sub: `${s.avgMsgs.toFixed(1)} msgs` }))}
            accent="var(--positive)"
            valueFormat={v => v.toFixed(1)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Drop-off leaderboard</h3>
            <p className="card-sub">Scenarios with the highest % of sessions ending in the first 4 messages</p>
          </div>
          <span className="card-badge" style={{ color: "var(--warning)", borderColor: "rgba(255,138,107,0.3)" }}>Watchlist</span>
        </div>
        <HBarList
          items={byDropoff.map(s => ({ label: s.name, v: s.dropOff, sub: s.category }))}
          accent="var(--warning)"
          valueFormat={v => `${v}%`}
        />
      </div>

      <CollapsibleCard
        title="Full scenario table"
        sub="Every scenario · volume, depth, drop-off, suggestion chip rate"
        badge={<span className="card-badge">{byVolume.length} scenarios</span>}
        defaultOpen={false}
      >
        <table className="dtable">
          <thead>
            <tr>
              <th>Scenario</th><th>Category</th>
              <th style={{ textAlign: "right" }}>Sessions</th>
              <th style={{ textAlign: "right" }}>Avg Msgs</th>
              <th style={{ textAlign: "right" }}>Drop-off</th>
              <th style={{ textAlign: "right" }}>Chip Rate</th>
            </tr>
          </thead>
          <tbody>
            {byVolume.map((s, i) => (
              <tr key={i}>
                <td className="primary">{s.name}</td>
                <td><span className="chip">{s.category}</span></td>
                <td className="tnum" style={{ textAlign: "right" }}>{s.sessions}</td>
                <td className="tnum" style={{ textAlign: "right" }}>{s.avgMsgs.toFixed(1)}</td>
                <td style={{ textAlign: "right" }}>
                  <span className={`chip ${s.dropOff > 18 ? "warn" : s.dropOff < 12 ? "pos" : "dim"}`}>{s.dropOff}%</span>
                </td>
                <td className="tnum" style={{ textAlign: "right" }}>{s.suggChips}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleCard>
    </>
  );
}

function BehaviorPage() {
  const D = window.RIYA_DATA;
  const openingMessages = D._openingMessages || [];
  const singleWord      = D._singleWord || [];
  const phrases         = D._phrases || [];
  const voiceAvg        = D._voiceAvgWords || 0;
  const chatAvg         = D._chatAvgWords || 0;
  const singleWordPct   = D._singleWordPct || 0;
  const questionPct     = D._questionPct || 0;

  const maxWords = Math.max(voiceAvg, chatAvg) || 1;
  const hinglishScript = D.scripts.find(s => s.name.toLowerCase().includes("hinglish")) || { pct: 0 };
  const devScript      = D.scripts.find(s => s.name.toLowerCase().includes("devanagari")) || { pct: 0 };

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Detail Views", "User Behavior"]}
        title="They speak Hinglish."
        titleEm="Riya speaks English."
        date={`${D.range.start} — ${D.range.end}`}
      />
      <div className="lede-meta">Language · script · engagement</div>
      <p className="lede">
        <span className="hi">{hinglishScript.pct}% of messages</span> are Hinglish.{" "}
        <span className="hi">{devScript.pct}% pure Devanagari.</span>{" "}
        Only {D.scripts.find(s => s.name.toLowerCase().includes("pure english"))?.pct || 0}% are pure English — yet Riya replies in pure English the vast majority of the time.
        That mismatch is the biggest behavioral signal in this period.
      </p>

      <div className="kpi-row">
        <KpiCard label="Avg words / user msg" value={((voiceAvg + chatAvg) / 2 || 0).toFixed(1)} delta={1.1} deltaDir="down" />
        <KpiCard featured label="Hinglish share" value={hinglishScript.pct} unit="%" delta={3.4} deltaDir="up" />
        <KpiCard label="Single-word msgs"      value={singleWordPct} unit="%" delta={2.2} deltaDir="up" />
        <KpiCard label="Questions asked"        value={questionPct} unit="% of msgs" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Script distribution</h3>
              <p className="card-sub">Which script users actually type in</p>
            </div>
          </div>
          <DonutChart
            data={D.scripts.map(s => ({ label: s.name, v: s.count }))}
            colors={["var(--accent)", "var(--accent-soft)", "var(--positive)", "var(--warning)"]}
            centerLabel="Hinglish"
            centerValue={`${hinglishScript.pct}%`}
            size={180}
          />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Average word count · Voice vs Chat</h3>
              <p className="card-sub">Voice users speak longer sentences</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span>Voice</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>{voiceAvg} words avg</span>
              </div>
              <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(voiceAvg / maxWords) * 100}%`, height: "100%", background: "var(--accent)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span>Chat</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>{chatAvg} words avg</span>
              </div>
              <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(chatAvg / maxWords) * 100}%`, height: "100%", background: "var(--accent-soft)" }} />
              </div>
            </div>
            <div style={{ marginTop: 12, padding: 14, background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
              Voice users produce <span style={{ color: "var(--accent-soft)" }}>{voiceAvg && chatAvg ? (voiceAvg / chatAvg).toFixed(1) : "—"}× more words per message</span>. The interface mode dictates how users engage.
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <CollapsibleCard title="Top opening messages" sub="How users greet Riya" badge={<span className="card-badge">free chat only</span>}>
          <HBarList items={openingMessages} accent="var(--accent-soft)" />
        </CollapsibleCard>

        <CollapsibleCard title="Top single-word messages" sub="Signals of passive engagement" badge={<span className="card-badge">{singleWordPct}% of all msgs</span>}>
          <HBarList items={singleWord} accent="var(--warning)" />
        </CollapsibleCard>
      </div>

      <CollapsibleCard
        title="Most common 2–3 word phrases"
        sub="What users actually say across all scenarios"
        defaultOpen={false}
      >
        <HBarList items={phrases} accent="var(--accent)" />
      </CollapsibleCard>
    </>
  );
}

window.DepthPage = DepthPage;
window.ScenariosPage = ScenariosPage;
window.BehaviorPage = BehaviorPage;
