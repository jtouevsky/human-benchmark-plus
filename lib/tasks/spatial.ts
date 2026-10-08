import { spatial3Question, orientations, key3, transform } from "../spatial";
import { TaskDefinition, Posterior, selectTask } from "../measurement/model";
export type SpatialQuestion = ReturnType<typeof spatial3Question>;
export interface TaskParameters {
  level: number;
  rotationMagnitude: number;
  objectComplexity: number;
  distractorSimilarity: number;
  reflection: boolean;
  answerChoices: number;
  transformationCount: number;
  seed: number;
}
export interface SpatialTask extends TaskDefinition {
  dimension: "spatial";
  parameters: TaskParameters;
  question: SpatialQuestion;
}
export function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function difficulty(p: TaskParameters) {
  // Explicit engineering heuristic, NOT empirically fitted item parameters.
  return (
    -3.4 +
    0.35 * p.objectComplexity +
    0.45 * (p.rotationMagnitude / 180) +
    0.55 * p.distractorSimilarity +
    0.18 * (p.answerChoices - 4) +
    0.2 * Number(p.reflection) +
    0.1 * (p.transformationCount - 1)
  );
}
export function createSpatialTask(level: number, seed: number): SpatialTask {
  const question = spatial3Question(level, seeded(seed));
  const orientation = orientations.findIndex(
    (_, i) =>
      key3(transform(question.cells, i)) ===
      key3(question.options[question.correct]),
  );
  const matrix = orientations[Math.max(0, orientation)];
  const angle =
    (Math.acos(
      Math.max(
        -1,
        Math.min(1, (matrix[0][0] + matrix[1][1] + matrix[2][2] - 1) / 2),
      ),
    ) *
      180) /
    Math.PI;
  const base = new Set(key3(question.cells).split(";"));
  const similarity = Math.max(
    ...question.options
      .filter((_, i) => i !== question.correct)
      .map((option) =>
        Math.max(
          ...orientations.map(
            (_, i) =>
              key3(transform(option, i))
                .split(";")
                .filter((cell) => base.has(cell)).length /
              question.cells.length,
          ),
        ),
      ),
  );
  const parameters: TaskParameters = {
    level,
    seed,
    rotationMagnitude: angle,
    objectComplexity: question.cells.length,
    distractorSimilarity: similarity,
    reflection: true,
    answerChoices: question.options.length,
    transformationCount: angle > 0 ? 1 : 0,
  };
  return {
    id: `spatial-v1-${level}-${seed}`,
    dimension: "spatial",
    difficulty: difficulty(parameters),
    discrimination: 1,
    guessing: 1 / question.options.length,
    parameters,
    question,
  };
}
export function chooseSpatial(
  p: Posterior,
  seed: number,
  previous: string[] = [],
) {
  const candidates = Array.from({ length: 10 }, (_, i) =>
    createSpatialTask(i + 1, (seed + i * 104729) >>> 0),
  );
  return selectTask(p, candidates, previous);
}
