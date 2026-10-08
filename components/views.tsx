"use client";
import { useClientReducedMotion as useReducedMotion } from "./use-client-reduced-motion";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Play,
  RotateCcw,
  Orbit,
  Check,
  FlaskConical,
  Plus,
  X,
  Activity,
  Clock,
  Layers,
} from "lucide-react";
import Radar from "./radar";
import ProfileWorld from "./profile-world";
import { MeasurementProfile } from "./measurement-panel";
import MeasurementHistory from "./measurement-history";
import MeasurementResult from "./measurement-result";
import SceneLoader from "./scene-loader";
import { DataRibbon, GlassSurface } from "./experience";
import { Progression } from "./field-system";
import TestGlyph from "./test-glyph";
import { useDialog } from "./use-dialog";
import {
  tests,
  TestType,
  TestResult,
  CognitiveSession,
  profile,
  mean,
  sd,
  ordinal,
  comparable,
  recentFor,
  completedSessions,
} from "@/lib/model";
import { startingLevel } from "@/lib/adaptive";
export function Library({
  results,
  start,
}: {
  results: TestResult[];
  start: (t: TestType) => void;
}) {
  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <div className="eyebrow">THE EXPERIMENT COLLECTION / 01—04</div>
          <h1>Choose a dimension.</h1>
          <p>A different challenge for every part of your profile.</p>
        </div>
        <span className="tiny-tag">CALIBRATED TO YOUR PACE</span>
      </div>
      <div className="library-layout">
        {tests.map((t, i) => {
          const r = recentFor(results, t.id),
            latest = r.at(-1);
          return (
            <motion.button
              layoutId={`instrument-${t.id}`}
              className={"library-test library-" + t.id}
              onClick={() => start(t.id)}
              key={t.id}
              style={{ "--accent": t.color } as React.CSSProperties}
            >
              <div className="library-number">
                0{i + 1}
                <span>{t.category}</span>
                <Plus size={18} />
              </div>
              <TestGlyph type={t.id} />
              <GlassSurface className="library-description">
                <h2>{t.name}</h2>
                <p>{t.description}</p>
                <div className="library-metrics">
                  <span>
                    <b>{latest ? Math.round(latest.rawScore) : "—"}</b>{" "}
                    {latest ? t.unit : ""}
                    <small>LAST PERFORMANCE</small>
                  </span>
                  <span>
                    {r.length} observations
                    <small>SAVED IN THIS PROTOCOL</small>
                  </span>
                </div>
                <div className="library-bottom">
                  <span>
                    <Play size={12} /> Begin experiment
                  </span>
                  <span>
                    {t.id === "reaction"
                      ? "7 trials"
                      : `Start level ${startingLevel(t.id, results)}`}{" "}
                    · {t.duration}
                  </span>
                </div>
              </GlassSurface>
            </motion.button>
          );
        })}
      </div>
      <div className="method-note">
        <Orbit size={20} />
        <p>
          Spatial difficulty maximizes expected information. Other tests respond
          to accuracy and pace. Your next visit begins near your last measured
          level. Spatial now uses Bayesian protocol 04; other core tasks use 02.
          Original results are preserved in History.
        </p>
      </div>
    </div>
  );
}
function LegacyProfile({
  results,
  start,
  demo,
}: {
  results: TestResult[];
  start: () => void;
  demo: boolean;
}) {
  const d = profile(results),
    strong = [...d.filter((x) => x.count)].sort((a, b) => b.value - a.value)[0],
    reactions = recentFor(results, "reaction"),
    memory = recentFor(results, "memory"),
    first = memory[0],
    last = memory.at(-1);
  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <div className="eyebrow">
            {demo ? "ILLUSTRATIVE DEMO" : "YOUR COGNITIVE FIELD"}
          </div>
          <h1>A profile. Not a label.</h1>
          <p>Explore your measured strengths and the space between them.</p>
        </div>
        <button className="secondary" onClick={start}>
          <Play size={14} /> Add a session
        </button>
      </div>
      <div className="profile-layout">
        <div className="profile-object">
          <div className="instrument-label">
            <span>DIMENSIONAL PROFILE</span>
            <span>{results.length} OBSERVATIONS</span>
          </div>
          <SceneLoader results={results} />
        </div>
        <div className="dimension-list">
          {d.map((x, i) => (
            <div className="dimension" key={x.name}>
              <span className="dimension-index">0{i + 1}</span>
              <div className="dimension-info">
                <h3>{x.name}</h3>
                <div className="confidence-meter">
                  <i
                    style={{
                      left: `${Math.max(0, x.value - x.band)}%`,
                      width: `${Math.min(100, x.value + x.band) - Math.max(0, x.value - x.band)}%`,
                    }}
                  />
                  <b
                    style={{ left: `${x.value}%`, opacity: x.count ? 1 : 0 }}
                  />
                </div>
                <span>
                  {x.count
                    ? `${x.count} observation${x.count === 1 ? "" : "s"} · ${x.confidence} confidence`
                    : "Unmeasured dimension"}
                </span>
              </div>
              <div className="dimension-score">
                {x.count ? Math.round(x.value) : "—"}
                <small>
                  {x.count
                    ? `${Math.max(1, Math.round(x.value - x.band))}–${Math.min(99, Math.round(x.value + x.band))}`
                    : "—"}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Progression results={results} />
      {results.length ? (
        <div className="insight-row">
          <article>
            <span className="eyebrow">01 / RELATIVE STRENGTH</span>
            <h3>{strong?.name}</h3>
            <p>
              Your highest estimated dimension in these tasks. It is a relative
              performance signal, not a measure of general ability.
            </p>
          </article>
          <article>
            <span className="eyebrow">02 / REACTION CONSISTENCY</span>
            <h3>
              {reactions.length >= 2
                ? `±${Math.round(sd(reactions.map((r) => r.rawScore)))} ms`
                : "Still forming"}
            </h3>
            <p>
              {reactions.length >= 2
                ? `Standard deviation across ${reactions.length} sessions using the same protocol. Lower variation means more repeatable performance.`
                : "Repeat the reaction experiment to see how consistently you respond across sessions."}
            </p>
          </article>
          <article>
            <span className="eyebrow">03 / MEMORY PROGRESSION</span>
            <h3>
              {memory.length >= 2 && last
                ? `${last.rawScore - first.rawScore >= 0 ? "+" : ""}${last.rawScore - first.rawScore} cells`
                : "Your next reference point"}
            </h3>
            <p>
              {memory.length >= 2
                ? "Change in successful pattern capacity from first to latest session in this protocol."
                : "Two memory observations reveal your first capacity comparison."}
            </p>
          </article>
        </div>
      ) : (
        <div className="empty-profile">
          <h2>Your map forms as you explore.</h2>
          <p>
            Four experiments establish the core dimensions. Repetition gives
            them definition.
          </p>
          <button className="primary" onClick={start}>
            <Play size={15} /> Form my profile
          </button>
        </div>
      )}
      <div className="method-note">
        <Orbit size={18} />
        <p>
          Percentiles use simulated reference distributions. Bands illustrate
          uncertainty, not statistical confidence intervals. Processing combines
          reaction and math; attention combines memory and spatial performance.
          Each test is weighted equally within a combined dimension. No IQ
          score. No diagnostic interpretation.
        </p>
      </div>
    </div>
  );
}
export function Trend({
  results,
  unit,
  compact = false,
}: {
  results: TestResult[];
  unit: string;
  compact?: boolean;
}) {
  const values = results.slice(-12).map((r) => r.rawScore),
    min = Math.min(...values),
    max = Math.max(...values),
    range = Math.max(1, max - min);
  if (!values.length)
    return <div className="trend-empty">Awaiting observations</div>;
  const points = values.map((v, i) => [
    20 + i * (460 / Math.max(1, values.length - 1)),
    75 - ((v - min) / range) * 55,
  ]);
  return (
    <div className={"trend " + (compact ? "compact" : "")}>
      <svg
        viewBox="0 0 500 100"
        role="img"
        aria-label={`${values.length} recent results: ${values.map(Math.round).join(", ")} ${unit}`}
      >
        <path
          d="M20 80H480M20 45H480M20 10H480"
          stroke="#94a8c2"
          strokeOpacity=".1"
          strokeDasharray="2 5"
        />
        {values.length > 1 && (
          <polyline
            points={points.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="#aecbe4"
            strokeWidth="1.5"
          />
        )}
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={i === points.length - 1 ? 4 : 2.5}
              fill={i === points.length - 1 ? "#e2f3ff" : "#758da6"}
            />
            {!compact && (
              <text
                x={x}
                y={y - 10}
                fill="#b1bdce"
                textAnchor="middle"
                fontSize="10"
              >
                {Math.round(values[i])}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="trend-axis">
        <span>
          {results.length
            ? new Date(results.slice(-12)[0].timestamp).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              )
            : ""}
        </span>
        <span>
          {unit} · {values.length} observation{values.length === 1 ? "" : "s"} ·{" "}
          {unit === "ms" ? "lower is faster" : "higher is better"}
        </span>
        <span>Latest</span>
      </div>
    </div>
  );
}
function LegacyHistoryView({
  results,
  start,
  onOpenSession,
}: {
  results: TestResult[];
  start: () => void;
  onOpenSession: (s: CognitiveSession) => void;
}) {
  const [filter, setFilter] = useState<TestType | "all">("all"),
    [expanded, setExpanded] = useState<string | null>(null);
  const r = results
    .filter((r) => filter === "all" || r.testType === filter)
    .slice()
    .reverse();
  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <div className="eyebrow">YOUR PERSONAL REFERENCE POINTS</div>
          <h1>Progress has a pattern.</h1>
          <p>Compare yourself with yourself. Notice what changes.</p>
        </div>
        <span className="tiny-tag">{results.length} SAVED OBSERVATIONS</span>
      </div>
      <DataRibbon results={results} />
      <div className="filters" aria-label="Filter history">
        <button
          aria-pressed={filter === "all"}
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All experiments
        </button>
        {tests.map((t) => (
          <button
            aria-pressed={filter === t.id}
            className={filter === t.id ? "active" : ""}
            key={t.id}
            onClick={() => setFilter(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      {r.length ? (
        <>
          <div className="history-trends">
            {tests
              .filter((t) => filter === "all" || t.id === filter)
              .map((t) => {
                const series = recentFor(results, t.id),
                  last = series.at(-1),
                  first = series[0];
                return (
                  <article key={t.id}>
                    <div>
                      <span className="eyebrow">{t.name}</span>
                      <b>
                        {last ? Math.round(last.rawScore) : "—"}
                        <small>{t.unit}</small>
                      </b>
                    </div>
                    <Trend results={series} unit={t.unit} />
                    <p>
                      {series.length > 1
                        ? `${Math.abs(last!.rawScore - first.rawScore).toFixed(0)} ${t.unit} ${last!.rawScore < first.rawScore ? "lower" : "higher"} than your first observation`
                        : "Complete another experiment to reveal a trend."}{" "}
                      <span>Same protocol only</span>
                    </p>
                  </article>
                );
              })}
          </div>
          {completedSessions(results).length > 0 && (
            <div className="saved-sessions">
              <div className="eyebrow">COMPLETED COGNITIVE SESSIONS</div>
              {completedSessions(results)
                .slice(-5)
                .reverse()
                .map((s) => (
                  <button key={s.id} onClick={() => onOpenSession(s)}>
                    <Layers size={17} />
                    <span>
                      {new Date(s.startedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      <small>
                        {s.results.length} experiments · saved report
                      </small>
                    </span>
                    <span>View summary</span>
                  </button>
                ))}
            </div>
          )}
          <div className="section-heading">
            <h2>Session log</h2>
            <span className="eyebrow">MOST RECENT FIRST</span>
          </div>
          <div className="timeline">
            {r.map((result) => {
              const t = tests.find((t) => t.id === result.testType)!;
              return (
                <article
                  key={result.id}
                  className={expanded === result.id ? "expanded" : ""}
                >
                  <button
                    className="history-row"
                    onClick={() =>
                      setExpanded(expanded === result.id ? null : result.id)
                    }
                    aria-expanded={expanded === result.id}
                  >
                    <div className="timeline-date">
                      {new Date(result.timestamp).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                      <small>
                        {new Date(result.timestamp).toLocaleTimeString(
                          undefined,
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </small>
                    </div>
                    <div
                      className="history-marker"
                      style={{ background: t.color }}
                    />
                    <span className="history-name">
                      {t.name}
                      <small>
                        {result.sessionId ? "COGNITIVE SESSION" : "INDIVIDUAL"}{" "}
                        · PROTOCOL {result.protocolVersion || 1}
                      </small>
                    </span>
                    <div className="history-value">
                      {Math.round(result.rawScore)}
                      <span>{t.unit}</span>
                    </div>
                    <span className="history-level">
                      L{result.difficulty.toFixed(1)}
                    </span>
                    <Plus size={16} />
                  </button>
                  {expanded === result.id && (
                    <motion.div
                      className="history-detail"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span>
                        Accuracy{" "}
                        <b>
                          {result.testType === "reaction"
                            ? Array.isArray(result.metadata.trials)
                              ? result.metadata.trials.length
                              : "—"
                            : `${Math.round(result.accuracy * 100)}%`}
                        </b>
                      </span>
                      <span>
                        Mean response{" "}
                        <b>
                          {result.responseTime
                            ? (result.responseTime / 1000).toFixed(2) + " s"
                            : "Not recorded"}
                        </b>
                      </span>
                      <span>
                        {result.protocolVersion === 4 ? (
                          <>
                            Posterior θ{" "}
                            <b>{Number(result.metadata.theta).toFixed(2)}</b>
                          </>
                        ) : (
                          <>
                            Illustrative legacy percentile{" "}
                            <b>{ordinal(result.percentile)}</b>
                          </>
                        )}
                      </span>
                      <span>
                        Next difficulty{" "}
                        <b>{result.metadata.nextLevel || "Not recorded"}</b>
                      </span>
                      <small>
                        Legacy scores are illustrative. Bayesian spatial trials
                        have no percentile. Difficulty and timing influence each
                        task differently.
                      </small>
                    </motion.div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Orbit size={48} strokeWidth={0.8} />
          <h2>Your story starts with a signal.</h2>
          <p>Complete an experiment and your progress will appear here.</p>
          <button className="primary" onClick={start}>
            Explore the tests
          </button>
        </div>
      )}
    </div>
  );
}
function Count({ value }: { value: number }) {
  const [n, setN] = useState(0),
    reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setN(Math.round(value));
      return;
    }
    const s = performance.now();
    let id = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - s) / 500);
      setN(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, reduced]);
  return <>{n}</>;
}
function LegacyResults({
  result,
  previous,
  onRetry,
  onProfile,
  onNext,
  sessionLabel,
  sessionFinal,
}: {
  result: TestResult;
  previous: TestResult[];
  onRetry?: () => void;
  onProfile: () => void;
  onNext: () => void;
  sessionLabel?: string;
  sessionFinal?: boolean;
}) {
  const ref = useDialog(onProfile),
    t = tests.find((t) => t.id === result.testType)!,
    past = previous.filter((r) => comparable(r, result)),
    recent = past.filter((r) => r.timestamp >= Date.now() - 30 * 86400000),
    baseline = mean(recent.map((r) => r.rawScore)),
    delta = result.rawScore - baseline,
    all = [...past, result],
    best = (result.testType === "reaction" ? Math.min : Math.max)(
      ...all.map((r) => r.rawScore),
    );
  const times = Array.isArray(result.metadata.trials)
    ? result.metadata.trials
    : Array.isArray(result.metadata.times)
      ? result.metadata.times
      : [];
  const stats =
    result.testType === "reaction"
      ? [
          ["Mean response", `${Math.round(mean(times))} ms`],
          ["Fastest trial", `${Math.round(Math.min(...times))} ms`],
          ["Standard deviation", `±${Math.round(sd(times))} ms`],
          [
            "False starts",
            String(
              Number(result.metadata.falseStarts || 0) +
                Number(result.metadata.anticipations || 0),
            ),
          ],
        ]
      : result.testType === "memory"
        ? [
            ["Cell accuracy", `${Math.round(result.accuracy * 100)}%`],
            ["Correct cells", String(result.metadata.correctCells)],
            [
              "Maximum grid",
              `${result.metadata.maxGrid} × ${result.metadata.maxGrid}`,
            ],
            [
              "Mean recall time",
              `${(result.responseTime / 1000).toFixed(1)} s`,
            ],
          ]
        : [
            ["Accuracy", `${Math.round(result.accuracy * 100)}%`],
            ["Mean response", `${(result.responseTime / 1000).toFixed(1)} s`],
            ["Response variation", `±${(sd(times) / 1000).toFixed(1)} s`],
            ["Mean difficulty", `${result.difficulty.toFixed(1)} / 10`],
          ];
  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Experiment results"
      className="test-overlay result-overlay"
      initial={{ opacity: 0, scale: 0.94, y: 25 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="test-topbar">
        <button className="exit" onClick={onProfile}>
          <X size={16} />{" "}
          {sessionLabel && !sessionFinal ? "Save & exit" : "Close"}
        </button>
        <span className="session-label">
          {sessionLabel || "EXPERIMENT COMPLETE"}
        </span>
        <span className="protocol-label">
          PROTOCOL {String(result.protocolVersion || 1).padStart(2, "0")}
        </span>
      </div>
      <div className="result-content">
        <div className="result-hero">
          <div>
            <div className="eyebrow">
              <Check size={14} /> {t.name.toUpperCase()}
            </div>
            <div className="result-number">
              <Count value={result.rawScore} />
              <span>{t.unit}</span>
            </div>
            <p>
              {result.testType === "reaction"
                ? "Median response time"
                : result.testType === "memory"
                  ? "Largest perfectly recalled pattern"
                  : "Correct responses"}
            </p>
          </div>
          <div className="percentile-dial">
            <svg viewBox="0 0 150 150">
              <circle cx="75" cy="75" r="66" pathLength="100" />
              <motion.circle
                cx="75"
                cy="75"
                r="66"
                pathLength="100"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${result.accuracy * 100} 100` }}
                transition={{ duration: 0.6 }}
              />
            </svg>
            <div>
              <b>
                {result.testType === "reaction"
                  ? Array.isArray(result.metadata.trials)
                    ? result.metadata.trials.length
                    : "—"
                  : `${Math.round(result.accuracy * 100)}%`}
              </b>
              <span>
                {result.testType === "reaction" ? "VALID TRIALS" : "ACCURACY"}
              </span>
            </div>
          </div>
        </div>
        <div className="baseline-panel">
          <Activity size={19} />
          <p>
            {recent.length ? (
              <>
                <strong>
                  {Math.abs(delta).toFixed(
                    result.testType === "reaction" ? 0 : 1,
                  )}{" "}
                  {t.unit}{" "}
                  {delta === 0 ? "change" : delta < 0 ? "lower" : "higher"}
                </strong>{" "}
                than your 30-day average.{" "}
                {result.testType === "reaction"
                  ? "Lower is faster."
                  : "Higher is better; compare alongside difficulty."}
              </>
            ) : (
              "A new baseline begins here. Repeat this experiment to uncover a pattern."
            )}
          </p>
        </div>
        <div className="result-stats">
          {stats.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
        <div className="result-lower">
          <div className="result-trend">
            <div className="subheading">
              <span>RECENT PERFORMANCE</span>
              <span>
                {all.length > 1 ? "SAME PROTOCOL" : "FIRST OBSERVATION"}
              </span>
            </div>
            <Trend results={all.slice(-6)} unit={t.unit} />
          </div>
          <div className="result-records">
            <span>
              Personal best{" "}
              <b>
                {Math.round(best)} {t.unit}
              </b>
            </span>
            <span>
              Historical average{" "}
              <b>
                {Math.round(mean(all.map((r) => r.rawScore)))} {t.unit}
              </b>
            </span>
            <span>
              Sampling history{" "}
              <b>
                {all.length >= 8
                  ? "Moderate"
                  : all.length >= 3
                    ? "Developing"
                    : "Early"}
              </b>
            </span>
            <span>
              Observations <b>{all.length}</b>
            </span>
          </div>
        </div>
        <div className="result-actions">
          {onRetry && (
            <button className="secondary" onClick={onRetry}>
              <RotateCcw size={15} /> Repeat
            </button>
          )}
          <button className="primary" onClick={onNext}>
            {sessionFinal
              ? "Reveal session profile"
              : sessionLabel
                ? "Continue session"
                : "Next experiment"}
          </button>
          <button className="text-button" onClick={onProfile}>
            <Orbit size={15} />{" "}
            {sessionLabel && !sessionFinal
              ? "Save & view profile"
              : "View profile"}
          </button>
        </div>
        <p className="test-footnote">
          Your own history is the reference. Compare the same protocol and
          similar difficulty.
        </p>
      </div>
    </motion.div>
  );
}
export function SessionReport({
  session,
  previous,
  onClose,
}: {
  session: CognitiveSession;
  previous: TestResult[];
  onClose: () => void;
}) {
  const ref = useDialog(onClose),
    duration = Math.round(
      ((session.completedAt || Date.now()) - session.startedAt) / 60000,
    ),
    withAccuracy = session.results.filter((r) => r.testType !== "reaction");
  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Cognitive session summary"
      className="test-overlay report-overlay"
      initial={{ opacity: 0, scale: 0.94, y: 25 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="test-topbar">
        <button className="exit" onClick={onClose}>
          <X size={16} /> Close
        </button>
        <span className="session-label">
          SESSION CAPTURED / {session.results.length} EXPERIMENTS
        </span>
      </div>
      <div className="report-content">
        <div className="eyebrow">MORE SIGNAL. MORE DEFINITION.</div>
        <h1>Your profile is taking shape.</h1>
        <p>Every experiment adds a different perspective.</p>
        <div className="session-report-layout">
          <SceneLoader results={[...previous, ...session.results]} />
          <div className="report-observations">
            <div className="report-summary">
              <span>
                <Clock size={15} />
                {duration < 1 ? "< 1" : duration} min elapsed
              </span>
              <span>
                <Layers size={15} />
                {session.results.length} dimensions tested
              </span>
            </div>
            {session.results.map((r) => {
              const t = tests.find((t) => t.id === r.testType)!,
                past = previous.filter((x) => comparable(x, r)),
                delta = r.rawScore - mean(past.map((x) => x.rawScore));
              return (
                <div key={r.id} className="report-result">
                  <span>
                    {t.name}
                    <small>
                      {past.length
                        ? `${Math.abs(delta).toFixed(0)} ${t.unit} ${delta < 0 ? "lower" : "higher"} than prior average`
                        : "First observation in this protocol"}
                    </small>
                  </span>
                  <b>
                    {Math.round(r.rawScore)}
                    <small>{t.unit}</small>
                  </b>
                </div>
              );
            })}
            <div className="session-insight">
              <span className="eyebrow">ACCURACY ACROSS TASKS</span>
              <p>
                {withAccuracy.length
                  ? `${Math.round(mean(withAccuracy.map((r) => r.accuracy)) * 100)}% mean accuracy across ${withAccuracy.length} memory, numerical, or spatial tasks. Each uses its own scoring rule.`
                  : "Reaction trials establish your speed baseline."}
              </p>
              <small>
                Task mix and adaptive difficulty prevent a reliable fatigue
                estimate from one short session.
              </small>
            </div>
          </div>
        </div>
        <button className="primary" onClick={onClose}>
          <Orbit size={15} /> Explore my profile
        </button>
      </div>
    </motion.div>
  );
}

export function Profile(props: {
  results: TestResult[];
  start: () => void;
  demo: boolean;
}) {
  return <ProfileWorld {...props} />;
}

export function Results(props: Parameters<typeof LegacyResults>[0]) {
  return props.result.protocolVersion === 4 &&
    props.result.testType === "spatial" ? (
    <MeasurementResult {...props} />
  ) : (
    <LegacyResults {...props} />
  );
}

export function HistoryView(props: Parameters<typeof LegacyHistoryView>[0]) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <>
      <LegacyHistoryView {...props} />
      <details
        className="advanced-analysis"
        onToggle={(e) => setAdvanced(e.currentTarget.open)}
      >
        <summary>
          Spatial trial history <span>Advanced model timeline ↗</span>
        </summary>
        {advanced && <MeasurementHistory />}
      </details>
    </>
  );
}
