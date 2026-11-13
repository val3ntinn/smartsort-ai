# SmartSort AI

A local React + TypeScript recycling-robot simulation for an AI Fundamentals demonstration. Vite, Tailwind CSS, Motion, and Lucide provide the interface; no backend, external AI API, or database is required.


## Problem statement

An autonomous sorting agent must identify recyclable material from imperfect observations, decide whether further inspection is worthwhile, and navigate to a bin without crossing obstacles. A wrong sensor reading can lead to a wrong sort. This project makes that uncertainty and the subsequent decisions visible and testable.

## Project objectives

- Apply sequential Bayesian inference to Plastic/Paper classification.
- Use a finite-horizon belief-state MDP to compare sorting with further inspection.
- Find a shortest obstacle-avoiding route with BFS on a 4x4 floor.
- Connect the algorithms through one controller with truthful intermediate outputs.
- Support reproducible experiments, local replay, independent Python verification, and an undergraduate oral defense.

## Technology stack

React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, Motion for React, and Lucide icons. Node's built-in test runner provides automated tests. Python standard libraries provide the independent academic notebook. Exact JavaScript dependencies are recorded in `package-lock.json`; the website uses no Python backend, database, or external AI API.

Academic deliverables: [executed Python notebook](notebooks/SmartSort_AI_Algorithms.ipynb), [defense script and 15 questions](docs/DEFENSE_GUIDE.md), [three reproducible demonstrations](docs/DEMO_SCENARIOS.md), and [verification report / submission checklist](docs/SUBMISSION_REPORT.md).

## Run and verify

Node 22.6+ is required (verified with Node 24).

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

Open http://127.0.0.1:5173. Start the development server before running the optional real-browser audit:

```sh
npm run test:browser
```

The browser audit uses installed Chrome/Chromium, an isolated generated profile, and Node's built-in CDP/WebSocket support. Set `CHROME_PATH` if Chrome is not in a standard location. For production checks, run `npm run preview` and set `SMARTSORT_AUDIT_URL` to `http://127.0.0.1:4173/` before running the audit. It writes screenshots under ignored `.qa/`; Vite excludes that directory from watching to avoid Windows browser-profile locks.

## Agent pipeline

1. Choose Plastic bottle, Paper sheet, or Cardboard box (Paper category). The robot carries this object from the chosen start.
2. Edit obstacles or the robot start. The Plastic bin [0,3] and Paper bin [1,3] are protected.
3. Start Simulation. A seeded imperfect sensor or a predefined observation script produces a reading.
4. Bayesian inference updates the current belief.
5. Finite-horizon MDP planning evaluates sorting now versus inspecting and following an optimal future policy.
6. Inspection carries the previous posterior forward as the next prior. Sorting chooses the bin from the inferred material, not ground truth.
7. BFS explores actual traversable cells, reconstructs its shortest path, and the robot follows those exact edges.
8. The result compares the chosen bin with the object's true category. Wrong readings can produce an incorrect result; the application does not silently repair them.

## Bayesian inference

Default priors are 0.5 / 0.5. The default observation matrix is:

| Observation | Given Plastic | Given Paper |
| --- | ---: | ---: |
| PLASTIC | 0.9 | 0.2 |
| PAPER | 0.1 | 0.8 |

`posterior(material) = likelihood(observation | material) * prior(material) / evidence`, with evidence equal to the sum of the two weighted likelihoods. A PLASTIC reading gives 81.82% Plastic / 18.18% Paper; PAPER gives 11.11% / 88.89%. Values are calculated and rounded only for presentation. Reinspection uses the previous posterior, never an automatic reset to 50/50. Invalid distributions and impossible zero-evidence readings are rejected.

## Genuine finite-horizon MDP

The active planner is `src/algorithms/finiteMdp.ts`. The state is `(belief over Plastic/Paper, additional sensor reads remaining)`. The hidden true material stays fixed; the Bayesian belief is the sufficient observed state. This is a belief-state MDP representation of a small partially observed problem.

Actions and immediate rewards relative to the proposed MAP material:

| Action | Correct | Wrong |
| --- | ---: | ---: |
| SORT | +10 | -8 (configurable) |
| INSPECT AGAIN | +3 | +2 |

SORT terminates. INSPECT AGAIN receives its expected immediate reward and transitions to the next Bayesian belief, with `P(observation | belief) = sum P(observation | material) * belief(material)`.

With h further observations available and discount 1:

```text
V_0(b) = max(0, R_SORT(b))
V_h(b) = max(
  R_SORT(b),
  R_INSPECT(b) + sum_O P(O | b) * V_(h-1)(Bayes(b,O))
)
```

At h=0, inspection is unavailable. A profitable SORT terminates; otherwise the agent ends unresolved with value 0. The controller never collects more than the configured inspection limit. Impossible observation branches have weight zero. Memoization avoids repeating the same belief/horizon calculation. The planner cannot see future seeded/scripted readings or object ground truth.

The immediate-reward helper in `src/algorithms/mdp.ts` remains as a tested baseline and to validate/replay historical one-step records. It is **not** the active sequential policy.

Example after one default PLASTIC reading, with two further reads available:

- Immediate expected SORT reward: 6.7273.
- Immediate expected INSPECT reward: 2.8182.
- Sequential Q(SORT): 6.7273.
- Sequential Q(INSPECT): 14.3745, including expected future value.

The policy therefore inspects again. Since the specified inspection rewards are positive, using the entire finite budget can be optimal. This is a consequence of the reward definition, not a forced UI decision. The panel displays immediate rewards, actual Bellman action values, observation transitions, and remaining horizon separately.

## Breadth-first search

The navigation graph has 16 cells with four-directional, unit-cost edges. Cell ID is `4*row+column`, using zero-based coordinates. The default robot start is 12 = [3,0]; Plastic bin is 3 = [0,3], Paper bin is 7 = [1,3]. User obstacles and the non-target bin are blocked. BFS uses a FIFO queue, discovery tracking, and parent links; neighbors are considered up, right, down, left. `visitedCells` records dequeue order, and `pathLength` counts moves, not cells. An unreachable target returns an empty path, `null` length, and `pathFound: false`.

FIFO layers guarantee a minimum-edge route on this static, unweighted graph. Complexity is O(V+E) time and O(V) space. See `src/algorithms/bfs.ts`.

## Controls and interaction

Automatic mode executes all stages. Step-by-Step Mode initially pauses after object selection, then after Sensor, Bayes, MDP, optional Reinspection, BFS exploration, Path reveal, and Robot arrival; the final step presents the result.

Pause stops the scheduler and registered visual interpolation. Resume retains the exact state. Next Step finishes the current major stage, including its individual BFS cells or robot moves. Speed changes replace future timing without recalculating outputs. Mode changes while paused keep the pause until Resume/Next Step. Setup editing is locked during a live or paused run; duplicate Start actions cannot create overlapping runs.

Reset cancels pending callbacks and transient visuals, restores the default simulation setup while preserving interface speed/mode, and clears the live log and outputs. It preserves completed History; Clear History is the explicit browser-data action. Guides trap keyboard focus and restore it on close. Mobile navigation has named controls, a close button/backdrop, and Escape handling. Reduced-motion preferences disable interpolation and activity pulses without changing results.

## Sensor monitor and Experiment Lab

The waveform is a labeled schematic scanning-activity indicator, not physical telemetry. The monitor shows real readings, configured likelihoods, calculated confidence, pause/completion/error states, and no invented measurements.

Experiment Lab controls mean class accuracy (50-95%), incorrect-sort penalty (0-40), and maximum inspections (1-10; default 3). Class accuracies retain the original five-point asymmetry: Plastic accuracy = mean + 0.05; Paper accuracy = mean - 0.05. Complementary observation probabilities remain normalized.

Original/modified previews run the real bounded agent with the same object, grid, prior, and reproducible sensor source. Changed accuracy can change seeded observations. Configured trials use their actual parameters and sequential decisions. Preview trials do not create history entries. Active runs retain an immutable configuration snapshot; parameter edits are disabled until completion or Reset.

To demonstrate repeated updates with the original model, select Paper sheet and a three-read limit, set initial Plastic prior to 20%, and enter PLASTIC,PAPER,PAPER. To demonstrate safe unresolved classification, use 50% mean accuracy and a wrong-sort penalty of 40. To demonstrate unreachable navigation, block [0,2] for a Plastic destination; the protected Paper bin closes the other entrance.

## History and replay integrity

The latest ten completed runs are stored under `smartsort.history.v1`, with observations, Bayesian results, decisions, config, destination, BFS data, log, outcome, and compact execution frames. Storage errors fall back to in-memory history with a visible notice.

Stored records are checked structurally **and semantically** before replay: Bayesian calculations, the recorded sequential or legacy policy, BFS outputs, stage order, counters, legal robot edges, and terminal outcome must agree. Corrupt/teleporting/truncated records are rejected rather than animated. Valid historical one-step decisions are labeled as legacy and reproduced faithfully.

Replay reconstructs the saved observations, decisions, and route frames. It does not collect a new reading or substitute today's policy. Pause, manual stepping, speed, and Reset work during replay. Replay does not add a duplicate history entry. Clear History does not mutate an already loaded replay. Live refresh clears the in-progress run; completed browser records persist.

## Architecture and audit

- `src/algorithms/`: Bayes, immediate reward baseline, finite-horizon Bellman planning, and BFS.
- `src/simulation/controller.ts`: pure algorithm-stage and robot-step transitions.
- `src/simulation/transport.ts`: synchronous controls, one cancellable timer, and replay playback.
- `src/simulation/history*.ts`: compact saved frames, validation, and safe storage.
- `src/useSimulation.ts`: React binding to transport and history stores.
- `src/motion/`: cancellable interpolation, presentation projections, robot orientation, and reduced motion.
- UI components consume actual controller outputs. Memoized algorithm panels and a stable playback context avoid unnecessary renders during cell playback.

See `AUDIT.md` for findings, fixes, verified checks, and remaining limitations. Tests use Node's built-in runner; no extra test framework or application dependency was added.


## Interface preferences and shortcuts

The sidebar switches between the full navigation and a 68px icon rail. Tablet defaults to the rail unless a preference was explicitly saved. Mobile uses a slide-out drawer with focus containment, Escape dismissal, and automatic closure after navigation. Rail labels appear as accessible hover/focus tooltips. Width transitions take 210ms and respect reduced motion.

Open **Keyboard shortcuts** near the bottom of the sidebar for help. On Simulator, **Space** starts/pauses/resumes, **R** resets, and **N** advances a paused step-by-step run. **Ctrl/Cmd+B** toggles navigation across views. Typing, form controls, composition, held keys, and open dialogs do not trigger commands. Focused buttons retain native Space activation.

Only sidebar preference, animation speed, and playback mode are stored under `smartsort.interface.v1`; simulation history uses its separate existing key. Malformed or unavailable storage falls back safely. Reset cancels the run while retaining interface preferences. No algorithm or history format changes are involved.

## Python notebook: installation and execution

Use Python 3.10+ (verified with 3.13.2). The notebook algorithms and supplied runner require **only standard libraries**. From the repository root:

```sh
node --experimental-strip-types scripts/submission-fixtures.mjs --check
python scripts/run_notebook.py
```

The first command verifies seven saved results against the actual TypeScript controller. The second executes every notebook code cell, checks its assertions including Python/TypeScript parity, and saves execution counts and real stdout outputs in `notebooks/SmartSort_AI_Algorithms.ipynb`. It is a sequential Python runner, not a Jupyter kernel; it supports this notebook's ordinary Python cells, not arbitrary notebook magics or rich display. A failing assertion returns a nonzero exit code.

To open interactively, use VS Code's Jupyter extension with a Python kernel, or optionally install Jupyter in your own environment:

```sh
python -m pip install notebook ipykernel
python -m notebook notebooks/SmartSort_AI_Algorithms.ipynb
```

Then choose **Restart Kernel and Run All**. Jupyter is an optional authoring dependency, not needed by the website or standard-library runner. This submission executed the cells with Python directly; a Jupyter kernel was unavailable in the preparation environment. Keep `reference_results.json` beside the notebook. Open the notebook from the repository root or its `notebooks` directory.

If algorithms intentionally change later, regenerate references with `node --experimental-strip-types scripts/submission-fixtures.mjs`, review the changed outputs and demo tables, and rerun Python. Never modify expected numbers merely to silence a mismatch.

## Example input and output

Default Plastic bottle, start cell 12, no obstacles, priors 0.5/0.5, seed 42, accuracy 85%, penalty 8, inspection cap 3:

```text
Observations: PLASTIC, PLASTIC, PLASTIC
Plastic posteriors: 81.818182%, 95.294118%, 98.914518%
Decisions: INSPECT AGAIN, INSPECT AGAIN, SORT
First Q(SORT): 6.727273; Q(INSPECT AGAIN): 14.374545
Destination: Plastic bin, cell 3
BFS route: 12 -> 8 -> 4 -> 0 -> 1 -> 2 -> 3
Result: correct; 3 inspections; 6 moves; 15 cells dequeued
```

These values come from the real controller and the executed Python notebook. [DEMO_SCENARIOS.md](docs/DEMO_SCENARIOS.md) also provides an uncertain Paper example and a five-move obstacle detour, with exact configuration steps and intermediate calculations.

## Limitations

This is model-based educational planning, not trained machine learning or a hardware recycling system. It assumes two classes, fixed known likelihoods, conditional independence of readings given material, static obstacles, and deterministic unit-cost movement. Cardboard maps to Paper. Positive inspection rewards can encourage spending the full finite budget. A confident classification can still be wrong. No camera, physical sensor telemetry, hardware control, or online learning is implemented.

The notebook verifies mathematics and final algorithmic outcomes; it does not implement UI scheduling or browser persistence. History and preferences are browser-local and may be unavailable under restrictive storage policies. Chromium automation and desktop/mobile screenshots were used; Firefox, Safari, physical touch devices, and manual screen-reader testing are not claimed. See [SUBMISSION_REPORT.md](docs/SUBMISSION_REPORT.md) for the checks actually executed for this handoff.
