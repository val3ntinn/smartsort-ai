# Simulator laboratory redesign

## Composition

The Simulator is now a dedicated `SimulatorWorkspace` organized around Observe, Reason, and Act. The global navigation and other page layouts remain in App. The laboratory owns its composition in `src/simulator.css`, using the established semantic tokens and shared controls.

Specimen selection, reproducible sensor configuration, and transport are placed above the environment. Start, Pause, and Resume share the primary position according to the real transport status; Next Step and Reset are separate actions. Mode and speed remain native controls. The transport strip stays available while scrolling through evidence. Advanced source/prior settings expand inline instead of hiding the floor behind a modal. Busy runs retain their existing editing locks.

The floor occupies the main column. Its size responds to available height and width instead of the old fixed 490px cap. On laptops, the complete environment and primary controls fit in the initial 1280x800 viewport. Tablets and phones place the full-width inspector after the environment rather than compressing it into a narrow desktop column.

## Observe

The observation monitor uses actual sensor state; the waveform remains an activity illustration rather than measured telemetry. Likelihoods are available in an explicit disclosure.

Bayesian evidence is shown as aligned prior/posterior values and a probability-shift diagram. A hollow diamond represents the prior; a filled circle represents the posterior. The connector and signed percentage-point change describe the same actual update. Text values and shape differences keep the information understandable without relying on color. Evidence, likelihoods, and normalization calculations remain available in the breakdown.

## Reason

The existing MDP result supplies immediate rewards, future value, Bellman action values, selected action, horizon, and observation transitions. The redesign removes the nested-card treatment and uses the inspector's shared ruled surface. Reinspection uses a rotation symbol; unresolved classification uses a warning symbol rather than a success checkmark. No new decision policy or reward model is introduced.

The inspector follows actual stage boundaries. Selecting a tab holds that view; the Follow stages control restores automatic context without changing simulation playback. Arrow keys, Home, and End navigate the tabs. All panels remain mounted so reviewing evidence does not destroy a live calculation or registered animation.

## Act

The floor uses zero-based row/column axes consistent with cell labels and the academic documentation. Empty cells, obstacles, bins, exploration, route, travelled cells, robot, and target each have distinct presentation.

The robot is a top-down engineering marker with tracks, a directional nose, a sensor aperture, an activity light, and an arrival state. Position and orientation are still driven by `robotPresentation` and the existing cancellable animation registry.

Planned links are dashed with route indices. Travelled links are solid and use checkmarks only once the actual robot index has reached that cell. The target is outlined and labeled. BFS exploration still follows the actual dequeue order and reveals only the controller's visited prefix; route reveal still uses the controller's path prefix. Neither display manufactures algorithm results.

Grid cells support arrow-key focus movement among valid editable positions, with native Enter/Space activation. Robot/bin positions remain protected. The global Space shortcut now leaves native details/summary disclosure activation alone.

The operation status is visible in the laboratory heading. Waiting, processing, computed, and failed algorithm states are explicitly labeled. The execution timeline, final outcome, and real event log remain below the workbench. Incorrect, unreachable, and unresolved outcomes are preserved rather than restyled as success.

## Files

- New: `src/SimulatorWorkspace.tsx`, `src/simulator.css`, `src/simulator/presentation.ts`, `tests/simulator-presentation.test.mjs`.
- Updated: App, AgentSetup, SimulationControls, NavigationGrid, RobotMarker, SensorMonitor, BayesianPanel, DecisionPanel, SimulationMonitor, and PanelHeader.
- Styling: styles import manifest and retained layouts; 17 superseded Simulator column/cap rules removed.
- Verification: existing browser audit extended for laptop composition, tab interaction, real posterior values, keyboard editing, disclosure shortcuts, and completed-route presentation.

## Verification

`npm test` passes 101 tests, including the three new presentation tests and all existing algorithm, integration, transport, history, replay, preference, and semantic component checks. TypeScript validation and production build pass. The repository has no configured lint command; no linter dependency was added.

The browser audit exercises all six pages at 1440, 1024, 768, 390, and 320px, plus the complete-floor laptop check at 1280x800. It checks physical pause, actual BFS movement, Reset, repeated live/replay sessions, saved history, parameter changes, keyboard controls, reduced motion, and browser errors. Screenshots are written to ignored `.qa/` for review.

Existing mathematical, controller, transport, sensor, history, and interface-preference files are checked against their pre-redesign hashes. No dependency, storage schema, mathematical output, or algorithm implementation was changed. Other pages are outside this redesign. Firefox/Safari, physical touch devices, and manual screen-reader verification are not claimed.
