"use client";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { useRef, useState } from "react";
import { TestResult, tests, recentFor, mean, sd } from "@/lib/model";
export function FieldSystem() {
  const ref = useRef<HTMLDivElement>(null),
    x = useMotionValue(0),
    y = useMotionValue(0),
    sx = useSpring(x, { stiffness: 70, damping: 22 }),
    sy = useSpring(y, { stiffness: 70, damping: 22 }),
    rx = useTransform(sy, [-1, 1], [9, -9]),
    ry = useTransform(sx, [-1, 1], [-12, 12]),
    reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className="field-system"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const b = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - b.left) / b.width) * 2 - 1);
        y.set(((e.clientY - b.top) / b.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.div className="field-object" style={{ rotateX: rx, rotateY: ry }}>
        <svg viewBox="0 0 700 520" aria-hidden="true">
          <defs>
            <radialGradient id="field-core">
              <stop stopColor="#a6d5f9" stopOpacity=".3" />
              <stop offset=".4" stopColor="#6388bc" stopOpacity=".09" />
              <stop offset="1" stopColor="#6388bc" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="field-edge">
              <stop stopColor="#ceeaff" />
              <stop offset=".5" stopColor="#596688" />
              <stop offset="1" stopColor="#ceeaff" stopOpacity=".1" />
            </linearGradient>
          </defs>
          <circle cx="350" cy="260" r="245" fill="url(#field-core)" />
          <g className="orbital-lines" fill="none" stroke="url(#field-edge)">
            {[0, 30, 60, 90, 120, 150].map((a) => (
              <ellipse
                key={a}
                cx="350"
                cy="260"
                rx="216"
                ry="80"
                transform={`rotate(${a} 350 260)`}
              />
            ))}
            <circle cx="350" cy="260" r="216" strokeDasharray="2 12" />
            <circle cx="350" cy="260" r="240" strokeOpacity=".2" />
          </g>
          <g className="orbital-satellite">
            <circle cx="350" cy="44" r="5" fill="#dcf2ff" />
            <circle
              cx="350"
              cy="44"
              r="13"
              fill="none"
              stroke="#b5dcff"
              strokeOpacity=".25"
            />
          </g>
          <g stroke="#b6d7f1" fill="none" strokeWidth=".8">
            <path d="M350 156 440 208 440 312 350 364 260 312 260 208Z M350 156V260L440 312 M350 260 260 312 M260 208 350 260 440 208" />
            <path
              d="M350 195 406 228 406 292 350 325 294 292 294 228Z"
              strokeOpacity=".3"
            />
          </g>
          <circle cx="350" cy="260" r="7" fill="#e4f6ff" />
        </svg>
        <span className="field-coordinate coordinate-a">
          PERCEPTION
          <br />
          <b>01 / INPUT</b>
        </span>
        <span className="field-coordinate coordinate-b">
          COGNITION
          <br />
          <b>02 / PROCESS</b>
        </span>
        <span className="field-coordinate coordinate-c">
          RESPONSE
          <br />
          <b>03 / SIGNAL</b>
        </span>
      </motion.div>
      <div className="field-caption">
        <span>HUMAN SYSTEM / EXPLORER 03</span>
        <span>MOVE TO EXPLORE ↗</span>
      </div>
    </div>
  );
}
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null),
    reduced = useReducedMotion(),
    { scrollYProgress } = useScroll({
      target: ref,
      offset: ["start end", "end start"],
    }),
    y = useTransform(scrollYProgress, [0, 1], [16, -16]);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y: reduced ? 0 : y }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65 }}
    >
      {children}
    </motion.div>
  );
}
export function Progression({
  results,
  onStart,
}: {
  results: TestResult[];
  onStart?: () => void;
}) {
  const [selected, setSelected] = useState(0),
    groups = tests.map((t) => recentFor(results, t.id)),
    counts = groups.map((g) => g.length),
    covered = counts.filter((n) => n > 0).length,
    days = new Set(
      results.map((r) => new Date(r.timestamp).toLocaleDateString()),
    ).size,
    g = groups[selected],
    last = g.at(-1),
    previous = g.slice(0, -1).slice(-5),
    delta =
      last && previous.length
        ? last.rawScore - mean(previous.map((r) => r.rawScore))
        : null;
  const milestones = [
    ["First signal", results.length > 0],
    ["Four dimensions", covered === 4],
    ["Three separate days", days >= 3],
    ["Eight per dimension", counts.every((n) => n >= 8)],
  ] as const;
  return (
    <Reveal className="progression">
      <div className="progression-heading">
        <div className="eyebrow">YOUR SIGNAL, OVER TIME</div>
        <h2>
          {covered === 4
            ? "More observations. More definition."
            : "Build your first constellation."}
        </h2>
        <p>
          {covered} of 4 dimensions explored · {days} active{" "}
          {days === 1 ? "day" : "days"} · {results.length} observations
        </p>
      </div>
      <div className="milestone-track">
        {milestones.map(([label, done], i) => (
          <div key={label} className={done ? "achieved" : ""}>
            <span>{done ? "✓" : `0${i + 1}`}</span>
            <b>{label}</b>
            <i />
          </div>
        ))}
      </div>
      <div className="signal-inspector">
        <div
          className="inspector-tabs"
          role="tablist"
          aria-label="Inspect task progress"
        >
          {tests.map((t, i) => (
            <button
              role="tab"
              aria-selected={selected === i}
              aria-controls="signal-detail"
              key={t.id}
              onClick={() => setSelected(i)}
            >
              {t.name}
              <span>{counts[i]}</span>
            </button>
          ))}
        </div>
        <motion.div
          role="tabpanel"
          id="signal-detail"
          aria-label={tests[selected].name}
          key={selected}
          className="inspector-detail"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <span className="eyebrow">LATEST OBSERVATION</span>
            <strong>
              {last ? Math.round(last.rawScore) : "—"}
              <small>{tests[selected].unit}</small>
            </strong>
          </div>
          <div>
            <span className="eyebrow">WHAT CHANGED</span>
            <p>
              {delta !== null
                ? `${Math.abs(delta).toFixed(1)} ${tests[selected].unit} ${delta < 0 ? "lower" : delta > 0 ? "higher" : "unchanged"} versus your previous ${previous.length} observations.`
                : "A second observation starts the comparison."}
              <small>
                {selected === 0
                  ? "Lower is faster."
                  : "Read accuracy alongside adaptive difficulty."}
              </small>
            </p>
          </div>
          <div>
            <span className="eyebrow">REPEATABILITY</span>
            <p>
              {g.length >= 3
                ? `±${sd(g.slice(-8).map((r) => r.rawScore)).toFixed(1)} ${tests[selected].unit}`
                : "Collect 3 observations"}
              <small>
                {g.length >= 3
                  ? "Standard deviation of up to 8 recent results."
                  : "Same-protocol results only."}
              </small>
            </p>
          </div>
        </motion.div>
      </div>
      {onStart && (
        <button className="text-button" onClick={onStart}>
          Add another perspective ↗
        </button>
      )}
    </Reveal>
  );
}
