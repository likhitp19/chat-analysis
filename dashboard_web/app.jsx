// Main app shell

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 270,
  "density": "balanced",
  "chartStyle": "area",
  "narrativeMode": true
}/*EDITMODE-END*/;

function App() {
  const [page, setPage] = React.useState("overview");
  const [filters, setFilters] = React.useState({
    dateRange: "Apr 8 – Apr 22",
    dateLabel: "Last 15 days",
    mode: "All",
    sessionLengths: [],
  });
  const { values, setValue } = useTweaks(TWEAK_DEFAULTS);

  // Apply tweaks to :root
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent",       `hsl(${values.accentHue}, 70%, 67%)`);
    root.style.setProperty("--accent-soft",  `hsl(${values.accentHue}, 55%, 78%)`);
    root.style.setProperty("--accent-bg",    `hsla(${values.accentHue}, 70%, 67%, 0.12)`);
    root.setAttribute("data-density", values.density);
  }, [values.accentHue, values.density]);

  const pages = {
    overview:  <OverviewPage  filters={filters} />,
    quality:   <QualityPage   filters={filters} />,
    topics:    <TopicsPage    filters={filters} />,
    depth:     <DepthPage     filters={filters} />,
    scenarios: <ScenariosPage filters={filters} />,
    behavior:  <BehaviorPage  filters={filters} />,
  };

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} filters={filters} setFilters={setFilters} />
      <main className="main">
        <FilterSummary filters={filters} />
        {pages[page]}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent color">
          <TweakSlider label="Hue" min={0} max={360} step={1} value={values.accentHue} onChange={v => setValue("accentHue", v)} />
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[270, 230, 330, 20, 140, 180].map(h => (
              <button key={h} onClick={() => setValue("accentHue", h)} style={{
                width: 26, height: 26, borderRadius: "50%",
                background: `oklch(0.66 0.22 ${h})`,
                border: values.accentHue === h ? "2px solid white" : "2px solid transparent",
                cursor: "pointer", padding: 0,
              }} />
            ))}
          </div>
        </TweakSection>

        <TweakSection title="Layout">
          <TweakRadio
            label="Density"
            value={values.density}
            options={[
              { value: "compact",   label: "Compact" },
              { value: "balanced",  label: "Balanced" },
              { value: "spacious",  label: "Spacious" },
            ]}
            onChange={v => setValue("density", v)}
          />
        </TweakSection>

        <TweakSection title="Storytelling">
          <TweakToggle
            label="Narrative headlines"
            value={values.narrativeMode}
            onChange={v => setValue("narrativeMode", v)}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>
            Show editorial ledes and insight callouts above data sections.
          </div>
        </TweakSection>
      </TweaksPanel>

      {!values.narrativeMode && (
        <style>{`
          .lede, .lede-meta, .insight { display: none !important; }
          .page-title em { display: none; }
        `}</style>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
