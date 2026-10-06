export type TestType = "reaction" | "memory" | "math" | "spatial";
export type TestResult = {
  id: string;
  testType: TestType;
  timestamp: number;
  difficulty: number;
  rawScore: number;
  accuracy: number;
  responseTime: number;
  normalizedScore: number;
  percentile: number;
  protocolVersion?: number;
  sessionId?: string;
  metadata: Record<string, number | number[]>;
};
export type CognitiveSession = {
  id: string;
  startedAt: number;
  order: TestType[];
  results: TestResult[];
  completedAt?: number;
};
export const tests = [
  {
    id: "reaction" as TestType,
    name: "Reaction time",
    category: "SENSORIMOTOR",
    description: "Catch the signal. Find your fastest moment.",
    unit: "ms",
    color: "#a8d8ff",
    duration: "1 min",
  },
  {
    id: "memory" as TestType,
    name: "Visual memory",
    category: "WORKING MEMORY",
    description: "Hold a fleeting pattern in your mind.",
    unit: "cells",
    color: "#bcb5f5",
    duration: "2 min",
  },
  {
    id: "math" as TestType,
    name: "Mental math",
    category: "NUMERICAL",
    description: "Precision under increasing complexity.",
    unit: "%",
    color: "#d9dfe8",
    duration: "3 min",
  },
  {
    id: "spatial" as TestType,
    name: "Spatial reasoning",
    category: "SPATIAL",
    description: "New forms. Different angles. One match.",
    unit: "%",
    color: "#96dce9",
    duration: "2 min",
  },
];
export const mean = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2
    ? s[Math.floor(s.length / 2)]
    : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
export const sd = (a: number[]) =>
  Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));
export const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));
export const ordinal = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] || "th"}`;
// Versioned simulated calibration. Accuracy gates the speed/difficulty contribution.
export function normalize(
  type: TestType,
  raw: number,
  difficulty: number,
  accuracy: number,
  time: number,
) {
  if (type === "reaction") return clamp(100 / (1 + Math.exp((raw - 285) / 55)));
  if (type === "memory") return clamp(raw * 5.5 + accuracy * 12);
  return clamp(
    accuracy * (25 + difficulty * 6 + Math.max(0, 15 - time / 1500)),
  );
}
export function makeResult(
  testType: TestType,
  rawScore: number,
  accuracy: number,
  responseTime: number,
  difficulty: number,
  metadata: TestResult["metadata"] = {},
): TestResult {
  const percentile = normalize(
    testType,
    rawScore,
    difficulty,
    accuracy,
    responseTime,
  );
  return {
    id: crypto.randomUUID(),
    testType,
    timestamp: Date.now(),
    difficulty,
    rawScore,
    accuracy,
    responseTime,
    percentile,
    normalizedScore: percentile,
    protocolVersion: testType === "spatial" ? 3 : 2,
    metadata,
  };
}
export function comparable(a: TestResult, b: TestResult) {
  return (
    a.testType === b.testType &&
    (a.protocolVersion || 1) === (b.protocolVersion || 1)
  );
}
export function recentFor(results: TestResult[], type: TestType) {
  const all = results.filter((r) => r.testType === type);
  const latest = all.at(-1);
  return latest ? all.filter((r) => comparable(r, latest)) : [];
}
export const dimensions = [
  "Reaction",
  "Memory",
  "Spatial",
  "Numerical",
  "Processing",
  "Attention",
];
export function profile(results: TestResult[]) {
  return dimensions.map((name, i) => {
    const types: TestType[][] = [
      ["reaction"],
      ["memory"],
      ["spatial"],
      ["math"],
      ["reaction", "math"],
      ["memory", "spatial"],
    ];
    const groups = types[i].map((t) => recentFor(results, t).slice(-10));
    const r = groups.flat();
    const count = r.length;
    return {
      name,
      value: mean(
        groups
          .filter((g) => g.length)
          .map((g) => mean(g.map((x) => x.normalizedScore))),
      ),
      count,
      confidence: count >= 8 ? "Moderate" : count >= 3 ? "Developing" : "Early",
      band: count
        ? Math.max(
            6,
            26 / Math.sqrt(count) + sd(r.map((x) => x.normalizedScore)) * 0.3,
          )
        : 0,
    };
  });
}
export function validateResult(r: unknown): r is TestResult {
  if (!r || typeof r !== "object") return false;
  const v = r as TestResult;
  return (
    typeof v.id === "string" &&
    tests.some((t) => t.id === v.testType) &&
    [
      "timestamp",
      "difficulty",
      "rawScore",
      "accuracy",
      "responseTime",
      "normalizedScore",
      "percentile",
    ].every((k) => Number.isFinite(v[k as keyof TestResult])) &&
    v.accuracy >= 0 &&
    v.accuracy <= 1 &&
    !!v.metadata &&
    typeof v.metadata === "object"
  );
}
export function demoResults(): TestResult[] {
  return Array.from({ length: 24 }, (_, i) => {
    const testType = tests[i % 4].id;
    const raw =
      testType === "reaction"
        ? 276 - i * 2
        : testType === "memory"
          ? 5 + Math.floor(i / 5)
          : 60 + Math.floor(i / 3) * 5;
    const accuracy =
      testType === "reaction"
        ? 1
        : testType === "memory"
          ? 0.75 + Math.floor(i / 4) * 0.04
          : raw / 100;
    const difficulty = 3 + Math.floor(i / 8);
    const responseTime = testType === "reaction" ? raw : 5500 - i * 65;
    const percentile = normalize(
      testType,
      raw,
      difficulty,
      accuracy,
      responseTime,
    );
    return {
      id: "demo-" + i,
      testType,
      timestamp: Date.now() - (24 - i) * 36000000,
      difficulty,
      rawScore: raw,
      accuracy,
      responseTime,
      normalizedScore: percentile,
      percentile,
      protocolVersion: 2,
      metadata: { nextLevel: difficulty + 1 },
    };
  });
}

export function completedSessions(results: TestResult[]): CognitiveSession[] {
  const groups = new Map<string, TestResult[]>();
  for (const r of results) {
    if (r.sessionId)
      groups.set(r.sessionId, [...(groups.get(r.sessionId) || []), r]);
  }
  return [...groups.entries()].flatMap(([id, group]) => {
    const sorted = group.slice().sort((a, b) => a.timestamp - b.timestamp),
      first = sorted[0],
      total = Number(first.metadata.sessionTotal),
      order = first.metadata.sessionOrder;
    if (
      !Array.isArray(order) ||
      total !== sorted.length ||
      !Number.isFinite(first.metadata.sessionStartedAt)
    )
      return [];
    const types = order.map((i) => tests[i]?.id);
    if (types.some((t) => !t) || sorted.some((r, i) => r.testType !== types[i]))
      return [];
    return [
      {
        id,
        startedAt: Number(first.metadata.sessionStartedAt),
        order: types,
        results: sorted,
        completedAt: sorted.at(-1)!.timestamp,
      },
    ];
  });
}
