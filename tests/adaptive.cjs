const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  nextLevel,
  startingLevel,
  mathQuestion,
  memoryConfig,
  spatialQuestion,
  canonical,
  equivalent,
} = require("../lib/adaptive.ts");
const {
  normalize,
  makeResult,
  profile,
  comparable,
  validateResult,
  median,
} = require("../lib/model.ts");
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("adaptive staircase rewards fluent accuracy and steps down after errors", () => {
  const good = { correct: true, time: 2000, target: 8000, level: 4 };
  assert.equal(nextLevel(4, [good]), 5);
  assert.equal(nextLevel(4, [good, good]), 6);
  assert.equal(nextLevel(4, [{ ...good, time: 15000 }]), 4);
  assert.equal(nextLevel(4, [{ ...good, correct: false }]), 3);
  assert.equal(
    nextLevel(4, [
      { ...good, correct: false },
      { ...good, correct: false },
    ]),
    2,
  );
  assert.equal(nextLevel(10, [good, good]), 10);
  assert.equal(nextLevel(1, [{ ...good, correct: false }]), 1);
});
test("all generated spatial questions have one valid match and consistent block counts", () => {
  for (let level = 1; level <= 10; level++)
    for (let seed = 1; seed <= 100; seed++) {
      const q = spatialQuestion(level, seeded(seed * 121 + level));
      assert.equal(q.cells.length, 4 + Math.ceil(level * 0.7));
      assert.equal(
        q.options.filter((o) => equivalent(q.cells, o)).length,
        1,
        `ambiguous level ${level}, seed ${seed}`,
      );
      assert(equivalent(q.cells, q.options[q.correct]));
      for (const o of q.options) {
        assert.equal(o.length, q.cells.length);
        assert.equal(new Set(o.map((p) => p.join(","))).size, o.length);
      }
      assert.equal(new Set(q.options.map(canonical)).size, 4);
    }
});
test("math generates all families, finite answers, and explicit rounding rules", () => {
  const families = new Set();
  for (let level = 1; level <= 10; level++)
    for (let turn = 0; turn < 100; turn++) {
      const q = mathQuestion(level, turn, seeded(level * 100 + turn));
      families.add(q.family);
      assert(Number.isFinite(q.answer));
      assert(q.target > 0);
      const n = q.text.match(/\d+(?:\.\d+)?/g).map(Number);
      let expected;
      if (q.family === "multiplication") expected = n[0] * n[1];
      if (q.family === "division") expected = n[0] / n[1];
      if (q.family === "percentages") expected = (n[0] / 100) * n[1];
      if (q.family === "reverse-percent") expected = (n[1] / n[0]) * 100;
      if (q.family === "multi-step")
        expected = n[0] * n[1] + (q.text.includes("−") ? -n[2] : n[2]);
      if (q.family === "estimation")
        expected = Math.round((n[0] * n[1]) / 100) * 100;
      if (q.family === "arithmetic")
        expected = q.text.includes("+") ? n[0] + n[1] : n[0] - n[1];
      if (q.family === "fractions")
        expected = q.text.includes("of")
          ? (n[0] / n[1]) * n[2]
          : Math.round((n[0] / n[1] + n[2] / n[3]) * 100) / 100;
      assert(Math.abs(expected - q.answer) < 0.00001);
    }
  assert.equal(families.size, 8);
});
test("memory progression expands grids and shortens exposure without invalid patterns", () => {
  let last = { cells: 0, grid: 0, exposure: Infinity };
  for (let level = 1; level <= 12; level++) {
    const c = memoryConfig(level);
    assert(c.cells > last.cells);
    assert(c.grid >= last.grid);
    assert(c.cells < c.grid * c.grid);
    assert(c.exposure <= last.exposure);
    assert(c.exposure >= 700);
    last = c;
  }
  assert.equal(last.grid, 7);
});
test("zero accuracy cannot earn a high percentile through difficulty or speed", () => {
  for (const type of ["math", "spatial"])
    for (let level = 1; level <= 10; level++) {
      assert.equal(normalize(type, 0, level, 0, 1), 1);
      assert(
        normalize(type, 100, level, 1, 1000) >=
          normalize(type, 100, level, 1, 20000),
      );
    }
});
test("new protocols preserve old results but do not mix comparison baselines", () => {
  const old = {
    ...makeResult("math", 100, 1, 2000, 3),
    protocolVersion: 1,
    normalizedScore: 99,
  };
  const current = {
    ...makeResult("math", 70, 0.7, 8000, 5, { nextLevel: 6 }),
    normalizedScore: 55,
  };
  assert(!comparable(old, current));
  assert.equal(
    profile([old, current]).find((d) => d.name === "Numerical").value,
    55,
  );
  assert.equal(startingLevel("math", [old, current]), 6);
  assert.equal(startingLevel("math", [old]), 3);
  assert(validateResult(current));
  assert(!validateResult({ ...current, accuracy: 12 }));
  assert(!validateResult({ ...current, rawScore: NaN }));
  assert.equal(median([]), 0);
});

test("completed session reports reconstruct from persisted results without absorbing partial sessions", () => {
  const { completedSessions } = require("../lib/model.ts");
  const metadata = {
    sessionTotal: 2,
    sessionStartedAt: 100,
    sessionOrder: [0, 1],
  };
  const a = {
    ...makeResult("reaction", 220, 1, 230, 1, metadata),
    sessionId: "session-test",
    timestamp: 200,
  };
  const b = {
    ...makeResult("memory", 8, 0.9, 4000, 5, metadata),
    sessionId: "session-test",
    timestamp: 300,
  };
  assert.equal(completedSessions([a]).length, 0);
  const report = completedSessions([b, a])[0];
  assert.equal(report.id, "session-test");
  assert.deepEqual(report.order, ["reaction", "memory"]);
  assert.equal(report.startedAt, 100);
  assert.equal(report.completedAt, 300);
  assert.equal(completedSessions([a, { ...b, testType: "math" }]).length, 0);
});

test("3D spatial challenges have exactly one rotational match across 24 proper orientations", () => {
  const {
    spatial3Question,
    same3,
    orientations,
    key3,
  } = require("../lib/spatial.ts");
  assert.equal(orientations.length, 24);
  for (let level = 1; level <= 10; level++)
    for (let seed = 1; seed <= 30; seed++) {
      const q = spatial3Question(level, seeded(level * 12345 + seed));
      assert.equal(q.cells.length, 5 + Math.floor(level * 0.8));
      assert.equal(q.options.length, level >= 7 ? 6 : level >= 4 ? 5 : 4);
      assert.equal(q.options.filter((o) => same3(q.cells, o)).length, 1);
      assert(same3(q.cells, q.options[q.correct]));
      assert.equal(new Set(q.options.map(key3)).size, q.options.length);
      q.options.forEach((o) => {
        assert.equal(o.length, q.cells.length);
        assert.equal(new Set(o.map((c) => c.join(","))).size, o.length);
      });
    }
  const old = makeResult("spatial", 90, 0.9, 5000, 8, { nextLevel: 9 });
  old.protocolVersion = 2;
  assert.equal(startingLevel("spatial", [old]), 3);
  assert.equal(makeResult("spatial", 70, 0.7, 15000, 4).protocolVersion, 3);
});
test("Lab scoring prompts are unambiguous and persisted records are validated", () => {
  const {
    probabilityTrial,
    randomnessTrial,
    validLabResult,
    moveDots,
    dotPositions,
  } = require("../lib/lab.ts");
  for (let seed = 1; seed <= 100; seed++)
    for (let round = 0; round < 5; round++) {
      const q = probabilityTrial(round, seeded(seed * 17 + round));
      assert(q.choices[q.correct].value > q.choices[1 - q.correct].value);
      const r = randomnessTrial(seeded(seed));
      assert.notEqual(r.choices[0], r.choices[1]);
    }
  let dots = dotPositions(10, seeded(13));
  for (let i = 0; i < 1000; i++) {
    dots = moveDots(dots, 0.05);
    assert(dots.every((d) => d.x >= 5 && d.x <= 95 && d.y >= 7 && d.y <= 93));
  }
  assert(!validLabResult({}));
  assert(
    !validLabResult({
      id: "x",
      type: "time",
      timestamp: 1,
      protocol: 1,
      values: [1, 2, 3, 4, NaN],
      score: 1,
      errors: 0,
    }),
  );
  assert(
    validLabResult({
      id: "x",
      type: "time",
      timestamp: 1,
      protocol: 1,
      values: [1, 2, 3, 4, 5],
      score: 3,
      errors: 0,
    }),
  );
});
