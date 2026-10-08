# Spatial measurement documentation

The current specification is split into focused references:

- [Mathematics](mathematics.md): grid prior, response likelihood, Bayesian update, heuristic difficulty, and expected information gain.
- [Architecture](architecture.md): observations, replay, protocol versions, and local persistence.
- [Visualization](visualization.md): posterior surface, atlas mappings, and decorative motion.
- [Experiments](experiments.md): reproducible simulation results, automated checks, and CI findings.

Only spatial responses update the Bayesian model. The other tests retain separate scoring protocols.
