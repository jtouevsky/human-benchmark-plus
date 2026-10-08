# Spatial inference and task selection

Source: [`model.ts`](../lib/measurement/model.ts), [`spatial.ts`](../lib/tasks/spatial.ts), and the [geometry generator](../lib/spatial.ts). Model version: `spatial-grid-v1`.

## Representation

The latent variable is a single spatial performance parameter. Other dimension names exist in the code, but there is no joint vector posterior or learned covariance.

For $i=0,\ldots,240$, $\theta_i=-6+0.05i$. Initial weights are proportional to $\exp[-\tfrac12(\theta_i/1.5)^2]$ and normalized on this finite grid. These are probability masses. A display density is $w_i/0.05$.

The mean and variance are weighted grid sums. Equal-tail interval endpoints are the first grid values whose cumulative mass reaches 0.025 and 0.975. `boundaryMass` sums the first and last four weights; substantial edge mass signals that the bounded representation may be constraining the estimate.

## Likelihood and update

For task $t=(b,a,c)$:

$$p_i=c+(1-c)\sigma(a(\theta_i-b)),\qquad \sigma(z)=\frac1{1+e^{-z}}.$$

Spatial tasks use $a=1$ and $c=1/K$. The guessing term distinguishes this from the pure Rasch logistic model. It assumes a lower asymptote corresponding to random choice; it does not explicitly model strategy or individual guessing behavior.

For response $r$:

$$\ell_i=\log w_i+r\log p_i+(1-r)\log(1-p_i),\qquad
w_i'=\frac{e^{\ell_i-\max_j\ell_j}}{\sum_k e^{\ell_k-\max_j\ell_j}}.$$

The code uses a stable logistic and clips probabilities to $[10^{-12},1-10^{-12}]$. It rejects invalid task parameters and malformed posteriors. Response latency is recorded separately. A surprising response can increase variance; monotonic narrowing is not enforced.

## Geometry-derived difficulty

A seeded linear congruential generator uses `seed = (1664525 * seed + 1013904223) mod 2^32` with integer multiplication. The task adapter derives parameters from the generated question:

$$b=-3.4+0.35B+0.45(\alpha/180)+0.55S+0.18(K-4)+0.2R+0.1(T-1).$$

| Parameter | Actual meaning |
| --- | --- |
| $B$ | Number of blocks in the assembly |
| $\alpha$ | Angle, in degrees, of a matching proper cube rotation |
| $S$ | Maximum normalized cell overlap with a distractor across rotations, divided by base block count |
| $K$ | Answer choice count |
| $R$ | Reflected-distractor indicator, currently true |
| $T$ | One if the inferred rotation angle is nonzero, otherwise zero |

The overlap measure is not Jaccard similarity. Symmetric shapes may admit several matching rotations; the adapter takes the first match. The coefficients are engineering assumptions, not estimates fitted to human responses. A numerically precise posterior can still be wrong about people if this difficulty map is wrong.

## Expected information gain

Entropy uses natural logarithms: $H(w)=-\sum_i w_i\log w_i$. For each task, the engine computes $q=\sum_i w_ip_i$ and both hypothetical updated distributions:

$$I(\theta;R\mid t)=H(w)-qH(w^{(1)})-(1-q)H(w^{(0)}).$$

The unit suite cross-checks this against the independent identity $h(q)-\sum_i w_i h(p_i)$, where $h$ is binary entropy.

`chooseSpatial` generates one candidate at each level 1 through 10, with seeds offset by multiples of 104729. `selectTask` excludes used task IDs, ranks remaining candidates by information gain, and breaks ties by ID. It fails explicitly if no fresh candidate remains. Tiny negative numerical information values are clamped to zero.

Model evaluation costs $O(CG)$ for $C$ candidates and $G=241$ grid points, plus candidate sorting and procedural geometry work. No Monte Carlo integration, gradient fitting, MCMC, or neural network is involved. This is optimal only within the current finite candidate pool under the assumed model.

The Profile inspector previews a deterministic candidate pool; a live trial generates a fresh pool, so its selected task may differ. Unique IDs do not guarantee that geometrically equivalent assemblies never recur.

## Interpretation boundaries

The scale has no population reference. Credible intervals condition on the prior, likelihood, difficulty heuristic, and grid. They are not clinical confidence statements. Trial independence and stable ability are assumptions; practice, fatigue, strategy changes, and response-time effects are unmodeled. Parameter or generator changes require versioning to preserve replay semantics.
