require("../scripts/register-typescript.cjs");
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  prior,
  GRID,
  estimate,
  update,
  information,
  selectTask,
  likelihood,
} = require("../lib/measurement/model.ts");
const { createSpatialTask, chooseSpatial } = require("../lib/tasks/spatial.ts");
const {
  observe,
  replay,
  parseEvents,
} = require("../lib/experimental-data/store.ts");
const { simulate } = require("../lib/measurement/simulate.ts");
const task = (b, id = "t") => ({
  id,
  dimension: "spatial",
  difficulty: b,
  discrimination: 1,
  guessing: 0,
});
test("prior is normalized, symmetric, with a 95% equal-tail interval", () => {
  const p = prior(),
    e = estimate(p);
  assert(Math.abs(p.mass.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert(Math.abs(e.mean) < 1e-12);
  assert(Math.abs(e.sd - 1.5) < 0.005);
  assert(Math.abs(e.interval[0] + e.interval[1]) < 1e-12);
});
test("difficult correct and easy incorrect answers move theta in the right direction", () => {
  assert(estimate(update(prior(), task(2), true).after).mean > 0.5);
  assert(estimate(update(prior(), task(-2), false).after).mean < -0.5);
});
test("easy correct answer has little effect on a high ability posterior", () => {
  let p = prior();
  for (let i = 0; i < 25; i++) p = update(p, task(2), true).after;
  const e = estimate(p),
    after = estimate(update(p, task(-3), true).after);
  assert(after.mean - e.mean < 0.01);
});
test("repeated boundary evidence narrows uncertainty", () => {
  let p = prior();
  for (let i = 0; i < 80; i++) p = update(p, task(0), i % 2 === 0).after;
  assert(estimate(p).sd < 0.3);
});
test("exact information equals mutual information from binary entropy", () => {
  const p = prior(),
    t = task(0.7),
    result = information(p, t),
    h = (q) => -q * Math.log(q) - (1 - q) * Math.log(1 - q);
  const independent =
    h(result.predictedCorrect) -
    p.mass.reduce((s, w, i) => s + w * h(likelihood(GRID[i], t)), 0);
  assert(Math.abs(result.expectedEntropyReduction - independent) < 1e-12);
});
test("selector favors informative candidates and excludes repeats", () => {
  const pool = [task(-5, "easy"), task(0, "middle"), task(5, "hard")];
  assert.equal(selectTask(prior(), pool).task.id, "middle");
  assert.notEqual(selectTask(prior(), pool, ["middle"]).task.id, "middle");
  assert.throws(() =>
    selectTask(
      prior(),
      pool,
      pool.map((x) => x.id),
    ),
  );
});
test("all-correct, all-wrong and alternating sequences remain finite", () => {
  for (const mode of [0, 1, 2]) {
    let p = prior();
    for (let i = 0; i < 1000; i++)
      p = update(
        p,
        task(mode === 0 ? 4 : -4),
        mode === 0 || (mode === 2 && i % 2 === 0),
      ).after;
    const e = estimate(p);
    assert(Number.isFinite(e.mean) && Number.isFinite(e.entropy));
    assert(Math.abs(p.mass.reduce((a, b) => a + b, 0) - 1) < 1e-10);
  }
});
test("invalid tasks and posteriors fail explicitly", () => {
  assert.throws(() => update(prior(), task(NaN), true));
  assert.throws(() => update({ ...prior(), mass: [NaN] }, task(0), true));
  assert.throws(() => update(prior(), { ...task(0), guessing: 1 }, true));
});
test("spatial metadata is reproducible and uses actual generated geometry", () => {
  for (let level = 1; level <= 10; level++) {
    const a = createSpatialTask(level, 811 + level),
      b = createSpatialTask(level, 811 + level);
    assert.deepEqual(a, b);
    assert.equal(a.parameters.objectComplexity, a.question.cells.length);
    assert.equal(a.parameters.answerChoices, a.question.options.length);
    assert(
      a.parameters.rotationMagnitude >= 0 &&
        a.parameters.rotationMagnitude <= 180,
    );
    assert(a.parameters.distractorSimilarity <= 1);
    assert(Number.isFinite(a.difficulty));
  }
});
test("telemetry replays exactly, validates generated outcomes, and preserves schema failures", () => {
  const p = prior(),
    selection = chooseSpatial(p, 314),
    e = observe(
      p,
      selection,
      selection.task.question.correct,
      1532,
      "test-session",
    );
  assert.equal(e.correct, true);
  const parsed = parseEvents(JSON.stringify([e]));
  assert.deepEqual(replay(parsed), update(p, selection.task, true).after);
  assert.throws(() => parseEvents(JSON.stringify([{ ...e, correct: false }])));
  assert.throws(() => parseEvents(JSON.stringify([e, e])));
  assert.throws(() => parseEvents("bad-json"));
});
test("synthetic users converge under the assumed likelihood", () => {
  const results = [-2, -1, 0, 1, 2].flatMap((theta) =>
    [12, 98, 204].map((seed) => simulate(theta, seed)),
  );
  const mae =
    results.reduce((s, x) => s + Math.abs(x.error), 0) / results.length;
  assert(mae < 0.5, `MAE ${mae}`);
  assert(results.every((x) => x.sd < 0.4));
  console.log(
    `Synthetic recovery: ${results.length} users × 120 trials; MAE ${mae.toFixed(3)} theta`,
  );
});
test("spatial candidate selection searches upward after successes and downward after errors", () => {
  const bank = Array.from({ length: 10 }, (_, i) =>
    createSpatialTask(i + 1, 400 + i),
  );
  const first = selectTask(prior(), bank).task.difficulty;
  let high = prior(),
    low = prior();
  for (let i = 0; i < 30; i++) {
    const h = selectTask(high, bank),
      l = selectTask(low, bank);
    high = update(high, h.task, true).after;
    low = update(low, l.task, false).after;
  }
  assert(selectTask(high, bank).task.difficulty > first);
  assert(selectTask(low, bank).task.difficulty <= first);
  assert(estimate(high).mean > estimate(low).mean);
});
test("corrupt posterior summaries and selection metadata are rejected without resetting data", () => {
  const s = chooseSpatial(prior(), 815),
    e = observe(prior(), s, 0, 2000, "validation-session");
  assert.throws(() =>
    parseEvents(JSON.stringify([{ ...e, selectionMetadata: null }])),
  );
  assert.throws(() =>
    parseEvents(
      JSON.stringify([{ ...e, abilityAfter: { ...e.abilityAfter, mean: 99 } }]),
    ),
  );
  assert.throws(() => observe(prior(), s, -1, 2000, "bad"));
});
