# SmartSort AI audit

## Condition

The existing modular React/TypeScript architecture is retained. Bayes and BFS calculations were correct on inspection and in tests. The live decision policy required an actual sequential model; replay validation and Windows development-server stability also needed fixes.

## Fixed

| Finding | Implemented correction |
| --- | --- |
| The MDP panel described a one-step reward comparison, with no future-state transitions. | Added memoized finite-horizon belief-state Bellman planning. The live controller uses it; immediate values remain a labeled baseline. The panel exposes horizon, immediate/continuation/action values, and observation transitions. |
| Stored frames could have valid field types but illegal stage order, forged policy values, or robot teleportation. | Validate sequential Bayes results, recorded policy, BFS result, legal frame progression, counters, and terminal outcome. Reject corrupt traces; preserve mathematically valid legacy one-step records. |
| Exhausted replay used the last state repeatedly, potentially scheduling forever. | Explicitly stop a prematurely exhausted replay with an error; reject incomplete traces before playback. |
| A history-completion callback could throw before subscribers were notified. | Contain callback errors and still publish the terminal state. |
| Externally mutated setup objects could diverge from the displayed active configuration. | Clone editable inputs and display the controller's normalized run snapshot at Start. |
| Sensor presentation could throw when handed malformed model parameters. | Show an unavailable/error state instead of crashing or substituting fake likelihoods. Validation no longer generates a discarded sensor sample. |
| Vite watched generated Chrome cookie files and crashed with EBUSY on Windows. | Exclude generated `.qa/` and `dist/` content from watching. Browser audits use an isolated profile and an owned dynamic debugger port. |
| Icon-only tablet navigation lacked accessible names; guide focus could escape. | Added control names/current-page state, focus containment/restoration, mobile drawer close/backdrop, and inert background handling. |
| Technical data was too small/faint; obsolete CSS remained from earlier views. | Improved data/label readability, contrast, quiet surfaces, and mobile marker spacing; removed 77 obsolete rule groups. The grid and design palette remain intact. |
| Cell playback caused unnecessary algorithm-panel/context updates. | Memoized the algorithm panels and playback context; retained bounded memoized planning and one pending timer. |
| Production transformation of optional crypto UUID invocation prevented completed runs from reaching storage. | Replaced the optional invocation in a default argument with explicit receiver-preserving ID generation. Retested persistence and replay against the production bundle. |
| Documentation and examples still described the old policy. | Rewrote model/terminal/reward documentation and aligned the reinspection example with real sequential behavior. |

## Model assumptions and limitations

- The state is a Bayesian belief plus a finite inspection budget, representing a small partially observed sorting problem. Two actions are modeled; unsafe budget exhaustion is an unresolved terminal outcome, not a fictitious sensor action.
- Positive inspection rewards can make the optimal policy use its full available budget. The application displays that mathematical consequence explicitly.
- Sensor likelihoods are known and fixed for each run. Cardboard maps to Paper. The environment is a deterministic, unweighted 4x4 grid; the robot carries the object from its start.
- Sensor animation is schematic activity only. No hardware or external AI model is involved.
- History is local to the browser and subject to its storage policy. Replay preserves validated historical policy outputs, including legacy one-step records.
- Browser verification is Chromium-based. Safari/Firefox, physical touchscreen testing, and manual screen-reader testing are not claimed. This is not a formal accessibility certification or hardware safety assessment.

## Checks

Verified on 12 November 2026 with Node 24, Windows, and installed headless Chrome:

- `npm test`: 85 passed, 0 failed, skipped, or cancelled.
- `npm run typecheck`: passed with strict unused-code checks.
- `npm run build`: passed. JavaScript 466.85 kB (146.30 kB gzip); CSS 63.51 kB (13.61 kB gzip).
- `npm run test:browser` against the production preview: passed, with no runtime exceptions or unexpected console warnings.
- Desktop Simulator, mobile Simulator, mobile populated History, desktop Experiment Lab, and expanded Bellman calculation screenshots were actually inspected.

The browser audit also passed against the development server (Motion emits its expected reduced-motion development advisory). The browser script checks all six views at 1440, 1024, 768, 390, and 320px, with settled screenshots rather than capturing partial view-transition opacity.

Browser checks cover guide focus, mode checkbox keyboard activation, manual Sensor/Bayes/MDP stepping, object/start/obstacle editing, protected bins, invalid seed errors, actual robot pause and BFS route, parameter changes/defaults, history reload/corruption rejection/replay/reset/clear, and reduced motion.

## Files changed

- Algorithms: `src/algorithms/finiteMdp.ts` (new); validation and numerical handling in `bayes.ts` and `mdp.ts`. Correct BFS implementation retained.
- Simulation: `src/simulation/controller.ts`, `transport.ts`, `history.ts`, `historyValidation.ts` (new), `experiments.ts`, `sensor.ts`.
- Presentation: `src/App.tsx`, `AgentSetup.tsx`, `BayesianPanel.tsx`, `DecisionPanel.tsx`, `ExperimentLab.tsx`, `SensorMonitor.tsx`, `SimulationMonitor.tsx`, `styles.css`, `src/motion/MotionPlayback.tsx`, `presentation.ts`.
- Verification: new `tests/finite-mdp.test.mjs`, `tests/audit.test.mjs`, `scripts/browser-audit.mjs`; aligned simulation, controls, motion, features, and baseline MDP tests with the live policy.
- Environment/docs: `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`, `index.html`, `public/favicon.svg`, `README.md`, `AUDIT.md`.

No dependencies were added. No repository metadata was present, so no Git diff or commit is claimed. Generated screenshots, browser profiles, and diagnostic logs remain in ignored `.qa/`.
