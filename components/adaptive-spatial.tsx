"use client";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  prior,
  Posterior,
  update,
  estimate,
  AdaptiveSelectionResult,
} from "@/lib/measurement/model";
import { chooseSpatial, SpatialTask } from "@/lib/tasks/spatial";
import {
  loadEvents,
  appendEvent,
  observe,
  replay,
  Observation,
} from "@/lib/experimental-data/store";
import { TestResult, mean } from "@/lib/model";
import { transform } from "@/lib/spatial";
import VoxelShape from "./voxel-shape";
import {
  PosteriorView,
  EstimateStrip,
  ModelInspector,
} from "./measurement-panel";
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
export default function AdaptiveSpatial({
  onFinish,
}: {
  onFinish: (r: TestResult) => void;
}) {
  const [p, setP] = useState<Posterior>(prior),
    [before, setBefore] = useState<Posterior>(),
    [selection, setSelection] =
      useState<AdaptiveSelectionResult<SpatialTask>>(),
    [next, setNext] = useState<AdaptiveSelectionResult<SpatialTask>>(),
    [events, setEvents] = useState<Observation[]>([]),
    [selected, setSelected] = useState<number | null>(null),
    [round, setRound] = useState(1),
    [camera, setCamera] = useState(0),
    [error, setError] = useState("");
  const session = useRef(""),
    records = useRef<Observation[]>([]),
    locked = useRef(false),
    start = useRef(0),
    hidden = useRef<number | null>(null),
    paused = useRef(0);
  useEffect(() => {
    try {
      session.current = crypto.randomUUID();
      const old = loadEvents(),
        posterior = replay(old);
      setEvents(old);
      setP(posterior);
      setBefore(old.length ? replay(old.slice(0, -1)) : undefined);
      setSelection(
        chooseSpatial(
          posterior,
          seed(),
          old.map((e) => e.taskId),
        ),
      );
    } catch {
      setError(
        "Measurements could not be loaded. Your existing archive is preserved. Return to the model inspector before continuing.",
      );
    }
  }, []);
  useLayoutEffect(() => {
    start.current = performance.now();
    paused.current = 0;
    hidden.current = document.hidden ? performance.now() : null;
  }, [selection]);
  useEffect(() => {
    const change = () => {
      if (document.hidden) hidden.current = performance.now();
      else if (hidden.current !== null) {
        paused.current += performance.now() - hidden.current;
        hidden.current = null;
      }
    };
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    if (selected !== null)
      document
        .querySelector(".adaptive-spatial .evidence-feedback")
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
  }, [selected]);
  const answer = (response: number) => {
    if (locked.current || !selection) return;
    locked.current = true;
    try {
      const event = observe(
        p,
        selection,
        response,
        Math.max(
          0,
          (hidden.current ?? performance.now()) -
            start.current -
            paused.current,
        ),
        session.current,
      );
      const all = appendEvent(event),
        after = update(p, selection.task, event.correct).after;
      records.current.push(event);
      setEvents(all);
      setBefore(p);
      setP(after);
      setSelected(response);
      setError("");
      setNext(
        chooseSpatial(
          after,
          seed(),
          all.map((e) => e.taskId),
        ),
      );
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Unable to save"} No trial was advanced. Your data has not been cleared.`,
      );
      locked.current = false;
    }
  };
  const advance = () => {
    if (round === 10) {
      const r = records.current,
        e = estimate(p),
        accuracy = r.filter((x) => x.correct).length / r.length;
      onFinish({
        id: crypto.randomUUID(),
        testType: "spatial",
        protocolVersion: 4,
        timestamp: Date.now(),
        sessionId: session.current,
        rawScore: accuracy * 100,
        accuracy,
        responseTime: mean(r.map((x) => x.responseTime)),
        difficulty: mean(r.map((x) => x.taskParameters.level)),
        normalizedScore: 0,
        percentile: 0,
        metadata: {
          theta: e.mean,
          sd: e.sd,
          credibleInterval: e.interval,
          observations: e.observations,
          trials: r.map((x) => x.responseTime),
          measurementVersion: 1,
        },
      });
      return;
    }
    setSelection(next);
    setNext(undefined);
    setSelected(null);
    setCamera(0);
    setRound((x) => x + 1);
    locked.current = false;
    document
      .querySelector(".test-overlay")
      ?.scrollTo({ top: 0, behavior: "instant" });
  };
  if (!selection)
    return (
      <div className="experiment">
        <h1>Preparing the next question.</h1>
        <p role="status">{error || "Evaluating candidate information…"}</p>
      </div>
    );
  const task = selection.task,
    q = task.question;
  return (
    <div className="experiment adaptive-spatial" data-task-id={task.id}>
      <div className="trial-instrument">
        <span>SPATIAL / {String(round).padStart(2, "0")} OF 10</span>
        <div>
          <i style={{ width: `${round * 10}%` }} />
        </div>
        <span>b {task.difficulty.toFixed(2)}</span>
      </div>
      <h1>
        Rotate the object.
        <br />
        <em>Revise the belief.</em>
      </h1>
      <p>
        Find the same structure. Reflections do not count. Each answer updates
        the spatial model.
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="spatial-stage">
        <div className="spatial-reference">
          <div className="reference-shape">
            <VoxelShape cells={transform(q.cells, [0, 5, 11, 17][camera])} />
            <span>REFERENCE / {q.cells.length} BLOCKS</span>
          </div>
          <button
            className="secondary"
            onClick={() => setCamera((x) => (x + 1) % 4)}
          >
            Change viewing angle · {camera + 1}/4
          </button>
        </div>
        <div className="shape-options voxel-options">
          {q.options.map((cells, i) => (
            <button
              key={`${task.id}-${i}`}
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
      {selected !== null && (
        <div className="evidence-feedback" role="status">
          <p>
            {selected === q.correct ? "Correct." : "Incorrect."} The posterior
            now includes this answer. Latency is recorded, not used as an
            ability score.
          </p>
          <button className="primary instrument-button" onClick={advance}>
            {round === 10 ? "Finish & inspect results" : "Next selected shape"}{" "}
            ↗
          </button>
        </div>
      )}
      <details className="advanced-analysis">
        <summary>
          Advanced analysis <span>Spatial model & uncertainty ↗</span>
        </summary>
        <EstimateStrip posterior={p} />
        <PosteriorView posterior={p} previous={before} />
        <ModelInspector
          posterior={p}
          previous={before}
          events={events}
          next={next ?? selection}
        />
        <p className="model-caption">
          Model v1 · heuristic difficulty · no population percentiles.
          Uncertainty can widen after surprising evidence; it is not forced to
          shrink.
        </p>
      </details>
    </div>
  );
}
