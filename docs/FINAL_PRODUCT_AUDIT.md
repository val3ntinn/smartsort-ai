# SmartSort AI — final product audit

Audit date: 25 November 2026. Scope: all six views, shared navigation, simulation controls, reference examples, experiment configuration, history, and accessible interaction. This is an implementation-based expert review, not a user research study or a WCAG certification.

## Assessment

The interface has a credible scientific-workspace identity. Its strongest elements are the actual sorting floor, restrained material colors, visible reasoning, and differentiated analytical and documentation layouts. It avoids repeated KPI cards, invented statistics, decorative charts, gradients, and marketing-dashboard composition. The remaining weaknesses are compact technical typography, long mobile reading paths, and a conventional navigation shell. Those prevent an exceptional score. No critical functional defect was found in the exercised workflows; several genuine accessibility and alignment defects were found and corrected.

| Dimension | Score / 10 | Basis |
| --- | ---: | --- |
| Visual identity | 7.5 | The floor, route language, instrument readouts, and model-specific content give identity. System fonts and the familiar sidebar still feel conventional. |
| Typography | 7.5 | Editorial hierarchy and tabular numbers work. Twelve-pixel metadata and mobile calculation tables remain compact. |
| Layout | 8 | The simulator, analytical comparison, documentation, and ledger have different compositions. Narrow screens require substantial vertical travel. |
| Usability | 8 | Actions and model states are genuine; deterministic inputs and replay support explanation. Newcomers still need guidance on belief, horizon, and the inspection reward. |
| Responsiveness | 8 | All requested dimensions pass browser overflow checks; navigation, stacking, touch controls, and modal containment were exercised. Physical-device and cross-browser validation remain outstanding. |
| Accessibility | 7.5 | Named sliders, skip navigation, focus handling, tabs, reduced motion, text contrast checks, and touch improvements are verified. No real screen reader or comprehensive conformance audit was performed. |
| Overall polish | 7.8 | Coherent and usable, with confirmed defects corrected. Strong educational software, with limitations before a broad production claim. |

Scores are professional judgments rather than automated measurements.

A medium-priority maintenance risk remains: the legacy layout stylesheet is large and contains successive overrides. The browser matrix protects the audited breakpoints, but future layout changes need regression checks. A broad stylesheet rewrite was deliberately outside these confirmed corrections.

## Confirmed problems and corrections

| Priority | Finding and impact | Implemented correction |
| --- | --- | --- |
| High | All three Lab sliders lacked names in the accessibility tree. Their wrapping labels contained an `output` before the input, so the implicit association did not name the slider. Screen reader users could not identify the parameter. | Explicit input IDs, `htmlFor`, accessible names, descriptive relationships, and value text with units. Visible duplicate outputs are hidden from accessibility APIs. Actual Chromium AX slider names are checked. |
| High | No bypass link for persistent navigation. Keyboard users had to traverse repeated shell controls to reach the workspace. | A first-in-DOM, focus-visible “Skip to workspace” link and a programmatically focusable main target. Browser activation verifies that focus reaches main. |
| Medium | The environment heading and editing toolbar overlapped on desktop. This obscured the title and weakened control grouping. | Compact two-line title on desktop, horizontal title on mobile, and a geometric overlap assertion at every tested desktop width. |
| Medium | Blocked cells in the Algorithms diagram used muted text at approximately 4.46:1 against the obstacle surface, below AA for normal text. Live obstacle coordinates shared the same token pairing. | Secondary text for blocked labels and coordinates, including the diagram's explicitly styled child label. Initial reference contrast and edited live-grid coordinate contrast are checked. |
| Medium | Some compact controls met desktop target needs but were undersized for comfortable touch operation. | Coarse-pointer rules enlarge simulation buttons, grid tools, reasoning tabs, disclosures, selects, icon buttons, range hit areas, and step-mode labels. Representative compact controls are checked at 44px minimum height in touch emulation. |
| Medium | The document title did not identify the current view. Browser tabs and assistive navigation provided weak location feedback. | Document title follows navigation: `View | SmartSort AI`. Verified on all six views. |
| Low | The History headline was a generic editorial phrase instead of identifying the utility. | Replaced it with “Simulation history.” |
| Low | Literal question marks appeared as separators in the shared footer. | Replaced them with intentional slash separators. |

The first expanded browser run exposed the label and contrast defects. A later run caught inherited coordinate color that the initial parent-color correction did not override. Final validation follows those corrections; intermediate failures were not treated as passes.

## Page findings

### Overview

The workflow explains what the agent does and offers a direct Simulator entry. The three workflow sections represent distinct model responsibilities rather than repeated decorative cards. The opening uses more vertical space than a pure control application would need, but this is an introductory view rather than the default operating screen. Preserve its instructional role; do not add hero art or statistics. Remaining weakness: the headline has less immediate utility than the explanatory paragraph beneath it.

### Simulator

The grid is the central object; the reasoning inspector is secondary, and execution details sit below. The title/tool collision was the main visual defect and is corrected. Editing, fixed bins, source configuration, transport, inspector tabs, and stage following are functional. Metadata remains dense and often 12px. On a small phone the complete floor and reasoning cannot share the first viewport; deliberate vertical scrolling is required. No attempt was made to squeeze them into unreadable side-by-side panels.

### Experiment Lab

Inputs, computed outputs, interpretation, and detailed comparisons form a useful analytical hierarchy. Original/modified summaries show actual trials, not performance claims. Slider naming was a serious accessibility defect and is corrected. The full comparison is long on mobile and uses compact table text. Preserve the explicit distinction between preview trials and saved live runs.

### Algorithms

Mathematical explanations are connected to working local examples. Immediate expected rewards and finite-horizon action values are distinct, avoiding a misleading comparison. Reference examples do not mutate the live configuration or History. Blocked-cell contrast is corrected. The long reference layout is appropriate for study but not quick scanning; its contents index remains important. Dense mobile tables and formulas deserve future reader testing rather than more graphics.

### History

Rows expose object, time, result, inspections, destination, and replay. Selecting a record reveals real observations, posterior, decision, route, and configuration. The more literal title improves discoverability. Empty, active-run, storage-warning, and populated states are meaningful. On narrow layouts, details follow the list; with ten records this can require substantial scrolling. Browser-local retention is explicitly explained and is not an archival guarantee.

### About

Purpose, model architecture, declared technology ranges, scope, and reproducibility are readable documentation. It does not duplicate a dashboard or invent team/product claims. This page needs less visual emphasis than the operational views and correctly receives it. Remaining weakness: long technical paths and formulas elsewhere still require careful reading on mobile, although tested layouts wrap without page overflow.

## User journey and interactions

| Journey step | Finding / evidence |
| --- | --- |
| Open application | Simulator is the default; working controls and real empty states appear immediately. |
| Understand project | Overview explains the complete pipeline; guide and About provide context. No external participant comprehension study was conducted. |
| Reach Simulator | Sidebar navigation and Overview entry CTA tested; current page survives sidebar toggling. |
| Configure environment | Object selection, sensor disclosure, keyboard grid movement, obstacle toggle, robot placement, and protected bins tested. |
| Run agent | Start, physical pause, resume, stepping, speed, reset, stage following, and repeated execution tested. |
| Understand Bayes | Displayed 81.82% / 18.18% result checked against the real output; both reference observations tested. |
| Interpret decision | Inspector keyboard tabs and finite-horizon examples tested; immediate reward and full action value remain separate. |
| Use Lab | Parameter recalculation, defaults, active-run locking, AX names, and preview isolation tested. |
| Read explanations | Page contents and native disclosures inspected; real observation/horizon/BFS example changes tested. |
| Review History | Completion persistence, record details, replay/reset, replay completion, corrupt-record rejection, and Clear History tested. |

Buttons, native selects, disclosures, inputs, tabs, dialogs, tooltip triggers, and empty-state CTAs have operational purposes. Loading fallback and page error boundary exist in source; failed lazy-chunk loading was not fault-injected. Storage failures and invalid model inputs are covered by automated tests. No decorative controls were added.

## Responsive and accessibility evidence

Chromium rendered all six views at **1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, and 375×667**, plus 320×900: **48 page/viewport combinations**. No document-level horizontal overflow was found. Screenshots were captured at all eight widths, with full-page captures at 1440 and 390. Screenshots of every page and representative full-page/mobile compositions were visually inspected; this does not imply a manual inspection of every pixel in every capture. Existing laptop composition, populated ledger, rail, drawer, and modal checks also ran.

Checks include one main h1 per view; nonempty visible control names; sub-24px control rectangles (excluding checkbox/radio controls whose label hit areas apply); conservative computed normal/large-text contrast checks in initial states; a live obstacle coordinate contrast check; actual slider AX names; skip-link focus; page titles; native keyboard behavior; tab navigation; focus traps/restoration; dismissible tooltips; drawer Escape/close behavior; reduced motion; and emulated coarse-pointer targets/modal bounds. These are scoped checks, not proof of complete WCAG 2.2 AA conformance. The text-contrast scanner does not prove contrast for every opacity, gradient, SVG, overlay, animation frame, or state.

No Safari/Firefox, physical touch device, NVDA/JAWS/VoiceOver, forced-colors, or real-user assistive-technology session was available. Browser zoom and platform text scaling were not separately certified. Compact typography and mobile scroll distance remain design tradeoffs, not concealed passes.

## Regression and validation

- `npm test`: **101 passed**, zero failures, skipped, or cancelled. Covers Bayes, one-step and finite-horizon MDP, BFS, integration scenarios, transport/reset, sensor model, preferences, persistence, deterministic replay, and presentation synchronization.
- `npm run typecheck`: passed.
- `npm run build`: passed after final corrections.
- `npm run test:browser`: passed after final corrections; no runtime exceptions or unexpected console warnings. Motion's development advisory confirming reduced-motion emulation is expected.
- Lint: **not run** because the repository has no lint script or installed linter configuration. No dependency was installed merely to manufacture a lint result.
- The 32-file protected baseline differs only in `src/simulator.css`, whose presentation changes are intentional. Algorithm, controller, transport, storage, preferences, robot, and other protected functional sources remain byte-identical.

Evidence is generated under ignored `.qa/`: `final-browser.txt`, `final-tests.txt`, `final-build.txt`, `final-rendered-findings.json`, `final-slider-accessibility.json`, and rendered screenshots. These are local verification artifacts, not application content or user history.

## Final changed files

1. `src/App.tsx` — skip link/main target, view-specific document titles, footer punctuation.
2. `src/ExperimentLab.tsx` — explicit slider labels, descriptions, and value units.
3. `src/HistoryView.tsx` — direct utility heading.
4. `src/simulator.css` — title/tool spacing and obstacle-coordinate contrast.
5. `src/pages/pages.css` — blocked reference-cell text contrast.
6. `src/design-system/primitives.css` — bypass-link styling and coarse-pointer hit areas.
7. `scripts/browser-audit.mjs` — requested viewport matrix, screenshots, rendered checks, AX verification, skip link, titles, touch/modal checks, heading-overlap and live obstacle contrast regression checks.
8. `docs/FINAL_PRODUCT_AUDIT.md` — this report.

No algorithms, simulation behavior, storage schema, dependencies, or unrelated features were changed. Local launch remains `npm run dev`, then `http://localhost:5173`.
