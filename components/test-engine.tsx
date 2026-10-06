"use client";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { flushSync } from "react-dom";
import { X, Play, ScanLine } from "lucide-react";
import {
  TestType,
  TestResult,
  tests,
  makeResult,
  mean,
  median,
  sd,
} from "@/lib/model";
import {
  Attempt,
  nextLevel,
  startingLevel,
  mathQuestion,
  memoryConfig,
  shuffled,
  summariseAttempts,
} from "@/lib/adaptive";
import TestGlyph from "./test-glyph";
import VoxelShape from "./voxel-shape";
import { spatial3Question, transform } from "@/lib/spatial";
import { useDialog } from "./use-dialog";
type Props = {
  type: TestType;
  previous: TestResult[];
  onFinish: (r: TestResult) => void;
  onExit: () => void;
  sessionLabel?: string;
  sessionProgress?: number;
};
export default function TestEngine(p: Props) {
  const [started, setStarted] = useState(false);
  const ref = useDialog(p.onExit);
  const t = tests.find((t) => t.id === p.type)!;
  return (
    <motion.div
      layoutId={`instrument-${p.type}`}
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t.name}
      className="test-overlay"
      initial={{ opacity: 0, scale: 0.87, borderRadius: "80px" }}
      animate={{ opacity: 1, scale: 1, borderRadius: "0px" }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="test-topbar">
        <button className="exit" onClick={p.onExit}>
          <X size={16} /> {p.sessionLabel ? "Save & exit" : "Exit test"}
        </button>
        <span className="session-label">
          {p.sessionLabel || "INDIVIDUAL EXPERIMENT"}
        </span>
        <span className="protocol-label">
          PROTOCOL {p.type === "spatial" ? "03" : "02"}
        </span>
      </div>
      {p.sessionLabel && (
        <div className="session-progress">
          <i style={{ width: `${(p.sessionProgress || 0) * 100}%` }} />
        </div>
      )}
      {!started ? (
        <div className="test-intro">
          <div className="intro-icon">
            <TestGlyph type={p.type} />
          </div>
          <div className="eyebrow">
            {t.category} / {t.duration}
          </div>
          <h1>{t.name}</h1>
          <p>
            {p.type === "reaction"
              ? "Wait for the field to turn icy blue. Click or press Space immediately. Seven valid trials; early responses do not count."
              : p.type === "memory"
                ? "Memorize the illuminated cells, then recreate the pattern. Eight adaptive rounds increase the pattern size, grid size, and speed of exposure."
                : p.type === "math"
                  ? "Ten adaptive calculations: fractions, percentages, multi-step arithmetic, and more. Correct, fast answers move you up sooner. Type your answer and press Enter."
                  : "Mentally rotate a three-dimensional block assembly. Find the same object from a new orientation among mirrors and subtly altered structures. Ten adaptive rounds; up to six choices. Hidden blocks still belong to the object."}
          </p>
          {p.type !== "reaction" && (
            <div className="starting-level">
              <span>Starting difficulty</span>
              <b>
                {startingLevel(p.type, p.previous)}{" "}
                <small>/ {p.type === "memory" ? 12 : 10}</small>
              </b>
              <span>
                {p.previous.some(
                  (r) =>
                    r.testType === p.type &&
                    r.protocolVersion === (p.type === "spatial" ? 3 : 2),
                )
                  ? "From your recent performance"
                  : "Initial calibration"}
              </span>
            </div>
          )}
          <button
            autoFocus
            className="primary"
            onClick={() => setStarted(true)}
          >
            <Play size={15} /> Begin experiment
          </button>
          <span className="test-footnote">
            Accuracy comes first. This is your baseline, not a verdict.
          </span>
        </div>
      ) : p.type === "reaction" ? (
        <Reaction {...p} />
      ) : p.type === "memory" ? (
        <Memory {...p} />
      ) : p.type === "math" ? (
        <MathTest {...p} />
      ) : (
        <Spatial {...p} />
      )}
    </motion.div>
  );
}
function Trial({
  n,
  total,
  label,
  level,
}: {
  n: number;
  total: number;
  label?: string;
  level?: number;
}) {
  return (
    <div className="trial-header">
      <div className="trial-label">
        {label || "TRIAL"} <b>{String(n).padStart(2, "0")}</b> / {total}
        {level !== undefined && <span>DIFFICULTY {level}</span>}
      </div>
      <div className="trial-track">
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < n ? "done" : ""} />
        ))}
      </div>
    </div>
  );
}
function useActiveClock() {
  const began = useRef(performance.now()),
    hidden = useRef<number | null>(null),
    pause = useRef(0);
  useEffect(() => {
    const v = () => {
      if (document.hidden) hidden.current = performance.now();
      else if (hidden.current !== null) {
        pause.current += performance.now() - hidden.current;
        hidden.current = null;
      }
    };
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);
  return {
    reset: () => {
      began.current = performance.now();
      pause.current = 0;
      hidden.current = document.hidden ? performance.now() : null;
    },
    read: () =>
      Math.max(
        0,
        (hidden.current ?? performance.now()) - began.current - pause.current,
      ),
  };
}
function Reaction({ onFinish, previous }: Props) {
  const [phase, setPhase] = useState<
    "idle" | "wait" | "go" | "early" | "trial"
  >("idle");
  const [times, setTimes] = useState<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    frame = useRef(0),
    start = useRef(0),
    phaseRef = useRef(phase),
    falseStarts = useRef(0),
    tooFast = useRef(0),
    finished = useRef(false);
  const set = (p: typeof phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const cleanup = () => {
    if (timer.current) clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
  };
  useEffect(() => {
    const hide = () => {
      if (document.hidden && ["wait", "go"].includes(phaseRef.current)) {
        cleanup();
        set("idle");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const act = useCallback(() => {
    if (finished.current) return;
    if (phaseRef.current === "wait") {
      cleanup();
      falseStarts.current++;
      set("early");
    } else if (phaseRef.current === "go") {
      const t = performance.now() - start.current;
      if (t < 80) {
        tooFast.current++;
        set("early");
        return;
      }
      setTimes((x) => [...x, t]);
      set("trial");
    } else if (times.length === 7) {
      finished.current = true;
      onFinish(
        makeResult("reaction", median(times), 1, mean(times), 1, {
          fastest: Math.min(...times),
          average: mean(times),
          median: median(times),
          standardDeviation: sd(times),
          falseStarts: falseStarts.current,
          anticipations: tooFast.current,
          trials: times,
          nextLevel: 1,
        }),
      );
    } else {
      set("wait");
      timer.current = setTimeout(
        () => {
          frame.current = requestAnimationFrame(() => {
            flushSync(() => set("go"));
            start.current = performance.now();
          });
        },
        1400 + Math.random() * 3600,
      );
    }
  }, [times, onFinish]);
  const baseline = median(
    previous
      .filter((r) => r.testType === "reaction" && r.protocolVersion === 2)
      .slice(-10)
      .map((r) => r.rawScore),
  );
  return (
    <div className="experiment reaction-experiment">
      <Trial n={Math.min(times.length + 1, 7)} total={7} />
      <button
        autoFocus
        className={"reaction-field " + phase}
        onPointerDown={(e) => {
          if (e.button === 0) {
            e.preventDefault();
            act();
          }
        }}
        onKeyDown={(e) => {
          if (["Enter", " "].includes(e.key)) {
            e.preventDefault();
            if (!e.repeat) act();
          }
        }}
      >
        <div className="reaction-reticle">
          <ScanLine size={42} strokeWidth={1} />
        </div>
        <h1>
          {phase === "wait"
            ? "Await the signal."
            : phase === "go"
              ? "Respond."
              : phase === "early"
                ? "Before the signal."
                : phase === "trial"
                  ? `${Math.round(times.at(-1)!)} ms`
                  : "Find your moment."}
        </h1>
        <p>
          {phase === "wait"
            ? "Stay ready."
            : phase === "go"
              ? "Click or press Space"
              : phase === "early"
                ? "Anticipated response · Click to repeat this trial"
                : times.length === 7
                  ? "Seven signals captured · Click to see results"
                  : phase === "trial"
                    ? "Click when you’re ready for the next trial."
                    : "Click this field or press Space to begin"}
        </p>
        {phase === "trial" && baseline > 0 && (
          <span className="ghost">
            PERSONAL MEDIAN · {Math.round(baseline)} ms
          </span>
        )}
      </button>
      <div className="trial-signals">
        {times.map((t, i) => (
          <span key={i}>
            <small>0{i + 1}</small>
            {Math.round(t)}
            <em>ms</em>
          </span>
        ))}
      </div>
      <span className="test-footnote">
        Responses below 80 ms are excluded as anticipation. Keep the same device
        for comparisons.
      </span>
    </div>
  );
}
function Memory({ onFinish, previous }: Props) {
  const [round, setRound] = useState(1),
    [level, setLevel] = useState(() => startingLevel("memory", previous)),
    [phase, setPhase] = useState<"show" | "recall" | "feedback">("show"),
    [pattern, setPattern] = useState<number[]>([]),
    [chosen, setChosen] = useState<number[]>([]),
    [reset, setReset] = useState(0);
  const records = useRef<
      {
        level: number;
        correct: number;
        incorrect: number;
        cells: number;
        size: number;
        time: number;
      }[]
    >([]),
    streak = useRef(0),
    locked = useRef(false),
    clock = useActiveClock();
  const config = memoryConfig(level),
    size = config.grid;
  useEffect(() => {
    const visibility = () => {
      if (!document.hidden && phase !== "feedback") setReset((x) => x + 1);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [phase]);
  useEffect(() => {
    setPattern(
      shuffled(Array.from({ length: size * size }, (_, i) => i)).slice(
        0,
        config.cells,
      ),
    );
    setChosen([]);
    setPhase("show");
    locked.current = false;
    const t = setTimeout(() => {
      setPhase("recall");
      clock.reset();
    }, config.exposure);
    return () => clearTimeout(t);
  }, [round, level, size, reset]);
  const submit = () => {
    if (locked.current || chosen.length !== config.cells) return;
    locked.current = true;
    const correct = chosen.filter((c) => pattern.includes(c)).length;
    records.current.push({
      level,
      correct,
      incorrect: chosen.length - correct,
      cells: config.cells,
      size,
      time: clock.read(),
    });
    setPhase("feedback");
  };
  const next = () => {
    const last = records.current.at(-1)!;
    streak.current = last.correct === last.cells ? streak.current + 1 : 0;
    const following = Math.max(
      1,
      Math.min(
        12,
        level +
          (last.correct === last.cells
            ? streak.current >= 2 && last.time < config.cells * 1600
              ? 2
              : 1
            : last.correct / last.cells >= 0.8
              ? 0
              : -1),
      ),
    );
    if (round === 8) {
      const r = records.current,
        correct = r.reduce((s, x) => s + x.correct, 0),
        total = r.reduce((s, x) => s + x.cells, 0),
        capacity = Math.max(
          0,
          ...r.filter((x) => x.correct === x.cells).map((x) => x.cells),
        );
      onFinish(
        makeResult(
          "memory",
          capacity,
          correct / total,
          mean(r.map((x) => x.time)),
          mean(r.map((x) => x.level)),
          {
            correctCells: correct,
            incorrectCells: r.reduce((s, x) => s + x.incorrect, 0),
            maxGrid: Math.max(...r.map((x) => x.size)),
            capacity,
            levels: r.map((x) => x.level),
            accuracies: r.map((x) => x.correct / x.cells),
            times: r.map((x) => x.time),
            nextLevel: following,
            exposure: config.exposure,
          },
        ),
      );
    } else {
      setLevel(following);
      setRound((r) => r + 1);
    }
  };
  return (
    <div className="experiment memory-experiment">
      <Trial n={round} total={8} label="ROUND" level={level} />
      <h1>
        {phase === "show"
          ? "Capture the pattern."
          : phase === "recall"
            ? "Reconstruct the signal."
            : chosen.every((c) => pattern.includes(c))
              ? "Pattern recovered."
              : "A new point of reference."}
      </h1>
      <p>
        {phase === "show"
          ? `${config.cells} cells · ${(config.exposure / 1000).toFixed(1)} seconds`
          : phase === "recall"
            ? `${chosen.length} / ${config.cells} cells selected · ${size} × ${size} grid`
            : `${records.current.at(-1)?.correct} of ${config.cells} cells recalled. Outlines show the original.`}
      </p>
      <div
        className="memory-grid"
        style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
      >
        {Array.from({ length: size * size }, (_, i) => (
          <button
            aria-label={`Cell ${Math.floor(i / size) + 1}, ${(i % size) + 1}`}
            aria-pressed={chosen.includes(i)}
            disabled={phase !== "recall"}
            key={i}
            className={
              ((phase === "show" && pattern.includes(i)) || chosen.includes(i)
                ? "lit "
                : "") +
              (phase === "feedback" && pattern.includes(i) ? "correct " : "") +
              (phase === "feedback" &&
              chosen.includes(i) &&
              !pattern.includes(i)
                ? "wrong"
                : "")
            }
            onClick={() =>
              setChosen((c) =>
                c.includes(i)
                  ? c.filter((x) => x !== i)
                  : c.length < config.cells
                    ? [...c, i]
                    : c,
              )
            }
          />
        ))}
      </div>
      <button
        className="primary"
        disabled={
          phase === "show" ||
          (phase === "recall" && chosen.length !== config.cells)
        }
        onClick={phase === "feedback" ? next : submit}
      >
        {phase === "feedback"
          ? round === 8
            ? "See results"
            : "Next pattern"
          : "Confirm pattern"}
      </button>
      <span className="test-footnote">
        Two precise, fluent rounds can move you up two levels.
      </span>
    </div>
  );
}
function MathTest({ onFinish, previous }: Props) {
  const [level, setLevel] = useState(() => startingLevel("math", previous)),
    [q, setQ] = useState(() => mathQuestion(level, 0)),
    [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState<boolean | null>(null),
    [round, setRound] = useState(1);
  const clock = useActiveClock(),
    records = useRef<Attempt[]>([]),
    locked = useRef(false);
  useLayoutEffect(() => {
    clock.reset();
  }, [round]);
  const submit = () => {
    if (locked.current) return;
    locked.current = true;
    const correct = Math.abs(Number(answer) - q.answer) <= q.tolerance;
    records.current.push({
      correct,
      time: clock.read(),
      level,
      target: q.target,
    });
    setFeedback(correct);
  };
  const next = () => {
    const r = records.current,
      l = nextLevel(level, r);
    if (round === 10) {
      const accuracy = r.filter((x) => x.correct).length / 10;
      const { averageDifficulty, ...metrics } = summariseAttempts(r);
      onFinish(
        makeResult(
          "math",
          accuracy * 100,
          accuracy,
          mean(r.map((x) => x.time)),
          averageDifficulty,
          { ...metrics, nextLevel: l },
        ),
      );
      return;
    }
    setLevel(l);
    setQ(mathQuestion(l, round));
    setRound((n) => n + 1);
    setAnswer("");
    setFeedback(null);
    locked.current = false;
  };
  return (
    <div className="experiment math-experiment">
      <Trial n={round} total={10} label="QUESTION" level={level} />
      <span className="problem-category">{q.family.replace("-", " ")}</span>
      <h1 className="equation">{q.text}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (feedback !== null) next();
          else if (answer.trim() !== "" && Number.isFinite(Number(answer)))
            submit();
        }}
      >
        <label htmlFor="answer">{q.hint}</label>
        <input
          key={round}
          id="answer"
          autoFocus
          autoComplete="off"
          inputMode="decimal"
          placeholder="Type your answer"
          value={answer}
          readOnly={feedback !== null}
          onChange={(e) => setAnswer(e.target.value)}
        />
        {feedback !== null && (
          <p role="status" className={feedback ? "success-text" : "error-text"}>
            {feedback ? "Correct." : `Answer: ${q.answer}.`}{" "}
            <span>
              {feedback
                ? nextLevel(level, records.current) > level
                  ? "Difficulty is moving up."
                  : "Accuracy recorded. Build fluency at this level."
                : "The next question will recalibrate."}
            </span>
          </p>
        )}
        <button
          className="primary"
          type="submit"
          disabled={
            feedback === null &&
            (answer.trim() === "" || !Number.isFinite(Number(answer)))
          }
        >
          {feedback !== null
            ? round === 10
              ? "See results"
              : "Next question"
            : "Submit answer"}
        </button>
      </form>
      <span className="test-footnote">
        Return ↵ to submit · No countdown · Speed matters only when you’re
        accurate
      </span>
    </div>
  );
}
function Spatial({ onFinish, previous }: Props) {
  const [level, setLevel] = useState(() => startingLevel("spatial", previous)),
    [q, setQ] = useState(() => spatial3Question(level)),
    [camera, setCamera] = useState(0),
    [round, setRound] = useState(1),
    [selected, setSelected] = useState<number | null>(null);
  const clock = useActiveClock(),
    records = useRef<Attempt[]>([]),
    locked = useRef(false);
  useLayoutEffect(() => {
    clock.reset();
  }, [round]);
  const answer = (i: number) => {
    if (locked.current) return;
    locked.current = true;
    setSelected(i);
    records.current.push({
      correct: i === q.correct,
      time: clock.read(),
      level,
      target: q.target,
    });
  };
  const next = () => {
    const r = records.current,
      l = nextLevel(level, r);
    if (round === 10) {
      const accuracy = r.filter((x) => x.correct).length / 10;
      const { averageDifficulty, ...metrics } = summariseAttempts(r);
      onFinish(
        makeResult(
          "spatial",
          accuracy * 100,
          accuracy,
          mean(r.map((x) => x.time)),
          averageDifficulty,
          { ...metrics, nextLevel: l },
        ),
      );
      return;
    }
    setLevel(l);
    setRound((n) => n + 1);
    setQ(spatial3Question(l));
    setSelected(null);
    locked.current = false;
  };
  return (
    <div className="experiment spatial-experiment">
      <Trial n={round} total={10} label="QUESTION" level={level} />
      <h1>Same structure. New perspective.</h1>
      <p>Rotate in all three dimensions. Reflections never count as a match.</p>
      <div className="spatial-stage">
        <div className="spatial-reference">
          <div className="reference-shape">
            <VoxelShape cells={transform(q.cells, [0, 5, 11, 17][camera])} />
            <span>REFERENCE / {q.cells.length} BLOCKS</span>
          </div>
          <button
            className="secondary"
            onClick={() => setCamera((n) => (n + 1) % 4)}
          >
            Change viewing angle · {camera + 1}/4
          </button>
          <p className="test-footnote">
            Inspect hidden blocks from four shared viewpoints. The object itself
            stays fixed.
          </p>
        </div>
        <div className="shape-options voxel-options" key={round}>
          {q.options.map((cells, i) => (
            <button
              key={i}
              aria-label={`Option ${i + 1}`}
              disabled={selected !== null}
              className={
                selected !== null
                  ? i === q.correct
                    ? "correct"
                    : i === selected
                      ? "wrong"
                      : ""
                  : ""
              }
              onClick={() => answer(i)}
            >
              <VoxelShape
                cells={transform(cells, [0, 5, 11, 17][camera])}
                angle={q.angle}
              />
              <span>{String.fromCharCode(65 + i)}</span>
            </button>
          ))}
        </div>
      </div>
      {selected !== null ? (
        <>
          <p
            role="status"
            className={selected === q.correct ? "success-text" : "error-text"}
          >
            {selected === q.correct
              ? "Structure preserved. A precise match."
              : "The outlined option preserves every block of the reference."}
          </p>
          <button className="primary" onClick={next}>
            {round === 10 ? "See results" : "Next shape"}
          </button>
        </>
      ) : (
        <span className="test-footnote">
          Every option has the same number of blocks. The arrangement makes the
          difference.
        </span>
      )}
    </div>
  );
}
