# Reference and analysis page redesign

## Page purposes

The five remaining pages now use the existing instrument palette, typography, controls, focus, and motion rules with different compositions:

- **Overview:** an editorial introduction, real capability boundaries, a connected Observe / Reason / Act workflow diagram, and direct entry to Simulator, Algorithms, Experiment Lab, and History. No promotional metrics or generic AI illustration.
- **Experiment Lab:** configuration context and parameter controls beside computed outcomes, followed by interpretation and a grouped comparison ledger. A final-posterior composition chart displays actual probabilities with material labels. Changed values are emphasized. The existing automatic preview, parameter bounds, source handling, active-run locking, and Reset to Defaults behavior remain.
- **Algorithms:** a technical reference with a contents index, mathematical explanations, steps, and independent interactive examples. Sensor observation selection calls the existing Bayes module; the horizon control calls the real finite-horizon solver; the route diagram calls BFS with the chosen destination and optional obstacle. Examples are explicitly default-model references, not live Simulator runs, and do not write History or change Simulator configuration.
- **History:** newest-first local execution records with readable timestamps, outcomes, inspections, destinations, replay, and a selected-record evidence sheet. Empty, storage-warning, invalid-record, busy-replay, and playback-error states remain informative. No filtering feature or fabricated record was introduced.
- **About:** project documentation covering educational objectives, the actual model/controller/transport/presentation architecture, assumptions, reproducibility, and declared technology ranges imported from package.json. It is distinct from Overview and does not imply hardware, training, or a backend.

## Shared shell

Navigation is grouped into Laboratory (Simulator, Experiment Lab, History) and Reference (Overview, Algorithms, About). All six destinations and their active states remain. The fake profile/account block, decorative workspace number, and stale version badge were removed. Collapse, rail tooltips, persistence, mobile drawer, Escape, focus containment, shortcuts, and reset behavior are retained.

The header now identifies Laboratory or Reference rather than repeating Workspace everywhere. Internal page-entry buttons restore the new heading's focus for keyboard users. The footer states the actual educational/local-execution context.

Non-Simulator pages are lazy-loaded. Suspense shows a real loading state; a failed page load has a boundary that returns to the already available Simulator without resetting its controller. This removes the initial oversized-chunk warning instead of increasing its threshold.

## Implementation

New files:

- `src/pages/OverviewPage.tsx`
- `src/pages/AlgorithmsPage.tsx`
- `src/pages/AboutPage.tsx`
- `src/pages/WorkflowDiagram.tsx`
- `src/pages/PageFrame.tsx`
- `src/pages/pages.css`

Updated files:

- `src/ExperimentLab.tsx`, `src/HistoryView.tsx`: views consume the same configuration, trial outputs, store, and replay callbacks.
- `src/App.tsx`, `src/Sidebar.tsx`: shell grouping, page extraction, lazy loading, loading/failure boundary, and heading focus.
- `src/styles.css`, `src/design-system/layouts.css`: page-style import and removal of 182 superseded page/footer selectors. The new stylesheet owns these page compositions; shared primitives remain authoritative.
- `scripts/browser-audit.mjs`: lazy-ready navigation, all-page screenshots, actual reference calculations, BFS changes, context preservation, active-run Lab locking, and populated desktop/mobile History.
- `README.md`, `docs/DESIGN_SYSTEM.md`, this document: current architecture and verification references.

## Responsive and accessibility treatment

Body copy uses 16px and task labels/timestamps use readable UI sizes. Technical secondary data retains the shared compact scale. Inputs, buttons, links, disclosures, and navigation use native semantics and existing focus tokens. Probability charts include numerical text and descriptive labels; color is supplementary. No fake asynchronous experiment delay or loading animation was added to the synchronous preview.

Document indexes become a horizontal reading index at narrower widths. Lab controls move above the full-width analysis. History rows become a two-column record summary with all metadata retained and the evidence sheet below. Long repository paths wrap at narrow widths. The page transitions retain reduced-motion support.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 101 passed; no failures, skips, or cancellations.
- `npm run build`: passed; the default chunk is below the existing warning threshold after page splitting.
- Production Chromium audit: all six pages at 1440, 1024, 768, 390, and 320px passed overflow checks, plus the existing 1280x800 Simulator composition check.
- Interactive reference checks passed for both sensor observations, finite-horizon action changes, the real BFS detour/destination, and lack of History side effects.
- Existing simulator controls, physical pause, keyboard grid editing, inspector controls, mathematical readouts, settings, reduced motion, history reload/corruption rejection/replay/reset/clear all passed.
- Active paused-run parameter locking in Lab and empty/populated History states passed.
- Desktop/mobile rendered pages and populated record screenshots were inspected. No browser runtime exception or unexpected console warning was reported.
- Hash checks confirmed all 32 protected Simulator, algorithm, model, transport, motion, sensor, history, and interface-preference files were unchanged.

No dependencies were added. A lint script is not configured in this repository, so no lint result is claimed. No backend, routing framework, storage schema, or deployment was introduced. Firefox/Safari, physical touch devices, manual screen-reader testing, and a formal accessibility certification are not claimed.

For local preview run `npm run dev`; for production preview run `npm run build` then `npm run preview`. The QA servers are temporary local processes, not a hosted deployment.
