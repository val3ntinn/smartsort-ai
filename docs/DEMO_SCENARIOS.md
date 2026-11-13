# Reproducible live demonstrations

These results were produced by `src/simulation/controller.ts` through `scripts/submission-fixtures.mjs`, then independently reproduced in Python. Full-precision inputs and outputs are in [`../notebooks/reference_results.json`](../notebooks/reference_results.json). Tables round for presentation only. The planner does not read the future predefined observations.

## Before presenting

1. From the repository root run `npm ci`, then `npm run dev`. Open http://127.0.0.1:5173 (or the port Vite prints if occupied).
2. Open Simulator. Use **Reset simulation before each scenario**: it restores the object, seed, priors, grid, and model parameters. Reset retains interface speed/mode and completed History.
3. Set Normal speed. Choose Automatic mode for A/C; use Step-by-Step Mode for B. Next Step completes a major stage; multiple presses are needed to finish a whole run. Space on the page starts/pauses/resumes; it does not override focused form controls or buttons.
4. The default model is mean accuracy 85% (Plastic 90%, Paper 80%), wrong-sort penalty 8, and maximum 3 inspections. Priors are 50/50 unless specified below. The non-target bin is always blocked during BFS.
5. Cell IDs use `4*row+column`, with zero-based coordinates. Robot default: 12 = [3,0]; Plastic bin: 3 = [0,3]; Paper bin: 7 = [1,3].

## Scenario A — Successful plastic sorting

After Reset, keep **Plastic bottle**, robot [3,0], no obstacles, equal priors, sensor seed **42**, default model, and maximum **3** inspections. Turn Step-by-Step Mode off and click Start Simulation.

Input: the seeded sensor produces **PLASTIC, PLASTIC, PLASTIC**. The default rewards make two further inspections optimal; this scenario must not be described as sorting immediately after the first reading.

### Expected intermediate calculations

| Read / observation | Evidence | Posterior Plastic | Posterior Paper | Further reads h | Q(SORT) | Q(INSPECT) | Action |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 / PLASTIC | 0.55000000 | 81.818182% | 18.181818% | 2 | 6.727273 | 14.374545 | INSPECT AGAIN |
| 2 / PLASTIC | 0.77272727 | 95.294118% | 4.705882% | 1 | 9.152941 | 12.105882 | INSPECT AGAIN |
| 3 / PLASTIC | 0.86705882 | 98.914518% | 1.085482% | 0 | 9.804613 | Unavailable | SORT |

First evidence: `0.45000000 + 0.10000000 = 0.55000000`. Immediate rewards at that reading: SORT `6.727273`, INSPECT `2.818182`. Q(INSPECT) includes future value when available; it is not just the immediate reward.

### Expected route and result

- Destination: **PLASTIC**, cell 3.
- Path IDs: `12 → 8 → 4 → 0 → 1 → 2 → 3`.
- Coordinates: `[3,0] → [2,0] → [1,0] → [0,0] → [0,1] → [0,2] → [0,3]`.
- Shortest path: **6 moves**; **15 cells dequeued**.
- BFS dequeue order: `12, 8, 13, 4, 9, 14, 0, 5, 10, 15, 1, 6, 11, 2, 3`.
- Result: `Correctly sorted into PLASTIC bin after 3 inspection(s) and 6 moves.`

### Explain to the instructor

Bayes increases confidence by reusing each posterior. After the first reading, immediate SORT is 6.727273, but sequential INSPECT is 14.374545, so the finite-horizon policy inspects. With no further reads, SORT is selected. The seed makes the observation sequence reproducible; it is not a guarantee of accuracy for other objects or seeds.

## Scenario B — Uncertain observation followed by reinspection

After Reset, select **Paper sheet**. Open **Sensor & reproducibility**, select **Predefined observations**, enter `PLASTIC,PAPER,PAPER`, and set **Initial Plastic prior to 20%** (Paper 80%). Keep the default model, limit 3, start [3,0], and no obstacles. Enable Step-by-Step Mode and click Start Simulation.

Use Next Step through Sensor, Bayes, MDP, and Reinspect. Pause at each MDP output. The first PLASTIC observation is wrong relative to this selected object's true Paper category, but the planner does not know that truth. Continue until the result is shown.

### Expected intermediate calculations

| Read / observation | Evidence | Posterior Plastic | Posterior Paper | Further reads h | Q(SORT) | Q(INSPECT) | Action |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 / PLASTIC | 0.34000000 | 52.941176% | 47.058824% | 2 | 1.529412 | 13.232941 | INSPECT AGAIN |
| 2 / PAPER | 0.42941176 | 12.328767% | 87.671233% | 1 | 7.780822 | 10.657534 | INSPECT AGAIN |
| 3 / PAPER | 0.71369863 | 1.727447% | 98.272553% | 0 | 9.689060 | Unavailable | SORT |

First evidence: `0.18000000 + 0.16000000 = 0.34000000`. Immediate rewards at that reading: SORT `1.529412`, INSPECT `2.529412`. Q(INSPECT) includes future value when available; it is not just the immediate reward.

### Expected route and result

- Destination: **PAPER**, cell 7.
- Path IDs: `12 → 8 → 4 → 5 → 6 → 7`.
- Coordinates: `[3,0] → [2,0] → [1,0] → [1,1] → [1,2] → [1,3]`.
- Shortest path: **5 moves**; **15 cells dequeued**.
- BFS dequeue order: `12, 8, 13, 4, 9, 14, 0, 5, 10, 15, 1, 6, 11, 2, 7`.
- Result: `Correctly sorted into PAPER bin after 3 inspection(s) and 5 moves.`

### Explain to the instructor

The first posterior is only 52.94% Plastic. A subsequent Paper reading changes the most likely material to Paper. At the second decision the model still favors inspection because the specified inspection rewards are positive. The third reading reaches 98.27% Paper. Never reset the prior to 50/50 between readings.

## Scenario C — BFS navigation around an obstacle

After Reset, open Experiment Lab and set **Maximum inspections to 1**; keep accuracy 85% and penalty 8. Return to Simulator. Keep Plastic bottle and equal priors. Under Sensor & reproducibility choose **Predefined observations** and enter `PLASTIC`. Select **Robot start**, click [0,0], then select **Obstacles** and click [0,1]. This creates start ID 0 and obstacle ID 1. Plastic bin remains [0,3]; Paper bin [1,3] is protected.

Turn Step-by-Step Mode off and start. Pause during BFS if desired. This scenario isolates navigation after one observation; inspection is unavailable at horizon zero.

### Expected intermediate calculations

| Read / observation | Evidence | Posterior Plastic | Posterior Paper | Further reads h | Q(SORT) | Q(INSPECT) | Action |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 / PLASTIC | 0.55000000 | 81.818182% | 18.181818% | 0 | 6.727273 | Unavailable | SORT |

First evidence: `0.45000000 + 0.10000000 = 0.55000000`. Immediate rewards at that reading: SORT `6.727273`, INSPECT `2.818182`. Q(INSPECT) includes future value when available; it is not just the immediate reward.

### Expected route and result

- Destination: **PLASTIC**, cell 3.
- Path IDs: `0 → 4 → 5 → 6 → 2 → 3`.
- Coordinates: `[0,0] → [1,0] → [1,1] → [1,2] → [0,2] → [0,3]`.
- Shortest path: **5 moves**; **11 cells dequeued**.
- BFS dequeue order: `0, 4, 5, 8, 6, 9, 12, 2, 10, 13, 3`.
- Result: `Correctly sorted into PLASTIC bin after 1 inspection(s) and 5 moves.`

### Explain to the instructor

The direct three-move top-row route is blocked at [0,1]. BFS goes down and around, producing a five-move route. FIFO exploration is genuine and differs from the final path. The other bin is blocked. The shortest route is guaranteed only for this static, unweighted grid with four-directional motion.

## Recovery and reproducibility

If values differ, Reset and check the observation source, prior, model parameters, inspection limit, robot start, and obstacle set. History replays saved outputs; it is not a fresh run under today's settings. Use a new live run for each scenario.

To reproduce outside the browser:

```sh
node --experimental-strip-types scripts/submission-fixtures.mjs --check
python scripts/run_notebook.py
```

The seven reference checks cover the same pure controller used by React. Browser controls, animations, persistence, and layout are verified separately by `npm run test:browser`. These demo calculations are not inferred from screenshots or invented placeholder statistics.
