import { TestResult, TestType, mean } from "./model";
export type Attempt = {
  correct: boolean;
  time: number;
  level: number;
  target: number;
};
export const bounded = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function nextLevel(level: number, attempts: Attempt[], max = 10) {
  const last = attempts.at(-1);
  if (!last) return level;
  if (!last.correct)
    return bounded(
      level - (attempts.at(-2)?.correct === false ? 2 : 1),
      1,
      max,
    );
  if (last.time > last.target * 1.6) return level;
  return bounded(
    level + (last.time < last.target * 0.7 && attempts.at(-2)?.correct ? 2 : 1),
    1,
    max,
  );
}
export function startingLevel(type: TestType, results: TestResult[]) {
  const last = results
    .filter(
      (r) =>
        r.testType === type &&
        r.protocolVersion === (type === "spatial" ? 3 : 2),
    )
    .at(-1);
  return last
    ? bounded(
        Math.round(Number(last.metadata.nextLevel) || last.difficulty),
        1,
        type === "memory" ? 12 : 10,
      )
    : type === "memory"
      ? 2
      : 3;
}
export type MathQuestion = {
  text: string;
  answer: number;
  hint: string;
  family: string;
  target: number;
  tolerance: number;
};
export function mathQuestion(
  level: number,
  turn: number,
  rng = Math.random,
): MathQuestion {
  const r = (min: number, max: number) =>
    min + Math.floor(rng() * (max - min + 1));
  const families =
    level <= 2
      ? ["arithmetic", "multiplication", "division"]
      : level <= 4
        ? [
            "multiplication",
            "percentages",
            "fractions",
            "division",
            "multi-step",
          ]
        : [
            "fractions",
            "percentages",
            "multi-step",
            "multiplication",
            "estimation",
            "division",
            "reverse-percent",
          ];
  const family = families[turn % families.length];
  let text = "",
    answer = 0,
    hint = "Enter your answer",
    tolerance = 0.001;
  const target = 5500 + level * 1800;
  if (family === "arithmetic") {
    const a = r(12, 20 + level * 20),
      b = r(8, 15 + level * 15);
    const plus = rng() > 0.5;
    text = `${a} ${plus ? "+" : "−"} ${b}`;
    answer = plus ? a + b : a - b;
  }
  if (family === "multiplication") {
    const a = r(7 + level * (level >= 7 ? 6 : 2), 12 + level * 12),
      b = r(4 + level * (level >= 7 ? 2 : 1), 8 + level * 3);
    text = `${a} × ${b}`;
    answer = a * b;
  }
  if (family === "division") {
    const a = r(5 + level * (level >= 7 ? 4 : 1), 15 + level * 9),
      b = r(3 + level, 6 + level * 3);
    text = `${a * b} ÷ ${b}`;
    answer = a;
  }
  if (family === "percentages") {
    const pct = (
        level >= 7 ? [17, 23, 37, 42, 62.5, 87.5] : [12.5, 15, 18, 22, 35, 65]
      )[r(0, 5)],
      value =
        level >= 7 ? r(200, 200 + level * 85) * 8 : r(8, 12 + level * 7) * 20;
    text = `${pct}% of ${value}`;
    answer = (pct * value) / 100;
  }
  if (family === "fractions") {
    const denominators = level >= 7 ? [7, 9, 11, 13, 16] : [4, 5, 8, 10, 12];
    const bi = r(0, 4),
      b = denominators[bi],
      d = denominators[(bi + r(1, 4)) % denominators.length],
      a = r(1, b - 1),
      c = r(1, d - 1);
    if (level < 5) {
      const value = b * r(5, 30);
      text = `${a}/${b} of ${value}`;
      answer = (a * value) / b;
    } else {
      text = `${a}/${b} + ${c}/${d}`;
      answer = Math.round((a / b + c / d) * 100) / 100;
      hint = "Decimal answer · round to 2 decimal places";
      tolerance = 0.005;
    }
  }
  if (family === "multi-step") {
    const a = r(8 + level * 2, 12 + level * 4),
      b = r(3 + Math.floor(level / 2), 5 + level),
      c = r(9 + level * 5, 20 + level * 10);
    text = `(${a} × ${b}) ${turn % 2 ? "+" : "−"} ${c}`;
    answer = a * b + (turn % 2 ? c : -c);
  }
  if (family === "estimation") {
    const a = r(21, 55 + level * 9),
      b = r(11, 29);
    text = `${a} × ${b} ≈ ?`;
    answer = Math.round((a * b) / 100) * 100;
    hint = "Estimate to the nearest 100";
  }
  if (family === "reverse-percent") {
    const pct = (level >= 7 ? [17, 23, 32, 48, 75] : [20, 25, 40, 60, 75])[
        r(0, 4)
      ],
      value = r(4, 10 + level * 3) * 20;
    text = `${pct}% of ? = ${(value * pct) / 100}`;
    answer = value;
  }
  return { text, answer, hint, family, target, tolerance };
}
export const memoryConfig = (level: number) => ({
  cells: 3 + level,
  grid: level <= 2 ? 4 : level <= 5 ? 5 : level <= 8 ? 6 : 7,
  exposure: Math.max(700, 1900 - level * 100),
});
export function shuffled<T>(items: T[], rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export type Cell = [number, number];
export function canonical(cells: Cell[]) {
  const x = Math.min(...cells.map((c) => c[0])),
    y = Math.min(...cells.map((c) => c[1]));
  return cells
    .map(([a, b]) => [a - x, b - y].join(","))
    .sort()
    .join(";");
}
export function rotate(cells: Cell[], turns: number): Cell[] {
  let a = cells;
  for (let i = 0; i < turns; i++) a = a.map(([x, y]) => [-y, x]);
  return a;
}
export function equivalent(a: Cell[], b: Cell[]) {
  return [0, 1, 2, 3].some((n) => canonical(a) === canonical(rotate(b, n)));
}
function connected(cells: Cell[]) {
  const seen = new Set([cells[0].join(",")]);
  for (let i = 0; i < cells.length; i++)
    for (const [x, y] of cells)
      if (seen.has(`${x},${y}`))
        for (const [a, b] of cells)
          if (Math.abs(a - x) + Math.abs(b - y) === 1) seen.add(`${a},${b}`);
  return seen.size === cells.length;
}
export type SpatialQuestion = {
  cells: Cell[];
  options: Cell[][];
  correct: number;
  angle: number;
  target: number;
};
export function spatialQuestion(
  level: number,
  rng = Math.random,
): SpatialQuestion {
  const count = 4 + Math.ceil(level * 0.7);
  let cells: Cell[] = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (let attempt = 0; attempt < 80; attempt++) {
    const grown: Cell[] = [[0, 0]];
    for (let n = 0; grown.length < count && n < 250; n++) {
      const p = grown[Math.floor(rng() * grown.length)],
        dir = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ][Math.floor(rng() * 4)];
      const c: Cell = [p[0] + dir[0], p[1] + dir[1]];
      if (!grown.some((x) => x[0] === c[0] && x[1] === c[1])) grown.push(c);
    }
    if (
      grown.length === count &&
      !equivalent(
        grown,
        grown.map(([x, y]) => [-x, y]),
      )
    ) {
      cells = grown;
      break;
    }
  }
  const distractors: Cell[][] = [cells.map(([x, y]) => [-x, y])];
  for (let i = 0; distractors.length < 3 && i < 250; i++) {
    const base = cells.filter(
      (_, j) => j !== Math.floor((i / 4) % cells.length),
    );
    const anchor = base[Math.floor(rng() * base.length)],
      dir = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ][i % 4];
    const c: Cell = [anchor[0] + dir[0], anchor[1] + dir[1]],
      candidate = [...base, c];
    if (
      !base.some((x) => x[0] === c[0] && x[1] === c[1]) &&
      connected(candidate) &&
      !equivalent(cells, candidate) &&
      !distractors.some((d) => equivalent(d, candidate))
    )
      distractors.push(candidate);
  }
  // Bounded fallback: same-sized connected lines have a different topology to the chiral target.
  while (distractors.length < 3)
    distractors.push(
      Array.from({ length: cells.length }, (_, i) => [i, 0] as Cell),
    );
  const correct = Math.floor(rng() * 4),
    options: Cell[][] = [];
  for (let i = 0; i < 4; i++)
    options.push(
      rotate(
        i === correct ? cells : distractors.shift()!,
        1 + Math.floor(rng() * 3),
      ),
    );
  return {
    cells,
    options,
    correct,
    angle: level >= 7 ? 45 : 0,
    target: 6500 + level * 1100,
  };
}
export function summariseAttempts(a: Attempt[]) {
  return {
    times: a.map((x) => x.time),
    correct: a.map((x) => Number(x.correct)),
    levels: a.map((x) => x.level),
    targets: a.map((x) => x.target),
    averageDifficulty: mean(a.map((x) => x.level)),
  };
}
