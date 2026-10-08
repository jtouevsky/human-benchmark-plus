/** A finite-grid Bayesian response model. Grid weights are probability MASS,
 * not density; density = mass / STEP. No population calibration is implied. */
export const MODEL_VERSION = "spatial-grid-v1";
export const DIMENSIONS = [
  "spatial",
  "memory",
  "numerical",
  "processingSpeed",
  "probability",
  "attention",
] as const;
export type CognitiveDimension = (typeof DIMENSIONS)[number];
export const STEP = 0.05;
export const GRID = Array.from({ length: 241 }, (_, i) => -6 + i * STEP);
export interface Posterior {
  mass: number[];
  observations: number;
}
export interface AbilityEstimate {
  mean: number;
  variance: number;
  sd: number;
  interval: [number, number];
  observations: number;
  entropy: number;
  boundaryMass: number;
}
export interface TaskDefinition {
  id: string;
  dimension: CognitiveDimension;
  difficulty: number;
  discrimination: number;
  guessing: number;
}
export interface PosteriorUpdate {
  before: Posterior;
  after: Posterior;
  predictedCorrect: number;
  correct: boolean;
}
export function prior(): Posterior {
  const weights = GRID.map((x) => Math.exp(-0.5 * (x / 1.5) ** 2));
  const total = weights.reduce((a, b) => a + b, 0);
  return { mass: weights.map((x) => x / total), observations: 0 };
}
export function validatePosterior(p: Posterior) {
  if (
    p.mass.length !== GRID.length ||
    !Number.isSafeInteger(p.observations) ||
    p.observations < 0 ||
    p.mass.some((x) => !Number.isFinite(x) || x < 0) ||
    Math.abs(p.mass.reduce((a, b) => a + b, 0) - 1) > 1e-8
  )
    throw Error("Invalid posterior");
}
export function validateTask(t: TaskDefinition) {
  if (
    !Number.isFinite(t.difficulty) ||
    !Number.isFinite(t.discrimination) ||
    t.discrimination <= 0 ||
    t.discrimination > 5 ||
    !Number.isFinite(t.guessing) ||
    t.guessing < 0 ||
    t.guessing >= 1
  )
    throw Error("Invalid task parameters");
}
export function likelihood(theta: number, t: TaskDefinition) {
  // Rasch when a=1,c=0. Spatial uses c=1/choices to model chance guessing.
  const z = t.discrimination * (theta - t.difficulty);
  const logistic =
    z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  return Math.max(
    1e-12,
    Math.min(1 - 1e-12, t.guessing + (1 - t.guessing) * logistic),
  );
}
export const entropy = (mass: number[]) =>
  -mass.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
export function estimate(p: Posterior): AbilityEstimate {
  validatePosterior(p);
  const rawMean = p.mass.reduce((s, w, i) => s + w * GRID[i], 0);
  const mean = Math.abs(rawMean) < 1e-12 ? 0 : rawMean;
  const variance = p.mass.reduce((s, w, i) => s + w * (GRID[i] - mean) ** 2, 0);
  const quantile = (q: number) => {
    let sum = 0;
    for (let i = 0; i < GRID.length; i++) {
      sum += p.mass[i];
      if (sum >= q) return GRID[i];
    }
    return GRID.at(-1)!;
  };
  return {
    mean,
    variance,
    sd: Math.sqrt(variance),
    interval: [quantile(0.025), quantile(0.975)],
    observations: p.observations,
    entropy: entropy(p.mass),
    boundaryMass: p.mass
      .slice(0, 4)
      .concat(p.mass.slice(-4))
      .reduce((a, b) => a + b, 0),
  };
}
export function update(
  p: Posterior,
  t: TaskDefinition,
  correct: boolean,
): PosteriorUpdate {
  validatePosterior(p);
  validateTask(t);
  if (typeof correct !== "boolean") throw Error("Outcome must be boolean");
  const probabilities = GRID.map((x) => likelihood(x, t));
  const predictedCorrect = p.mass.reduce(
    (s, w, i) => s + w * probabilities[i],
    0,
  );
  // Log-space multiplication prevents underflow through long trial sequences.
  const log = p.mass.map(
    (w, i) =>
      Math.log(w) + Math.log(correct ? probabilities[i] : 1 - probabilities[i]),
  );
  const max = Math.max(...log),
    weights = log.map((x) => Math.exp(x - max)),
    sum = weights.reduce((a, b) => a + b, 0);
  return {
    before: p,
    after: {
      mass: weights.map((x) => x / sum),
      observations: p.observations + 1,
    },
    predictedCorrect,
    correct,
  };
}
export function information(p: Posterior, t: TaskDefinition) {
  const yes = update(p, t, true),
    no = update(p, t, false),
    q = yes.predictedCorrect;
  // I(theta;Y) = H(theta) - E_Y H(theta|Y), in nats, exact on this grid.
  return {
    predictedCorrect: q,
    expectedEntropyReduction: Math.max(
      0,
      entropy(p.mass) -
        q * entropy(yes.after.mass) -
        (1 - q) * entropy(no.after.mass),
    ),
  };
}
export interface AdaptiveSelectionResult<
  T extends TaskDefinition = TaskDefinition,
> {
  task: T;
  predictedCorrect: number;
  expectedEntropyReduction: number;
  currentEstimate: number;
  uncertainty: number;
  candidateCount: number;
  reason: string;
}
export function selectTask<T extends TaskDefinition>(
  p: Posterior,
  candidates: T[],
  previous: string[] = [],
): AdaptiveSelectionResult<T> {
  const fresh = candidates.filter((t) => !previous.includes(t.id));
  if (!fresh.length) throw Error("No unseen candidate tasks");
  const ranked = fresh
    .map((task) => ({ task, ...information(p, task) }))
    .sort(
      (a, b) =>
        b.expectedEntropyReduction - a.expectedEntropyReduction ||
        a.task.id.localeCompare(b.task.id),
    );
  const best = ranked[0],
    e = estimate(p);
  return {
    ...best,
    currentEstimate: e.mean,
    uncertainty: e.sd,
    candidateCount: fresh.length,
    reason: `Largest expected entropy reduction among ${fresh.length} unseen candidates; integrates over the full posterior, including uncertainty.`,
  };
}
