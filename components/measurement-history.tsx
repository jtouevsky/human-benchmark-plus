"use client";
import { useState } from "react";
import { useMeasurement } from "./use-measurement";
export default function MeasurementHistory() {
  const state = useMeasurement(),
    [selected, setSelected] = useState<number | null>(null),
    events = state.events,
    e = events[selected ?? events.length - 1];
  const x = (i: number) => 30 + (i / Math.max(1, events.length - 1)) * 840,
    y = (v: number) => 150 - v * 20;
  const band =
    events
      .map((e, i) => `${i ? "L" : "M"}${x(i)},${y(e.abilityAfter.interval[1])}`)
      .join(" ") +
    [...events]
      .reverse()
      .map(
        (e, j) =>
          `L${x(events.length - 1 - j)},${y(e.abilityAfter.interval[0])}`,
      )
      .join(" ") +
    "Z";
  return (
    <section className="measurement-history">
      <span className="eyebrow">THE POSTERIOR / THROUGH TIME</span>
      <h1>
        Every answer
        <br />
        leaves a trace.
      </h1>
      {state.error && <p role="alert">{state.error}</p>}
      {events.length ? (
        <>
          <svg
            viewBox="0 0 900 300"
            role="img"
            aria-label="Spatial estimate over trials, shaded band shows 95 percent credible interval"
          >
            <line
              x1="30"
              x2="870"
              y1="150"
              y2="150"
              stroke="currentColor"
              opacity=".2"
            />
            <path d={band} fill="#819aff" opacity=".18" />
            <path
              d={events
                .map(
                  (e, i) => `${i ? "L" : "M"}${x(i)},${y(e.abilityAfter.mean)}`,
                )
                .join(" ")}
              fill="none"
              stroke="#adc4ff"
              strokeWidth="2"
            />
            {e && (
              <circle
                cx={x(selected ?? events.length - 1)}
                cy={y(e.abilityAfter.mean)}
                r="5"
                fill="#d8efff"
              />
            )}
            <text x="0" y="22" fill="currentColor" fontSize="10">
              +6 θ
            </text>
            <text x="0" y="290" fill="currentColor" fontSize="10">
              −6 θ
            </text>
          </svg>
          <label className="timeline-scrub">
            Inspect answer {(selected ?? events.length - 1) + 1} of{" "}
            {events.length}
            <input
              aria-label="Inspect trial history"
              type="range"
              min="0"
              max={events.length - 1}
              value={selected ?? events.length - 1}
              onChange={(ev) => setSelected(Number(ev.target.value))}
            />
          </label>
          <div className="history-evidence">
            <span>
              {e.correct ? "Correct" : "Incorrect"} · b{" "}
              {e.estimatedDifficulty.toFixed(2)}
            </span>
            <span>
              θ {e.abilityBefore.mean.toFixed(2)} →{" "}
              {e.abilityAfter.mean.toFixed(2)}
            </span>
            <span>
              SD {e.abilityBefore.sd.toFixed(2)} →{" "}
              {e.abilityAfter.sd.toFixed(2)}
            </span>
          </div>
          <p className="model-caption">
            Each point is a recorded trial. Band: equal-tail 95% credible
            interval. Legacy session history remains below.
          </p>
        </>
      ) : (
        <p>
          No Bayesian observations yet. Complete a spatial trial to begin this
          history.
        </p>
      )}
    </section>
  );
}
