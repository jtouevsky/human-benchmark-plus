# Spatial measurement model

This model estimates performance on the generated spatial task family. It does not estimate IQ or claim a calibrated population rank. Only spatial responses update it. The other five dimensions have explicit unmeasured priors.

## Latent scale and response model

Ability is a scalar θ on an experimental standardized scale, initially N(0, 1.5²). A task has heuristic difficulty b, discrimination a = 1, and chance floor c = 1 / number of choices:

$$P(Y=1\mid\theta,t)=c+(1-c)\,\sigma(a(\theta-b)),\qquad \sigma(z)=\frac1{1+e^{-z}}.$$

Setting c = 0 gives the Rasch-style logistic model. The chance term matters because these tasks are multiple choice. Discrimination is an explicit task parameter so a later calibrated model can extend it. Multidimensional loadings are not implemented.

## Bayesian update

The posterior uses 241 grid points from −6 to +6 in steps of 0.05. We store normalized probability mass, not density. Density for rendering is mass divided by the grid step.

$$w_i' = \frac{w_i\,p_i^y(1-p_i)^{1-y}}{\sum_j w_j\,p_j^y(1-p_j)^{1-y}}.$$

Multiplication happens in log space before normalization. Reported summaries are the weighted mean, variance, standard deviation, and equal-tail 95% credible interval. These are conditional on the response model and heuristic task difficulties, not calibrated psychological confidence statements. The prior is truncated to the grid; the inspector warns when posterior mass approaches its boundary.

Uncertainty usually decreases over repeated trials, but a surprising observation can increase variance. The UI does not force every answer to narrow the distribution.

## Task parameters and difficulty

A candidate is generated at each of ten complexity levels, using recorded seeds. The existing generator rejects rotationally equivalent distractors across all 24 proper cube rotations. Each task records actual block count, inferred rotation angle of the correct option, maximum distractor overlap under rotations, reflected-distractor presence, answer count, and transformation count.

The first difficulty heuristic is:

$$b=-3.4+0.35B+0.45(R/180)+0.55S+0.18(K-4)+0.2M+0.1(T-1).$$

B = blocks, R = rotation degrees, S = maximum distractor overlap fraction, K = choices, M = reflected distractor indicator, T = transformation count. Rotation is inferred from the matching assembly; symmetric shapes can have more than one equivalent orientation. These coefficients are engineering assumptions. They need empirical calibration and may not rank human difficulty correctly.

## Adaptive selection

For each unseen candidate, compute the predictive probability of correctness and both hypothetical posteriors. Choose the candidate with maximum expected entropy reduction:

$$I(\theta;Y\mid t)=H(w)-qH(w^{(1)})-(1-q)H(w^{(0)}),\qquad q=\sum_i w_ip_i.$$

Entropy is discrete grid entropy in natural units (nats); information gain is computed on the same fixed grid. This integrates over uncertainty instead of just targeting the mean. Candidate IDs already in the archive are excluded. Fresh seeds reduce exact repetition but do not guarantee that geometrically equivalent shapes never recur. Selection metadata records the actual information value, predictive probability, candidate count, mean, uncertainty, and explanation.

The inspector on Profile previews a deterministic candidate pool. Actual trials generate fresh pools, so the eventual task can differ from that preview. After an answer, the test inspector displays the actual next selected task.

## Trial records and persistence

`lib/experimental-data/store.ts` stores versioned trial events under `hb-measurement-spatial-v1` in localStorage. Each event contains a session ID, reproducible task ID and parameters, response, correctness, active response time, before/after estimates, and selection metadata. Hidden-tab time is excluded. Response latency is recorded but does not enter this correctness likelihood.

On load, records are validated against regenerated tasks and replayed posteriors. Corrupt or incompatible archives are preserved and reported, not silently overwritten. Duplicate task IDs and stale concurrent-tab writes are rejected. A storage failure blocks advancement with an error. Storage is bounded to 10,000 trials and the browser's quota, which can be smaller. Export is available from Profile. Import, archive rotation, and cross-device sync are not implemented.

Spatial protocol 04 does not reuse legacy staircase scores. Compatibility fields `normalizedScore` and `percentile` remain zero in the legacy session record and are never displayed as Bayesian measurements. Earlier records remain available in History. Synthetic demo data never enters the measurement store.

## Visual mapping

The Three.js surface uses the actual grid density. Its horizontal coordinate is θ and height is density, with vertical scale adjusted to fit. The surface has constant extruded depth, not an extra modeled variable. The transition is a visual interpolation between old and new normalized distributions; intermediate animation frames are not extra Bayesian updates. The 2D trace uses the same masses and shades the credible interval.

Profile displays six independent marginal ribbons: the measured spatial posterior and five unmeasured priors. Their separation is a layout choice; no cross-dimensional covariance is inferred. The pale prior ribbons are explicitly labeled. All numeric readouts use the final computed posterior.

Pointer rotation, keyboard orbit/zoom, and a density slider expose the surface. Reduced motion stops autonomous lighting and makes updates immediate. Rendering pauses offscreen, in hidden tabs, under inert dialogs, and during timing-sensitive tests. Unavailable WebGL leaves the 2D curve, slider, and estimates usable. The decorative interference field is labeled as artwork.

## Verification

```bash
npm test
npm run simulate
npm run build
```

Tests cover normalization, direction of updates, diminishing evidence from easy correct answers, uncertainty reduction over repeated trials, information gain against an independent mutual-information expression, repetition exclusion, invalid inputs, 1,000-answer pathological sequences, spatial metadata reproducibility, event replay, and synthetic convergence.

The standalone simulation uses 40 synthetic users, θ ∈ {−2, −1, 0, 1, 2}, 120 trials each, fixed seeds, a = 1, c = 0.2, and a candidate bank spanning b ∈ [−4,4]. The current run yields mean absolute error **0.188 θ** and **97.5%** coverage of nominal 95% intervals. This is model recovery under matching assumptions, not validation of human cognition or the spatial difficulty heuristic. Real spatial candidates have a narrower difficulty range.

## Next milestone

Collect consented, anonymous item-level responses and evaluate item calibration, reliability across sessions, difficulty coverage, and model mismatch. Freeze a new version when parameters change. Ability drift, learning effects, fatigue, and response-time likelihoods need explicit models; they should not be folded into arbitrary score adjustments.
