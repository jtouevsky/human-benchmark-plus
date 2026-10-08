"use client";
import { useClientReducedMotion as useReducedMotion } from "./use-client-reduced-motion";
import { useMemo, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  GRID,
  STEP,
  Posterior,
  estimate,
  prior,
  DIMENSIONS,
  AdaptiveSelectionResult,
} from "@/lib/measurement/model";
import { SpatialTask, chooseSpatial } from "@/lib/tasks/spatial";
import { Observation, replay } from "@/lib/experimental-data/store";
import { useMeasurement } from "./use-measurement";
const Scene = dynamic(() => import("./posterior-scene"), {
  ssr: false,
  loading: () => (
    <div className="distribution-loading">
      <i />
      Assembling density surface
    </div>
  ),
});
export function PosteriorView({
  posterior,
  previous,
  dimensions = false,
}: {
  posterior: Posterior;
  previous?: Posterior;
  dimensions?: boolean;
}) {
  const e = useMemo(() => estimate(posterior), [posterior]),
    [focus, setFocus] = useState(0),
    [seen, setSeen] = useState(false),
    host = useRef<HTMLDivElement>(null),
    reduced = useReducedMotion();
  useEffect(() => {
    const o = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          o.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    if (host.current) o.observe(host.current);
    return () => o.disconnect();
  }, []);
  const top = Math.max(...posterior.mass, ...(previous?.mass ?? [])) / STEP;
  const path = (p: Posterior) =>
    p.mass
      .map(
        (w, i) =>
          `${i ? "L" : "M"}${((i / (GRID.length - 1)) * 600).toFixed(2)},${(105 - (w / STEP / top) * 90).toFixed(2)}`,
      )
      .join(" ");
  const density =
    posterior.mass[Math.max(0, Math.min(240, Math.round((focus + 6) / STEP)))] /
    STEP;
  return (
    <div className="posterior-view" ref={host}>
      <div className="instrument-label">
        <span>SPATIAL / POSTERIOR DENSITY</span>
        <span>
          {e.observations === 0
            ? "PRIOR · NO EVIDENCE"
            : `${e.observations} OBSERVATIONS`}
        </span>
      </div>
      {seen && (
        <Scene
          posterior={posterior}
          previous={previous}
          focus={focus}
          dimensions={dimensions}
        />
      )}
      <div className="density-axis">
        <span>−6 θ</span>
        <span>drag to orbit · arrows to inspect</span>
        <span>+6 θ</span>
      </div>
      <svg
        className="density-trace"
        viewBox="0 0 600 112"
        role="img"
        aria-label={`Posterior density, mean ${e.mean.toFixed(2)}, 95 percent credible interval ${e.interval.map((x) => x.toFixed(2)).join(" to ")}`}
      >
        <rect
          x={(e.interval[0] + 6) * 50}
          y="0"
          width={(e.interval[1] - e.interval[0]) * 50}
          height="105"
          fill="currentColor"
          opacity=".07"
        />
        {previous && (
          <path
            d={path(previous)}
            fill="none"
            stroke="#b9a2f2"
            strokeDasharray="4 4"
          />
        )}
        <motion.path
          initial={false}
          animate={{ d: path(posterior) }}
          transition={{ duration: reduced ? 0 : 0.8 }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1={(focus + 6) * 50}
          x2={(focus + 6) * 50}
          y1="0"
          y2="108"
          stroke="currentColor"
          opacity=".5"
        />
      </svg>
      <label className="density-scrub">
        Inspect θ {focus.toFixed(2)} <span>density {density.toFixed(3)}</span>
        <input
          aria-label="Inspect latent ability"
          type="range"
          min="-6"
          max="6"
          step=".05"
          value={focus}
          onChange={(ev) => setFocus(Number(ev.target.value))}
        />
      </label>
      {dimensions && (
        <p className="model-caption">
          Six ribbons, back to front: spatial (blue), memory, numerical,
          processing speed, probability, attention. Pale ribbons are unmeasured
          priors; separation does not imply correlations.
        </p>
      )}
      <p className="model-caption">
        Blue: current belief · violet: before this answer. Height is probability
        density; each ribbon has constant extruded depth. Vertical scale adjusts
        to fit.
      </p>
    </div>
  );
}
export function EstimateStrip({ posterior }: { posterior: Posterior }) {
  const e = estimate(posterior);
  return (
    <div className="estimate-strip" aria-live="polite">
      <div>
        <small>ESTIMATED θ</small>
        <b>{e.mean.toFixed(2)}</b>
      </div>
      <div>
        <small>UNCERTAINTY / SD</small>
        <b>±{e.sd.toFixed(2)}</b>
      </div>
      <div>
        <small>95% CREDIBLE INTERVAL</small>
        <b>
          {e.interval[0].toFixed(2)} … {e.interval[1].toFixed(2)}
        </b>
      </div>
      <div>
        <small>OBSERVATIONS</small>
        <b>{e.observations}</b>
      </div>
      {e.boundaryMass > 0.02 && (
        <p>
          Estimate is approaching the grid boundary. Interpret with caution.
        </p>
      )}
    </div>
  );
}
export function ModelInspector({
  posterior,
  previous,
  events = [],
  next,
}: {
  posterior: Posterior;
  previous?: Posterior;
  events?: Observation[];
  next?: AdaptiveSelectionResult<SpatialTask>;
}) {
  const e = estimate(posterior),
    last = events.at(-1),
    before = estimate(previous ?? prior());
  return (
    <details className="model-inspector">
      <summary>
        Open model inspector <span>MODEL / 01 ↗</span>
      </summary>
      <div className="inspector-grid">
        <section>
          <h3>Current posterior</h3>
          <p>
            θ {e.mean.toFixed(3)} · SD {e.sd.toFixed(3)}
          </p>
          <p>95% interval [{e.interval.map((x) => x.toFixed(2)).join(", ")}]</p>
          <p>
            {e.observations} observations · entropy {e.entropy.toFixed(3)} nats
          </p>
        </section>
        <section>
          <h3>Last observation</h3>
          {last ? (
            <>
              <p>
                b {last.estimatedDifficulty.toFixed(3)} · predicted P(correct){" "}
                {last.selectionMetadata.predictedCorrect.toFixed(3)}
              </p>
              <p>
                {last.correct ? "Correct" : "Incorrect"} ·{" "}
                {(last.responseTime / 1000).toFixed(2)} active seconds
              </p>
              <p>
                θ {before.mean.toFixed(3)} → {e.mean.toFixed(3)}
              </p>
              <p>
                SD {before.sd.toFixed(3)} → {e.sd.toFixed(3)}
              </p>
            </>
          ) : (
            <p>No answers recorded. Showing the initial prior.</p>
          )}
        </section>
        <section>
          <h3>Selected task</h3>
          {next ? (
            <>
              <p>
                b {next.task.difficulty.toFixed(3)} · P(correct){" "}
                {next.predictedCorrect.toFixed(3)}
              </p>
              <p>
                Expected entropy reduction{" "}
                {next.expectedEntropyReduction.toFixed(5)} nats
              </p>
              <p>{next.reason}</p>
              <p>
                {next.task.parameters.objectComplexity} blocks ·{" "}
                {next.task.parameters.rotationMagnitude.toFixed(0)}° ·{" "}
                {next.task.parameters.answerChoices} choices
              </p>
            </>
          ) : (
            <p>Selection runs when you start a spatial experiment.</p>
          )}
        </section>
      </div>
    </details>
  );
}
export function MeasurementProfile({ start }: { start?: () => void }) {
  const state = useMeasurement(),
    [index, setIndex] = useState<number | null>(null);
  const slice = index === null ? state.events : state.events.slice(0, index),
    p = useMemo(() => replay(slice), [slice]);
  const before = useMemo(
    () => (slice.length ? replay(slice.slice(0, -1)) : undefined),
    [slice],
  );
  const preview = useMemo(
    () =>
      state.ready && !state.error
        ? chooseSpatial(
            p,
            920401,
            state.events.map((x) => x.taskId),
          )
        : undefined,
    [p, state.ready, state.error, state.events],
  );
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { model: "spatial-grid-v1", observations: state.events },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "spatial-observations.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="measurement-profile">
      <div className="measurement-heading">
        <div>
          <span className="eyebrow">MEASUREMENT ENGINE / EXPERIMENTAL</span>
          <h1>
            A belief.
            <br />
            <em>Under revision.</em>
          </h1>
          <p>
            Six dimensions. One connected to a response model. Uncertainty is
            part of the result.
          </p>
        </div>
        {start && (
          <button className="primary instrument-button" onClick={start}>
            Collect spatial evidence ↗
          </button>
        )}
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      <EstimateStrip posterior={p} />
      <PosteriorView posterior={p} previous={before} dimensions />
      <div className="dimension-priors">
        {DIMENSIONS.map((d) => (
          <div key={d}>
            <span>{d.replace("processingSpeed", "processing speed")}</span>
            <b>
              {d === "spatial" && p.observations
                ? estimate(p).mean.toFixed(2)
                : "Unmeasured"}
            </b>
            <small>
              {d === "spatial"
                ? `${p.observations} trials · live posterior`
                : "Prior N(0, 1.5²) · no model-linked trials"}
            </small>
          </div>
        ))}
      </div>
      <label className="timeline-scrub">
        Replay model history · {slice.length} / {state.events.length} answers
        <input
          type="range"
          aria-label="Replay model history"
          min="0"
          max={state.events.length}
          value={slice.length}
          onChange={(ev) => setIndex(Number(ev.target.value))}
        />
      </label>
      <button className="secondary" onClick={() => setIndex(null)}>
        Return to latest
      </button>{" "}
      <button
        className="secondary"
        onClick={download}
        disabled={!state.events.length}
      >
        Export trial data
      </button>
      <ModelInspector
        posterior={p}
        previous={before}
        events={slice}
        next={preview}
      />
      <p className="model-caption">
        Next selection above is a preview pool. Actual trials generate a fresh
        pool. Task difficulty is a heuristic, not population calibrated. Legacy
        and demo results never update this model.
      </p>
    </section>
  );
}
