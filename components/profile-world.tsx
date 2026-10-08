"use client";
import { useState } from "react";
import { TestResult, tests, recentFor } from "@/lib/model";
import { LegacySceneLoader } from "./scene-loader";
import { MeasurementProfile } from "./measurement-panel";
import { useMeasurement } from "./use-measurement";
export function AdvancedAnalysis() {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="advanced-analysis"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        Advanced analysis{" "}
        <span>Spatial model, uncertainty & trial history ↗</span>
      </summary>
      {open && <MeasurementProfile />}
    </details>
  );
}
export default function ProfileWorld({
  results,
  start,
  demo,
}: {
  results: TestResult[];
  start: () => void;
  demo: boolean;
}) {
  const [cutoff, setCutoff] = useState<number | null>(null),
    state = useMeasurement();
  const ordered = [...results].sort((a, b) => a.timestamp - b.timestamp),
    count = cutoff === null ? ordered.length : Math.min(cutoff, ordered.length),
    visible = ordered.slice(0, count);
  return (
    <div className="profile-world">
      <div className="page-title">
        <div>
          <span className="eyebrow">
            04 / YOUR COGNITIVE ATLAS {demo ? "· DEMO" : ""}
          </span>
          <h1>
            A little more
            <br />
            <em>you, revealed.</em>
          </h1>
          <p>
            Explore the signals. Notice what changes. Keep the unknowns visible.
          </p>
        </div>
        <button className="primary mercury-button" onClick={start}>
          Collect spatial evidence ↗
        </button>
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      <LegacySceneLoader results={visible} />
      <label className="timeline-scrub atlas-scrub">
        Explore saved history · {count} / {ordered.length} results
        <input
          type="range"
          aria-label="Explore profile history"
          min="0"
          max={ordered.length}
          value={count}
          onChange={(e) => setCutoff(Number(e.target.value))}
        />
      </label>
      <button className="text-action" onClick={() => setCutoff(null)}>
        Return to current profile ↗
      </button>
      <section
        aria-label="Standalone test performance"
        className="atlas-observations"
      >
        <div className="eyebrow">PERFORMANCE / ORIGINAL UNITS</div>
        <div className="insight-row">
          {tests.map((t) => {
            const series = recentFor(visible, t.id),
              last = series.at(-1),
              previous = series.at(-2),
              delta =
                last && previous ? last.rawScore - previous.rawScore : null;
            return (
              <article key={t.id}>
                <span className="eyebrow">{t.name}</span>
                <h3>
                  {last
                    ? `${Math.round(last.rawScore)} ${t.unit}`
                    : "Unmeasured"}
                </h3>
                <p>
                  {series.length} observation{series.length === 1 ? "" : "s"}
                  {last ? " · latest result in this protocol" : ""}
                </p>
                <small>
                  {delta === null
                    ? "Repeat this test to see a trend."
                    : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${t.unit} from the previous result${t.id === "reaction" ? " · lower is faster" : ""}`}
                </small>
              </article>
            );
          })}
        </div>
      </section>
      <div className="atlas-method">
        <span>MEASUREMENT CONFIDENCE</span>
        <p>
          {state.events.length
            ? `Spatial has ${state.events.length} model-linked answers. Its current uncertainty is SD ${state.estimate.sd.toFixed(2)}; inspect the credible interval in Advanced analysis.`
            : "Spatial confidence forms as you answer. No model-linked answers yet."}{" "}
          Other tests retain their own scores; repeated observations are not a
          calibrated confidence estimate. Processing speed and attention have no
          separate measurements.
        </p>
      </div>
      <AdvancedAnalysis />
    </div>
  );
}
