"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, FlaskConical, X, RotateCcw } from "lucide-react";
import {
  labExperiments,
  LabId,
  LabResult,
  validLabResult,
  probabilityTrial,
  randomnessTrial,
  dotPositions,
  moveDots,
} from "@/lib/lab";
import { shuffled } from "@/lib/adaptive";
import { mean } from "@/lib/model";
import { useDialog } from "./use-dialog";
const STORE = "hb-lab-v1";
export default function Lab() {
  const [active, setActive] = useState<LabId | null>(null),
    [records, setRecords] = useState<LabResult[]>([]),
    [error, setError] = useState(false);
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(STORE) || "[]");
      if (Array.isArray(a)) setRecords(a.filter(validLabResult));
    } catch {
      setError(true);
    }
  }, []);
  const save = (r: LabResult) => {
    setRecords((old) => {
      const next = [...old, r];
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        setError(true);
      }
      return next;
    });
  };
  return (
    <>
      <div className="page-content lab-page" inert={active !== null}>
        <div className="lab-masthead">
          <div>
            <div className="eyebrow">
              EXPERIMENTAL DIVISION / 06 LIVE STUDIES
            </div>
            <h1>
              Go off
              <br />
              <em>the map.</em>
            </h1>
            <p>
              A place for curious minds. Explore the edges of perception,
              attention, and intuition.
            </p>
          </div>
          <div className="lab-orb" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>
              LAB
              <br />
              <small>OPEN EXPLORATION</small>
            </span>
          </div>
        </div>
        <div className="lab-status">
          <span>
            <i /> Six playable experiments
          </span>
          <span>{records.length} observations saved on this device</span>
          <span>EXPERIMENTAL · NO PERCENTILES</span>
        </div>
        <div className="lab-grid">
          {labExperiments.map((x, i) => {
            const past = records.filter((r) => r.type === x.id);
            return (
              <motion.button
                className={`lab-card lab-${x.id}`}
                key={x.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: (i % 3) * 0.06 }}
                onClick={() => setActive(x.id)}
              >
                <div className="lab-card-top">
                  <span>EX / 0{i + 1}</span>
                  <ArrowUpRight size={20} />
                </div>
                <div className="lab-symbol" aria-hidden="true">
                  {x.symbol}
                  <i />
                  <i />
                </div>
                <span className="eyebrow">{x.category}</span>
                <h2>{x.name}</h2>
                <p>{x.description}</p>
                <div className="lab-card-floor">
                  <span>BEGIN EXPLORATION</span>
                  <b>
                    {past.length
                      ? `${past.at(-1)!.score.toFixed(1)} ${x.unit}`
                      : "5 ROUNDS"}
                  </b>
                </div>
              </motion.button>
            );
          })}
        </div>
        <div className="lab-workbench">
          <div>
            <span className="eyebrow">ON THE WORKBENCH</span>
            <h2>Next frontiers.</h2>
          </div>
          {[
            [
              "Dual-task interference",
              "Hold a sequence while solving another task.",
            ],
            [
              "Risk & uncertainty",
              "Separate preferences from probability estimates.",
            ],
            ["Pattern Lab", "Rule discovery across layered transformations."],
          ].map(([n, d]) => (
            <article key={n}>
              <span>CONCEPT / NOT YET PLAYABLE</span>
              <h3>{n}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
        {records.length > 0 && (
          <div className="lab-log">
            <div className="section-heading">
              <h2>Field notes</h2>
              <span className="eyebrow">LAST 12 EXPLORATIONS</span>
            </div>
            {records
              .slice(-12)
              .reverse()
              .map((r) => {
                const x = labExperiments.find((x) => x.id === r.type)!;
                return (
                  <div key={r.id}>
                    <span>
                      {x.name}
                      <small>
                        {new Date(r.timestamp).toLocaleDateString()} ·
                        experimental protocol 1
                      </small>
                    </span>
                    <b>
                      {r.score.toFixed(1)} <small>{x.unit}</small>
                    </b>
                    <svg
                      viewBox="0 0 100 30"
                      aria-label="Five round measurements"
                    >
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        points={r.values
                          .map(
                            (v, i) =>
                              `${i * 24 + 2},${26 - (v / Math.max(1, ...r.values)) * 22}`,
                          )
                          .join(" ")}
                      />
                    </svg>
                  </div>
                );
              })}
          </div>
        )}
        <div className="method-note">
          <FlaskConical size={20} />
          <p>
            Exploratory tasks, not validated assessments. Lab measurements stay
            separate from your core profile. Device, strategy, practice, and
            chance all influence results.
          </p>
        </div>
        {error && (
          <p role="status">
            Storage is unavailable. Results remain available in this tab.
          </p>
        )}
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {active && (
              <LabRun
                key={active}
                type={active}
                previous={records.filter((r) => r.type === active)}
                onClose={() => setActive(null)}
                onSave={save}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
function LabRun({
  type,
  previous,
  onClose,
  onSave,
}: {
  type: LabId;
  previous: LabResult[];
  onClose: () => void;
  onSave: (r: LabResult) => void;
}) {
  const spec = labExperiments.find((x) => x.id === type)!,
    ref = useDialog(onClose),
    completed = useRef(false);
  useEffect(() => {
    completed.current = false;
  });
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro"),
    [round, setRound] = useState(0),
    [values, setValues] = useState<number[]>([]),
    [errors, setErrors] = useState(0),
    [result, setResult] = useState<LabResult | null>(null),
    [restart, setRestart] = useState(0),
    [hidden, setHidden] = useState(false);
  useEffect(() => {
    const change = () => {
      if (document.hidden) {
        setHidden(true);
        setRestart((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  const complete = (value: number, mistakes = 0) => {
    if (completed.current) return;
    completed.current = true;
    const next = [...values, value];
    setValues(next);
    setErrors((n) => n + mistakes);
    if (next.length === 5) {
      const r: LabResult = {
        id: crypto.randomUUID(),
        type,
        timestamp: Date.now(),
        protocol: 1,
        values: next,
        score: mean(next),
        errors: errors + mistakes,
      };
      setResult(r);
      onSave(r);
      setPhase("done");
    } else setRound((n) => n + 1);
  };
  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={spec.name}
      className="test-overlay lab-overlay"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="test-topbar">
        <button className="exit" onClick={onClose}>
          <X size={16} /> Exit Lab
        </button>
        <span className="session-label">EXPERIMENTAL / {spec.category}</span>
        <span className="protocol-label">PROTOCOL L1</span>
      </div>
      <div className="lab-run-content">
        <div className="eyebrow">FIELD STUDY / {spec.symbol}</div>
        <h1>{spec.name}</h1>
        {phase === "intro" ? (
          <div className="lab-intro">
            <p>{spec.instruction}</p>
            <div className="lab-protocol">
              <span>05 ROUNDS</span>
              <span>LOCAL HISTORY</span>
              <span>NO NORMATIVE SCORE</span>
            </div>
            <button className="primary" onClick={() => setPhase("run")}>
              Begin exploration <ArrowUpRight size={16} />
            </button>
          </div>
        ) : phase === "done" && result ? (
          <motion.div
            className="lab-summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="eyebrow">OBSERVATION CAPTURED</span>
            <div className="lab-score">
              {result.score.toFixed(1)}
              <small>{spec.unit}</small>
            </div>
            <p>
              {type === "time"
                ? "Mean absolute timing error. Lower is closer to the target."
                : type === "search"
                  ? `Mean completion time. ${result.errors} incorrect selections recorded; speed alone does not describe accuracy.`
                  : type === "tracking"
                    ? "Mean share of original targets correctly identified."
                    : "Accuracy across five rounds. A small sample, not an ability estimate."}
            </p>
            <div className="round-bars">
              {values.map((v, i) => (
                <div key={i}>
                  <motion.i
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.max(3, (v / Math.max(...values, 1)) * 100)}%`,
                    }}
                    transition={{ delay: i * 0.08 }}
                  />
                  <span>{v.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <p>
              {previous.filter((r) => r.id !== result.id).length
                ? `Previous average: ${mean(previous.filter((r) => r.id !== result.id).map((r) => r.score)).toFixed(1)} ${spec.unit} across ${previous.filter((r) => r.id !== result.id).length} completed explorations.`
                : "First observation saved. Repeat on another day to begin a personal baseline."}
            </p>
            <button className="primary" onClick={onClose}>
              Return to Lab
            </button>
            <button
              className="text-button"
              onClick={() => {
                setRound(0);
                setValues([]);
                setErrors(0);
                setResult(null);
                setPhase("intro");
              }}
            >
              <RotateCcw size={15} /> Explore again
            </button>
          </motion.div>
        ) : (
          <>
            <div className="lab-round-label">
              <span>ROUND {round + 1} / 5</span>
              <div>
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} className={i <= round ? "filled" : ""} />
                ))}
              </div>
            </div>
            {hidden ? (
              <div className="lab-intro">
                <h2>Let’s restart this round.</h2>
                <p>
                  Leaving the tab interrupts the stimulus. Completed rounds are
                  preserved.
                </p>
                <button className="primary" onClick={() => setHidden(false)}>
                  Restart round
                </button>
              </div>
            ) : (
              <Round
                key={`${round}-${restart}`}
                type={type}
                round={round}
                complete={complete}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
function Round({
  type,
  round,
  complete,
}: {
  type: LabId;
  round: number;
  complete: (v: number, e?: number) => void;
}) {
  if (type === "time") return <TimeRound round={round} complete={complete} />;
  if (type === "search" || type === "change")
    return <GridRound type={type} round={round} complete={complete} />;
  if (type === "tracking")
    return <TrackingRound round={round} complete={complete} />;
  return <ChoiceRound type={type} round={round} complete={complete} />;
}
function TimeRound({
  round,
  complete,
}: {
  round: number;
  complete: (v: number) => void;
}) {
  const target = [3, 5, 7, 4, 8][round],
    start = useRef(0),
    lock = useRef(false),
    [elapsed, setElapsed] = useState<number | null>(null),
    [running, setRunning] = useState(false);
  return (
    <div className="time-study">
      <div className={`interval-orb ${running ? "is-running" : ""}`}>
        <span>{running ? "Feel the interval" : `${target} seconds`}</span>
        <i />
        <i />
      </div>
      {elapsed === null ? (
        <button
          className="primary"
          onClick={() => {
            if (lock.current) return;
            if (!running) {
              start.current = performance.now();
              setRunning(true);
            } else {
              lock.current = true;
              setElapsed((performance.now() - start.current) / 1000);
              setRunning(false);
            }
          }}
        >
          {running ? "Stop interval" : "Start interval"}
        </button>
      ) : (
        <>
          <p role="status">
            You estimated {elapsed.toFixed(2)} s ·{" "}
            {elapsed > target ? "over" : "under"} by{" "}
            {Math.abs(elapsed - target).toFixed(2)} s
          </p>
          <button
            className="primary"
            onClick={() =>
              complete((Math.abs(elapsed - target) / target) * 100)
            }
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
function ChoiceRound({
  type,
  round,
  complete,
}: {
  type: "probability" | "randomness";
  round: number;
  complete: (v: number) => void;
}) {
  const [q] = useState(() =>
      type === "probability" ? probabilityTrial(round) : randomnessTrial(),
    ),
    [answer, setAnswer] = useState<number | null>(null);
  return (
    <div className="choice-study">
      <h2>
        {type === "probability"
          ? "Which has the higher expected value?"
          : "Which sequence came from fair coin flips?"}
      </h2>
      <div className="lab-choices">
        {q.choices.map((c, i) => (
          <button
            key={i}
            disabled={answer !== null}
            className={
              answer !== null
                ? i === q.correct
                  ? "correct"
                  : i === answer
                    ? "wrong"
                    : ""
                : ""
            }
            onClick={() => setAnswer(i)}
          >
            <span>0{i + 1}</span>
            <b>{typeof c === "string" ? c : c.label}</b>
          </button>
        ))}
      </div>
      {answer !== null && (
        <>
          <p role="status">
            {answer === q.correct ? "Correct. " : "A useful surprise. "}
            {type === "probability"
              ? `Expected values: ${q.choices.map((c) => (typeof c === "string" ? "" : c.value.toFixed(1))).join(" vs ")} points.`
              : "The constructed sequence repeats a short motif. Real coin flips can contain streaks and apparent patterns."}
          </p>
          <button
            className="primary"
            onClick={() => complete(answer === q.correct ? 100 : 0)}
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
function GridRound({
  type,
  round,
  complete,
}: {
  type: "search" | "change";
  round: number;
  complete: (v: number, e?: number) => void;
}) {
  const size = 4 + round,
    [target] = useState(() => Math.floor(Math.random() * size * size)),
    [angles] = useState(() =>
      Array.from(
        { length: size * size },
        () => Math.floor(Math.random() * 4) * 90,
      ),
    ),
    [stage, setStage] = useState(type === "search" ? "answer" : "study"),
    [answer, setAnswer] = useState<number | null>(null),
    [errors, setErrors] = useState(0),
    [elapsed, setElapsed] = useState(0),
    start = useRef(performance.now());
  useEffect(() => {
    if (type === "search") {
      start.current = performance.now();
      return;
    }
    const a = setTimeout(() => setStage("blank"), 1800),
      b = setTimeout(() => {
        setStage("answer");
        start.current = performance.now();
      }, 2200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [type]);
  const choose = (i: number) => {
    if (stage !== "answer" || answer !== null) return;
    if (type === "search" && i !== target) {
      setErrors((n) => n + 1);
      return;
    }
    setAnswer(i);
    setElapsed((performance.now() - start.current) / 1000);
  };
  return (
    <div className="grid-study">
      <p>
        {stage === "study"
          ? "Study the orientations."
          : stage === "blank"
            ? "…"
            : type === "search"
              ? "Find the upright T."
              : "Which tile changed orientation?"}
      </p>
      <div
        className="search-field"
        style={{
          gridTemplateColumns: `repeat(${size},1fr)`,
          opacity: stage === "blank" ? 0 : 1,
        }}
      >
        {angles.map((a, i) => (
          <button
            key={i}
            aria-label={`Tile ${i + 1}`}
            disabled={stage !== "answer" || answer !== null}
            className={answer !== null && i === target ? "correct" : ""}
            onClick={() => choose(i)}
          >
            <svg viewBox="0 0 40 40" aria-hidden="true">
              <path
                d={
                  type === "search"
                    ? i === target || i % 3 === 0
                      ? "M10 10 H30 M20 10 V30"
                      : "M12 10 V30 H29"
                    : "M12 9 V30 H29"
                }
                transform={`rotate(${type === "search" ? (i === target ? 0 : i % 3 === 0 ? 90 + (a % 270) : a) : a + (stage === "answer" && i === target ? 90 : 0)} 20 20)`}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </button>
        ))}
      </div>
      {type === "search" && (
        <p aria-live="polite">Incorrect selections: {errors}</p>
      )}
      {answer !== null && (
        <>
          <p role="status">
            {type === "search"
              ? `Target found in ${elapsed.toFixed(2)} seconds.`
              : answer === target
                ? "Change located."
                : "The illuminated tile changed."}
          </p>
          <button
            className="primary"
            onClick={() =>
              complete(
                type === "search" ? elapsed : answer === target ? 100 : 0,
                errors,
              )
            }
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
function TrackingRound({
  round,
  complete,
}: {
  round: number;
  complete: (v: number) => void;
}) {
  const count = 8 + (round > 2 ? 2 : 0),
    targetCount = 2 + Math.floor(round / 2),
    [targets] = useState(() =>
      shuffled(Array.from({ length: count }, (_, i) => i)).slice(
        0,
        targetCount,
      ),
    ),
    [dots, setDots] = useState(() => dotPositions(count)),
    [stage, setStage] = useState("study"),
    [chosen, setChosen] = useState<number[]>([]),
    [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStage("moving"), 1800);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (stage !== "moving") return;
    let id = 0,
      last = performance.now(),
      elapsed = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      setDots((a) => moveDots(a, dt * (1 + round * 0.16)));
      if (elapsed >= 6) setStage("answer");
      else id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [stage, round]);
  return (
    <div className="tracking-study">
      <p>
        {stage === "study"
          ? `Memorize these ${targetCount} highlighted targets.`
          : stage === "moving"
            ? "Keep track of your targets."
            : `Select ${targetCount} original targets. ${chosen.length} selected.`}
      </p>
      <div className="tracking-field">
        {dots.map((d, i) => (
          <button
            key={i}
            aria-label={`Object ${i + 1}`}
            aria-pressed={chosen.includes(i)}
            disabled={stage !== "answer" || submitted}
            className={
              (stage === "study" || submitted) && targets.includes(i)
                ? "target"
                : chosen.includes(i)
                  ? "chosen"
                  : ""
            }
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
            onClick={() =>
              setChosen((a) =>
                a.includes(i)
                  ? a.filter((n) => n !== i)
                  : a.length < targetCount
                    ? [...a, i]
                    : a,
              )
            }
          />
        ))}
      </div>
      {stage === "answer" && !submitted && (
        <button
          className="primary"
          disabled={chosen.length !== targetCount}
          onClick={() => setSubmitted(true)}
        >
          Check targets
        </button>
      )}
      {submitted && (
        <>
          <p role="status">
            {chosen.filter((i) => targets.includes(i)).length} of {targetCount}{" "}
            targets retained. Original targets are illuminated.
          </p>
          <button
            className="primary"
            onClick={() =>
              complete(
                (chosen.filter((i) => targets.includes(i)).length /
                  targetCount) *
                  100,
              )
            }
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
