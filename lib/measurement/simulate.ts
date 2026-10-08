import {
  prior,
  selectTask,
  likelihood,
  update,
  estimate,
  TaskDefinition,
} from "./model";
import { seeded } from "../tasks/spatial";
/** Model recovery under the assumed likelihood, not evidence of human validity. */
export function simulate(theta: number, seed: number, trials = 120) {
  const random = seeded(seed);
  let p = prior();
  const history = [];
  for (let i = 0; i < trials; i++) {
    const candidates: TaskDefinition[] = Array.from({ length: 21 }, (_, j) => ({
      id: `simulation-${i}-${j}`,
      dimension: "spatial",
      difficulty: -4 + j * 0.4,
      discrimination: 1,
      guessing: 0.2,
    }));
    const selected = selectTask(p, candidates),
      correct = random() < likelihood(theta, selected.task);
    p = update(p, selected.task, correct).after;
    history.push({
      trial: i + 1,
      difficulty: selected.task.difficulty,
      correct,
      ...estimate(p),
    });
  }
  return {
    trueTheta: theta,
    seed,
    trials,
    ...estimate(p),
    error: estimate(p).mean - theta,
    history,
  };
}
