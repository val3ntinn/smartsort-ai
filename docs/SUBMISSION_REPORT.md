# Final university submission report

Prepared on 12 November 2026. This handoff adds academic documentation, independent Python implementations, reproducible references, and verification. Existing frontend source and TypeScript algorithms were not changed.

## Deliverables

| File | Purpose |
|---|---|
| `notebooks/SmartSort_AI_Algorithms.ipynb` | Independent Python Bayes, finite-horizon belief-state MDP, BFS, sensor, integrated example, formulas, saved calculations, assertions, and seven cross-language comparisons. |
| `notebooks/reference_results.json` | Full-precision outputs from seven actual TypeScript controller runs, including all three demonstrations. Keep beside the notebook. |
| `scripts/run_notebook.py` | Standard-library sequential execution of this notebook's Python cells; saves real outputs and fails on exceptions/assertions. |
| `scripts/submission-fixtures.mjs` | Generate or check reference results directly through the unchanged application controller. |
| `tests/submission.test.mjs` | Seven regression tests locking the documented reference calculations, paths, and outcomes to the live controller. |
| `README.md` | Updated overview, problem/objectives, stack, architecture, algorithms, installation, notebook instructions, examples, features, and limitations. |
| `docs/DEFENSE_GUIDE.md` | Approximately 6–7-minute presentation with a short live demonstration, plus 15 likely instructor questions and answers. |
| `docs/DEMO_SCENARIOS.md` | Exact configuration, calculated probabilities/action values, routes, results, and teaching notes for scenarios A–C. |
| `docs/SUBMISSION_REPORT.md` | This verification record and submission checklist. |

## Verification results

Environment: Windows PowerShell, Node 24.18.0, Python 3.13.2, installed Chrome/Chromium. JavaScript dependencies were already installed; no new dependency was required. Installation instructions use the included lockfile with `npm ci`.

| Check actually executed | Result |
|---|---|
| `npm run typecheck` | Passed. |
| `npm test` | 94 passed; zero failures, skips, or cancellations. Includes Bayes, immediate-reward and finite-horizon MDP, BFS, controller integration, controls, motion, history/replay, preferences, and seven submission-reference tests. |
| `npm run build` | Passed with no build errors. |
| `node --experimental-strip-types scripts/submission-fixtures.mjs --check` | Seven saved references matched fresh runs of the real TypeScript controller. |
| `python scripts/run_notebook.py` | All six code cells executed successfully; all assertions passed; outputs and execution counts saved in the notebook. Seven integrated Python results matched the TypeScript references with numerical tolerance. |
| Notebook JSON/output inspection | Valid JSON, six consecutive execution counts, no saved error outputs. This is not a claim of third-party nbformat schema validation. |
| Production-browser regression | Passed against the production preview: 30 view/viewport combinations; sidebar, shortcuts, input protection, saved preferences, mobile focus/Escape, simulation controls, actual BFS robot route, Lab recalculation, history persistence/corruption rejection/replay/reset/clear, and reduced motion. No runtime exceptions or unexpected console warnings. |

Notebook edge cases include invalid observations/priors/model parameters/seed/grid inputs, zero evidence, probability normalization, unavailable terminal inspection, unresolved classification, impossible observation branches, unreachable targets, and start equal to target. Seven integration references cover A/B/C, Paper sorting, incorrect sorting from a misleading observation, unreachable navigation, and unresolved classification.

**Notebook execution distinction:** Python is available; `jupyter`, `nbformat`, `nbclient`, and `ipykernel` were not installed. Therefore the actual notebook code cells were executed top-to-bottom through the supplied standard-library runner, not a Jupyter kernel or `nbconvert`. Interactive Jupyter launch and rich notebook rendering were not tested. The notebook uses ordinary Python and stdout only; no magics or third-party package is needed by that runner.

## Exact reproduction commands

Run from the project root in PowerShell or a terminal. Node 22.6+ is required by the repository; Node 24 was verified. Python 3.10+ is recommended.

```sh
npm ci
npm run typecheck
npm test
npm run build
node --experimental-strip-types scripts/submission-fixtures.mjs --check
python scripts/run_notebook.py
npm run dev
```

Open http://127.0.0.1:5173 (or the actual port printed by Vite). The notebook runs independently of the website; no server is needed for it. For an optimized local site, run `npm run preview` after building and open http://127.0.0.1:4173.

For the same production-browser audit used here, leave preview running in one terminal. In another PowerShell terminal:

```powershell
$env:SMARTSORT_AUDIT_URL='http://127.0.0.1:4173/'
npm run test:browser
```

The browser script needs installed Chrome/Chromium or a compatible Edge executable; set `CHROME_PATH` if needed. It uses an isolated profile and writes screenshots/logs under ignored `.qa/`. A different port printed by Vite must also be used in `SMARTSORT_AUDIT_URL`.

Optional interactive notebook environment (installation and launch not executed here):

```sh
python -m pip install notebook ipykernel
python -m notebook notebooks/SmartSort_AI_Algorithms.ipynb
```

Select a Python kernel, then Restart Kernel and Run All. The standard-library runner is the verified zero-install alternative.

## Remaining limitations / not tested

- Fixed known sensor likelihoods, conditionally independent readings given material, two classes, cardboard mapped to Paper, a static 4x4 floor, and deterministic unit-cost movement simplify real robotics.
- Positive inspection rewards can favor consuming the whole bounded inspection budget. This is a reward-model consequence, not a hardcoded inspection sequence.
- This is model-based planning, not training, online learning, computer vision, a physical sensor, or hardware deployment. Confidence can be high and still wrong.
- History and preferences are browser-local. The Python notebook reproduces algorithms and outcomes, not UI animation timing, browser storage, or replay transport.
- No Firefox/Safari, physical touchscreen, or manual screen-reader verification is claimed. No formal accessibility or hardware-safety certification is implied.
- A Jupyter kernel/UI was unavailable. Python execution was verified as described above. No remote hosting, grading environment, or presentation-machine installation was tested.
- No Git repository metadata was present. No commit, Git diff, deployment, or submission archive is claimed.

## Final submission checklist

- [x] Include complete `src/`, `public/`, `index.html`, Vite/TypeScript config, `package.json`, and `package-lock.json`.
- [x] Include the notebook **with executed outputs** and its sibling reference JSON.
- [x] Include both reproduction scripts and all tests, including submission-reference tests.
- [x] Include README, defense guide, demo scenarios, this report, and existing AUDIT.md.
- [x] Explain immediate reward versus Bellman action value, finite terminal conditions, and positive inspection rewards consistently.
- [x] Preserve existing frontend functionality and algorithms; add no product feature or backend.
- [x] Execute TypeScript, production build, full test suite, reference checks, and Python assertions.
- [x] Complete the production Chromium browser audit with no runtime exceptions or unexpected console warnings.
- [ ] On the presentation machine, run `npm ci` while network access is available and verify the printed local port.
- [ ] Rehearse the timed script and all three scenarios; prepare Scenario B before speaking.
- [ ] Confirm course-specific title page, student details, naming rules, and submission format with the instructor. These details were not supplied and have not been invented.
- [ ] When creating a submission archive, exclude `node_modules/`, `.qa/`, `*.tsbuildinfo`, and optional local virtual environments. Generated `dist/` is optional; source and lockfile are essential.
