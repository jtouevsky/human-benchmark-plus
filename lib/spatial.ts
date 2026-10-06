import { shuffled } from "./adaptive";
export type Voxel = [number, number, number];
const axes: Voxel[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const dot = (a: Voxel, b: Voxel) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a: Voxel, b: Voxel): Voxel => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const orientations = axes.flatMap((a) =>
  axes.filter((b) => dot(a, b) === 0).map((b) => [a, b, cross(a, b)]),
);
export const transform = (cells: Voxel[], index: number): Voxel[] =>
  cells.map((c) => orientations[index].map((a) => dot(a, c)) as Voxel);
export function key3(cells: Voxel[]) {
  const min = [0, 1, 2].map((i) => Math.min(...cells.map((c) => c[i])));
  return cells
    .map((c) => c.map((v, i) => v - min[i]).join(","))
    .sort()
    .join(";");
}
export const same3 = (a: Voxel[], b: Voxel[]) =>
  orientations.some((_, i) => key3(a) === key3(transform(b, i)));
function grow(count: number, rng: () => number) {
  const a: Voxel[] = [[0, 0, 0]];
  while (a.length < count) {
    const candidates = a
      .flatMap((c) => axes.map((d) => c.map((v, i) => v + d[i]) as Voxel))
      .filter((c) => !a.some((x) => x.every((v, i) => v === c[i])));
    a.push(candidates[Math.floor(rng() * candidates.length)]);
  }
  return a;
}
export function spatial3Question(level: number, rng = Math.random) {
  const count = 5 + Math.floor(level * 0.8),
    optionCount = level >= 7 ? 6 : level >= 4 ? 5 : 4;
  let cells: Voxel[] = [
    [0, 0, 0],
    [1, 0, 0],
    [2, 0, 0],
    [2, 1, 0],
    [2, 1, 1],
  ];
  for (let i = 0; i < 100; i++) {
    const candidate = grow(count, rng);
    if (
      !same3(
        candidate,
        candidate.map(([x, y, z]) => [-x, y, z]),
      )
    ) {
      cells = candidate;
      break;
    }
  }
  const alternatives: Voxel[][] = [cells, cells.map(([x, y, z]) => [-x, y, z])];
  // Grow connected candidates from a shared trunk; reject all rotational duplicates.
  for (let i = 0; alternatives.length < optionCount && i < 800; i++) {
    const base = cells.slice(0, -(1 + Math.floor(i / 200)));
    const anchor = base[Math.floor(rng() * base.length)],
      dir = axes[Math.floor(rng() * 6)];
    let candidate: Voxel[] = [
      ...base,
      anchor.map((v, j) => v + dir[j]) as Voxel,
    ];
    if (new Set(candidate.map((c) => c.join(","))).size !== candidate.length)
      continue;
    while (candidate.length < cells.length) {
      const choices = candidate
        .flatMap((c) => axes.map((d) => c.map((v, j) => v + d[j]) as Voxel))
        .filter((c) => !candidate.some((x) => x.every((v, j) => v === c[j])));
      candidate.push(choices[Math.floor(rng() * choices.length)]);
    }
    if (!alternatives.some((a) => same3(a, candidate)))
      alternatives.push(candidate);
  }
  // Rare bounded fallback: use independent connected structures of the same size.
  for (let i = 0; alternatives.length < optionCount && i < 500; i++) {
    const c = grow(cells.length, rng);
    if (!alternatives.some((a) => same3(a, c))) alternatives.push(c);
  }
  const order = shuffled(
    alternatives.map((_, i) => i),
    rng,
  );
  return {
    cells,
    options: order.map((i) =>
      transform(alternatives[i], 1 + Math.floor(rng() * 23)),
    ),
    correct: order.indexOf(0),
    target: 14000 + level * 2200,
    angle: level >= 7 ? 18 : 0,
  };
}
