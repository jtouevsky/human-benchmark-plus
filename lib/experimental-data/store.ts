import {
  prior,
  update,
  estimate,
  Posterior,
  AbilityEstimate,
  MODEL_VERSION,
  AdaptiveSelectionResult,
} from "../measurement/model";
import { SpatialTask, createSpatialTask } from "../tasks/spatial";
export const STORAGE_KEY = "hb-measurement-spatial-v1";
export interface Observation {
  id: string;
  modelVersion: typeof MODEL_VERSION;
  sessionId: string;
  taskId: string;
  taskType: "spatial";
  timestamp: number;
  taskParameters: SpatialTask["parameters"];
  estimatedDifficulty: number;
  response: number;
  correct: boolean;
  responseTime: number;
  abilityBefore: AbilityEstimate;
  abilityAfter: AbilityEstimate;
  selectionMetadata: Omit<AdaptiveSelectionResult<SpatialTask>, "task">;
}
export function observe(
  p: Posterior,
  selection: AdaptiveSelectionResult<SpatialTask>,
  response: number,
  responseTime: number,
  sessionId: string,
): Observation {
  if (
    !Number.isInteger(response) ||
    response < 0 ||
    response >= selection.task.question.options.length ||
    !Number.isFinite(responseTime) ||
    responseTime < 0
  )
    throw Error("Invalid response");
  const { task, ...selectionMetadata } = selection;
  const result = update(p, task, response === task.question.correct);
  return {
    id: crypto.randomUUID(),
    modelVersion: MODEL_VERSION,
    sessionId,
    taskId: task.id,
    taskType: "spatial",
    timestamp: Date.now(),
    taskParameters: task.parameters,
    estimatedDifficulty: task.difficulty,
    response,
    correct: result.correct,
    responseTime,
    abilityBefore: estimate(p),
    abilityAfter: estimate(result.after),
    selectionMetadata,
  };
}
export function replay(events: Observation[]): Posterior {
  let p = prior();
  for (const event of events)
    p = update(
      p,
      {
        id: event.taskId,
        dimension: "spatial",
        difficulty: event.estimatedDifficulty,
        discrimination: 1,
        guessing: 1 / event.taskParameters.answerChoices,
      },
      event.correct,
    ).after;
  return p;
}
export function parseEvents(raw: string | null): Observation[] {
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 10000)
    throw Error("Invalid measurement archive");
  const ids = new Set<string>();
  let posterior = prior();
  for (const e of value) {
    const p = e?.taskParameters;
    if (
      e?.modelVersion !== MODEL_VERSION ||
      e.taskType !== "spatial" ||
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      typeof e.sessionId !== "string" ||
      !Number.isFinite(e.timestamp) ||
      !Number.isFinite(e.responseTime) ||
      e.responseTime < 0 ||
      !p ||
      !Number.isInteger(p.level) ||
      p.level < 1 ||
      p.level > 10 ||
      !Number.isInteger(p.seed) ||
      p.seed < 0 ||
      p.seed > 4294967295 ||
      !Number.isInteger(e.response)
    )
      throw Error("Unreadable measurement record");
    const task = createSpatialTask(p.level, p.seed);
    if (
      e.taskId !== task.id ||
      e.response < 0 ||
      e.response >= task.question.options.length ||
      e.correct !== (e.response === task.question.correct) ||
      e.estimatedDifficulty !== task.difficulty ||
      JSON.stringify(p) !== JSON.stringify(task.parameters)
    )
      throw Error("Measurement does not match its generated task");
    const selected = e.selectionMetadata;
    if (
      !selected ||
      typeof selected.reason !== "string" ||
      selected.reason.length > 2000 ||
      !Number.isFinite(selected.predictedCorrect) ||
      selected.predictedCorrect < 0 ||
      selected.predictedCorrect > 1 ||
      !Number.isFinite(selected.expectedEntropyReduction) ||
      selected.expectedEntropyReduction < 0 ||
      !Number.isFinite(selected.currentEstimate) ||
      !Number.isFinite(selected.uncertainty) ||
      !Number.isInteger(selected.candidateCount) ||
      selected.candidateCount < 1
    )
      throw Error("Invalid selection metadata");
    const next = update(posterior, task, e.correct);
    const validEstimate = (stored: AbilityEstimate, actual: AbilityEstimate) =>
      stored &&
      [
        "mean",
        "sd",
        "variance",
        "entropy",
        "boundaryMass",
        "observations",
      ].every(
        (k) =>
          Math.abs(
            Number(stored[k as keyof AbilityEstimate]) -
              Number(actual[k as keyof AbilityEstimate]),
          ) < 1e-8,
      ) &&
      Array.isArray(stored.interval) &&
      stored.interval.length === 2 &&
      stored.interval.every((x, i) => Math.abs(x - actual.interval[i]) < 1e-8);
    if (
      !validEstimate(e.abilityBefore, estimate(posterior)) ||
      !validEstimate(e.abilityAfter, estimate(next.after)) ||
      Math.abs(selected.predictedCorrect - next.predictedCorrect) > 1e-8
    )
      throw Error("Inconsistent posterior history");
    posterior = next.after;
    ids.add(e.id);
  }
  return value;
}
// No personal identifiers, network calls, or conversion of legacy/demo scores.
let cacheRaw: string | null | undefined,
  cacheEvents: Observation[] = [];
export function loadEvents() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cacheRaw) {
    cacheEvents = parseEvents(raw);
    cacheRaw = raw;
  }
  return cacheEvents;
}
export function appendEvent(event: Observation) {
  const existing = loadEvents();
  if (existing.length >= 10000)
    throw Error(
      "This archive has reached 10,000 trials. Export it before starting another archive.",
    );
  if (existing.some((e) => e.taskId === event.taskId))
    throw Error("This task is already recorded. Restart the experiment.");
  if (existing.length !== event.abilityBefore.observations)
    throw Error(
      "Measurements changed in another tab. Restart to use the latest posterior.",
    );
  const next = [...existing, event];
  const encoded = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, encoded);
  cacheRaw = encoded;
  cacheEvents = next;
  window.dispatchEvent(new Event("hb-measurement"));
  return next;
}
