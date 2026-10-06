# Human Benchmark++

An interactive cognitive experiment lab that combines adaptive challenges, personal performance history, and a data-driven 3D profile.

Built to explore two questions: how can repeated observations reveal more than a single score, and how can motion and spatial interfaces make that data easier to explore? The project brings together procedural test generation, timing-sensitive interactions, local persistence, and experimental visual design.

**Four core tests · Six playable Lab studies · No account or API key required**

> **Preview coming soon:** capture the silver Home screen with the 3D profile, then a short GIF showing drag rotation and the scroll-driven test gallery. Use the explicitly labeled demo profile, not personal results. Add the reviewed image at `docs/images/overview.png` and uncomment the image below. Local QA screenshots in `artifacts/` are deliberately excluded from this repository.

<!-- ![Human Benchmark++ home and interactive cognitive profile](docs/images/overview.png) -->

## What it does

- **Reaction time:** seven valid trials with randomized waits, false-start handling, and median, fastest, mean, and variability statistics.
- **Visual memory:** adaptive patterns across 4×4 to 7×7 grids, increasing from four to fifteen cells as difficulty rises.
- **Mental math:** ten-round sessions spanning arithmetic, fractions, percentages, estimation, and multistep problems.
- **Spatial reasoning:** generated 3D block assemblies with mirrored and structurally altered distractors, four inspection views, and up to six answer choices.
- **Experimental Lab:** time perception, visual search, change blindness, probability intuition, randomness detection, and multi-object tracking. Each produces a five-round report and local history.
- **Personal progression:** repeatability, baseline comparisons, trends, session summaries, and milestones. Core sessions can resume after a reload with completed tests preserved.
- **Interactive presentation:** a Three.js cognitive profile, keyboard-accessible data scrubbing, scroll-driven horizontal exploration, layered glass materials, and distinct light and dark environments.

## Run locally

Use **Node.js 24** and npm. `.nvmrc` specifies the development version; if you use nvm, run `nvm use` after cloning.

```bash
git clone https://github.com/jtouevsky/human-benchmark-plus.git
cd human-benchmark-plus
npm ci
npm run dev
```

Open **http://localhost:3000**. Keep the terminal running while using the app; `Ctrl+C` stops the development server.

No environment configuration is required. `.env.example` documents this and explains how to keep future integration keys private. Never place secrets in `NEXT_PUBLIC_*` variables, which are bundled for the browser.

```bash
npm test           # Deterministic generator, scoring and persistence checks
npm run build      # Type-check and produce the static site in out/
npm run typecheck  # Standalone TypeScript check
npm run format     # Format application and test sources
```

`package-lock.json` records exact dependency versions; `npm ci` installs from that lockfile. This app exports static files, so a production host can serve `out/`. It does not require a database or an application server after building. Development and production use separate `.next-dev/` and `.next/` caches.

## Tech stack

| Area | Tools |
| --- | --- |
| Application | Next.js 15 App Router, React 19, TypeScript |
| Presentation | CSS, Tailwind CSS 4 tooling, Framer Motion, Lucide |
| 3D | Three.js with a lazily loaded, imperative WebGL scene |
| Data | Validated browser localStorage records; derived profile state |
| Testing | Node.js test runner, deterministic seeded generators, TypeScript |
| Fonts | Locally bundled Inter and Space Grotesk |

## Engineering decisions

### A spatial question must have exactly one answer

The 3D generator compares assemblies across all **24 proper cube orientations**. Translation-normalized coordinates distinguish valid rotations from reflections and altered structures. Distractors retain the same block count, and inspection views let users examine hidden blocks. Automated checks cover 300 seeded 3D questions across the difficulty range, alongside the original 2D generator checks.

### Protocol versions protect personal baselines

The harder 3D test uses a different protocol from the original spatial task. Older observations remain available, but comparison baselines and starting difficulty do not silently mix protocols. Profile values are derived from validated records rather than stored as a second source of truth. Saved session metadata supports reconstructing complete reports without treating partial sessions as finished.

### Timing is part of the interface

Reaction trials use `performance.now()`, animation-frame scheduling, and synchronized visual updates. Anticipations and false starts are handled separately. Other tasks exclude hidden-tab time or restart an interrupted stimulus. These choices reduce avoidable measurement errors, although browser and input-device latency still matter.

### 3D carries meaning, not just decoration

The cognitive object maps estimated performance to radius and observation count to depth; an outer wireframe represents illustrative uncertainty. Users can rotate with a pointer or arrow keys, select dimensions, zoom, and pause rotation. The renderer loads near the viewport and pauses offscreen, in hidden tabs, and behind inert dialogs. Mobile uses a lower pixel-density cap, and unavailable WebGL falls back to readable values.

### Motion adapts to the device

Desktop vertical scrolling drives a horizontal test gallery and an SVG storytelling path. Mobile swaps the pinned gallery for horizontal swiping. Reduced-motion preferences suppress decorative motion. The normal statistical charts remain available alongside the dimensional history view, which also supports keyboard scrubbing. Smooth rendering is a design target, not a hardware-benchmarked guarantee.

## Project structure

```text
app/          Page orchestration, layout and visual environments
components/   Core/Lab test interfaces, reusable motion systems and 3D views
lib/          Scoring models, validation, adaptive logic and pure generators
tests/        Seeded correctness and persistence tests
public/       Public static assets
```

`lib/adaptive.ts` contains the staircase and original generators; `lib/spatial.ts` owns 3D equivalence and generation; `lib/lab.ts` owns Lab definitions and utilities. `components/experience.tsx` implements the shared presentation systems. Existing earlier visualization source is retained in the first public snapshot for traceability; the active 3D entry point is `components/scene-loader.tsx`.

## Privacy and interpretation

Results stay in the browser's localStorage. Different browsers have separate histories, and clearing browser storage removes that browser's saved results. Demo results are generated examples, not a public dataset of user measurements. Screenshots, local exports, private hosting metadata, environment files, dependencies, and build output are excluded from Git.

This is an exploratory portfolio project, **not a validated psychological or medical assessment**. Percentiles and uncertainty bands are illustrative, not population-calibrated estimates or statistical confidence intervals. Processing and attention are derived proxies. There is no IQ score or diagnostic interpretation; Lab records stay separate from the core profile.

## Future improvements

- Complete the concept-stage dual-task interference and Pattern Lab experiments.
- Add replayable seeded batteries and stronger reliability analysis across separate days.
- Expand automated browser, accessibility, and WebGL fallback coverage.
- Profile rendering performance on a documented range of desktop and mobile devices.
- Investigate calibration using appropriately collected reference data before making population comparisons.

## Development

The project was developed iteratively with AI-assisted implementation. The repository includes the source, deterministic tests, dependency lockfile, and explicit measurement limitations so the work can be inspected and reproduced.

## License

[MIT](LICENSE). Third-party dependencies retain their respective licenses.
