// Conversation Quality — AI tutor performance diagnostics
// Story: Riya's problems cluster around (1) loops, (2) over-long responses, (3) not handling Hinglish code-switching

function QualityPage() {
  const D = window.RIYA_DATA;
  const Q = D.quality;

  const scenarioMsgs = D.scenarios.slice(0, 8).map(s => ({
    label: s.name,
    sub: s.category,
    v: s.avgMsgs,
  })).sort((a, b) => b.v - a.v);

  const dropOff = Q.dropOffByScenario.map(d => ({ label: d.name, v: d.pct, sub: `${d.pct}% drop-off` }));

  return (
    <>
      <PageHeader
        crumbs={["Riya Analytics", "Insights", "Conversation Quality"]}
        title="Where Riya is"
        titleEm="losing them."
        date={`${D.range.start} — ${D.range.end}`}
      />

      <div className="lede-meta">AI Performance · Diagnostic</div>
      <p className="lede">
        Riya's biggest failure mode isn't hallucination — it's <span className="hi">rigidity</span>.
        She loops when confused <span className="ref">{Q.loopDetected}×</span>, defaults to English when users code-switch into Hindi,
        and sends responses that users never engage with.
        Three fixes would close most of the gap.
      </p>

      <div className="section-label">Failure signals</div>

      <div className="kpi-row">
        <KpiCard label="Avg Riya Msg Length"        value={Q.avgRiyaWords}  unit="words"    delta={8.2}   deltaDir="down" />
        <KpiCard label="Suggestion Chip Rate"        value={Q.suggChipsRate} unit="%"        delta={2.1}   deltaDir="up" />
        <KpiCard featured label="Loop Bugs Detected" value={Q.loopDetected} unit="sessions" delta={14.0}  deltaDir="down" />
        <KpiCard label="Abrupt Drop-offs"            value={Q.abruptDropOff} unit="sessions" delta={3.1}  deltaDir="down" />
      </div>

      {/* === The three fixes === */}
      <div className="insight">
        <span className="insight-tag">Top Fix #1</span>
        <div className="insight-body">
          <strong>Riya ignores Hindi filler words</strong> like "haan", "acha", "theek hai" — 72 sessions stalled because she waited for English input that never came.
        </div>
        <button className="insight-action">Prompt change →</button>
      </div>

      <div className="insight" style={{ background: "linear-gradient(180deg, rgba(255,138,107,0.08), rgba(255,138,107,0.02))", borderColor: "rgba(255,138,107,0.2)" }}>
        <span className="insight-tag" style={{ background: "rgba(255,138,107,0.15)", color: "var(--warning)" }}>Top Fix #2</span>
        <div className="insight-body">
          <strong style={{ color: "var(--warning)" }}>The loop bug</strong> is concentrated in open-ended scenarios — "Meet someone new" alone accounts for 4 of the 12 most recent loop sessions.
        </div>
        <button className="insight-action">Open bug ticket →</button>
      </div>

      <div className="insight" style={{ background: "linear-gradient(180deg, rgba(95,227,192,0.06), rgba(95,227,192,0.02))", borderColor: "rgba(95,227,192,0.2)" }}>
        <span className="insight-tag" style={{ background: "rgba(95,227,192,0.15)", color: "var(--positive)" }}>Top Fix #3</span>
        <div className="insight-body">
          <strong style={{ color: "var(--positive)" }}>Shorter Riya responses = deeper sessions.</strong> When her avg message is under 12 words, sessions are 2.3× more likely to reach 20+ turns.
        </div>
        <button className="insight-action">See length data →</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Avg Riya message length by scenario</h3>
              <p className="card-sub">Target: keep it under 15 words</p>
            </div>
            <span className="card-badge">Target · ≤15 w</span>
          </div>
          <HBarList
            items={scenarioMsgs.map(s => ({
              ...s,
              v: s.v,
              sub: `${s.v.toFixed(1)} words avg`,
            }))}
            accent="var(--accent-soft)"
            valueFormat={v => v.toFixed(1)}
          />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Drop-off rate by scenario</h3>
              <p className="card-sub">% of sessions ending before turn 4</p>
            </div>
            <span className="card-badge" style={{ color: "var(--warning)", borderColor: "rgba(255,138,107,0.3)" }}>Danger · &gt;18%</span>
          </div>
          <HBarList
            items={dropOff}
            accent="var(--warning)"
            valueFormat={v => `${v}%`}
          />
        </div>
      </div>

      {/* === Drop-off context table === */}
      <CollapsibleCard
        title="Drop-off context · last exchange before users left"
        sub="The final user message followed by Riya's reply — look for patterns in why the conversation broke."
        badge={<span className="card-badge">{Q.abruptDropOff} sessions · top {Q.dropOffSamples.length} shown</span>}
      >
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Session</th>
              <th style={{ width: 160 }}>Scenario</th>
              <th>Last user message</th>
              <th>Last Riya reply</th>
              <th style={{ width: 80, textAlign: "right" }}>Turns</th>
            </tr>
          </thead>
          <tbody>
            {Q.dropOffSamples.map((s, i) => (
              <tr key={i}>
                <td className="tnum">{s.session}</td>
                <td><span className="chip dim">{s.scenario}</span></td>
                <td style={{ fontStyle: "italic", color: "var(--warning)" }}>"{s.lastUser}"</td>
                <td>"{s.lastRiya}"</td>
                <td className="tnum" style={{ textAlign: "right" }}>{s.msgCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, padding: 14, background: "rgba(255,138,107,0.06)", borderRadius: 8, border: "1px solid rgba(255,138,107,0.18)", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 8px", background: "rgba(255,138,107,0.15)", borderRadius: 4, flexShrink: 0 }}>Pattern</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.55 }}>
            3 of 4 last-user messages are in Hindi/Hinglish ("kya bola", "samjha nahi"). Riya responds in pure English and the user disengages. This is the single most common drop-off pattern.
          </div>
        </div>
      </CollapsibleCard>

      {/* === Loop detection === */}
      <CollapsibleCard
        title="Loop bug · Riya repeating herself"
        sub="Sessions where Riya sent near-identical consecutive messages"
        badge={<span className="card-badge" style={{ color: "var(--warning)", borderColor: "rgba(255,138,107,0.3)" }}>{Q.loopDetected} sessions affected</span>}
        defaultOpen={false}
      >
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Session</th>
              <th style={{ width: 180 }}>Scenario</th>
              <th>Repeated phrase</th>
              <th style={{ width: 100, textAlign: "right" }}>Repeats</th>
            </tr>
          </thead>
          <tbody>
            {Q.loopSamples.map((l, i) => (
              <tr key={i}>
                <td className="tnum">{l.session}</td>
                <td className="primary">{l.scenario}</td>
                <td style={{ fontStyle: "italic" }}>"{l.snippet}"</td>
                <td style={{ textAlign: "right" }}>
                  <span className="chip warn">×{l.repeats}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleCard>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Most common stall reasons</h3>
              <p className="card-sub">From LLM-analyzed free-chat sessions</p>
            </div>
          </div>
          <div className="ranked">
            {D.stallReasons.map((r, i) => {
              const max = Math.max(...D.stallReasons.map(x => x.count));
              return (
                <div key={i} className="ranked-item">
                  <span className="ranked-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="ranked-body">
                    <span className="ranked-label">{r.reason}</span>
                    <div className="ranked-bar">
                      <div className="ranked-bar-fill warn" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="ranked-count">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Riya's behavioral gaps</h3>
              <p className="card-sub">Patterns across Riya's responses that hurt retention</p>
            </div>
          </div>
          <div className="ranked">
            {D.riyaGaps.map((r, i) => {
              const max = Math.max(...D.riyaGaps.map(x => x.count));
              return (
                <div key={i} className="ranked-item">
                  <span className="ranked-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="ranked-body">
                    <span className="ranked-label">{r.gap}</span>
                    <div className="ranked-bar">
                      <div className="ranked-bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="ranked-count">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

window.QualityPage = QualityPage;
