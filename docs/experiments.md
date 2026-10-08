# Validation and reproducible experiments

## Synthetic model recovery

Run `npm run simulate`. The [script](../scripts/simulate.cjs) calls the same [inference engine](../lib/measurement/model.ts) through [`simulate.ts`](../lib/measurement/simulate.ts).

Configuration: 40 synthetic users, eight seeds at each true ability in {−2, −1, 0, 1, 2}, 120 trials per user. Seeds are `100 + i * 191 + round((theta + 2) * 1000)` for `i = 0..7`. Each round has 21 synthetic candidates with difficulty −4 to 4 in steps of 0.4, discrimination 1, and guessing probability 0.2. The selector maximizes expected information gain. Responses are Bernoulli samples from the same likelihood at the known true ability.

Re-executed for this documentation update against model source at `9d2b610`:

| True ability | Mean estimate | Mean absolute error | Mean posterior SD |
| ---: | ---: | ---: | ---: |
| −2 | −1.879 | 0.204 | 0.226 |
| −1 | −1.003 | 0.202 | 0.223 |
| 0 | 0.043 | 0.188 | 0.224 |
| 1 | 0.865 | 0.185 | 0.227 |
| 2 | 1.985 | 0.160 | 0.227 |

Overall MAE: **0.1877820914723627**. Nominal 95% interval coverage: **39/40 (97.5%)**. [Machine-readable cases and seeds](assets/simulation.json).

The command exits unsuccessfully if overall MAE exceeds 0.45. The unit suite also uses a separate 15-user seed set and reports MAE 0.105; this is a different cohort, not another estimate of the 40-user result.

### What this establishes

The implementation can recover known parameters under its assumed response model with this candidate bank and these seeds. The check exercises selection, sampling, updating, and interval extraction together.

It does not validate spatial geometry difficulty: synthetic items bypass the geometry heuristic and span a broader difficulty range. It also does not measure human cognitive ability, test-retest reliability, population ranks, or superiority over fixed/random selection. There is no measured convergence-speed advantage to report. Forty synthetic users are a small coverage experiment, not a calibration study.

## Automated checks

```bash
npm run lint
npm test
npm run simulate
npm run build
npm run typecheck
npm run test:browser
```

Run type checking after the build, not concurrently with it. Browser tests use local Chrome; CI installs Chromium. To run against a separately served static export, set `HB_TEST_URL=http://127.0.0.1:3011`.

The 24 unit tests cover:

- Normalization and prior symmetry; equal-tail quantiles; update direction.
- Diminishing evidence from easy successes and narrowing under repeated evidence.
- Exact information gain against a separately expressed mutual-information identity.
- Selection and repetition exclusion; invalid inputs; 1,000-response extreme sequences.
- Seeded spatial reproducibility and uniqueness across 24 proper rotations.
- Observation replay, corrupt-summary rejection, older record preservation, and protocol separation.
- Math families, memory progression, Lab validation, and completed-session reconstruction.

The 20 browser tests cover full core and Lab lifecycles, persistence across reload, mixed-session resume, malformed archive recovery, reduced motion, mobile layouts, and interactive chrome/atlas rendering. They check behavior and rendering states rather than a universal pixel-perfect image across GPUs.

For this update, a clean `npm ci`, lint, all 24 unit tests, simulation, production build, type check, and all 20 browser tests passed locally. Browser checks ran against the static production export and completed in 4.2 minutes. Media decoding and local Markdown links were checked separately.

## GitHub Actions investigation

[Run 37710799545](https://github.com/jtouevsky/human-benchmark-plus/actions/runs/37710799545), at `3f18e47`, passed installation, lint, unit tests, and build, then failed 8 of 16 browser tests. The failed checks looked for core History rows or Lab logs after reloading and clicking navigation. The logs do not by themselves prove a storage defect.

Inspection found that test startup waited for `main[aria-busy=false]`, but post-reload navigation did not. The showcase update applies that existing readiness contract after reloads in both browser specs. This closes a possible pre-hydration click race without changing application behavior, removing tests, or relaxing assertions. Failure traces are now uploaded for seven days so later CI failures can be diagnosed from browser evidence.

The later visual-overhaul run, [37713556336](https://github.com/jtouevsky/human-benchmark-plus/actions/runs/37713556336), was still running when this investigation began. Its status and the documentation commit's status remain visible in [Actions](https://github.com/jtouevsky/human-benchmark-plus/actions). Local success must not be read as proof of remote success.

Next.js emits an existing warning that its ESLint plugin is not detected. ESLint, TypeScript, and production compilation still run independently; this warning is not the browser failure above.
