# SmartSort design system

## Scope and identity

This foundation implements scientific-instrument precision through graphite surfaces, warm white readouts, matte blue interaction, neutral rules, and restrained semantic color. It changes visual primitives, not the simulation model or the page information architecture. The existing floor geometry, object/control order, sidebar behaviors, algorithm panels, history, and page content remain. The Simulator composition has since been redesigned in [SIMULATOR_DESIGN.md](SIMULATOR_DESIGN.md); the other five pages are documented in [PAGE_REDESIGN.md](PAGE_REDESIGN.md).

The foundation directly addresses the audit's scattered colors, 7–10px technical type, repetitive neon-green treatment, uncontrolled control styles, weak focus boundaries, decorative button scaling, and inconsistent font delivery. It does not claim to solve the audit's buried transport controls, duplicated Overview/About, or capped floor size; those require the next layout stage.

## Source structure and cascade

`src/styles.css` is an import manifest and Tailwind semantic bridge:

1. `tokens.css`: the only source for raw UI color literals, type/space scales, shell dimensions, and motion values.
2. `layouts.css`: retained page geometry and state selectors migrated to tokens. Repeated historical layout rules are intentionally not rewritten wholesale in this stage.
3. `typography.css`: authoritative type roles and system-font stacks.
4. `primitives.css`: authoritative controls and semantic presentation; existing class names are explicit compatibility adapters.

The fourth file's compatibility selectors let current pages use the foundation without changing controller contracts. New components should use the exported primitives and tokens rather than adding another page-specific button variant. Consolidate a page's retained layout rules when that page is actually redesigned. Do not append a growing set of corrective overrides to the import manifest.

## Color roles

| Role | Token | Value / intent |
|---|---|---|
| Workspace | `--background` | #101416 |
| Surface | `--surface` | #181D20 |
| Raised surface | `--surface-raised` | #22292D |
| Primary text | `--text-primary` | #F0F1E9 |
| Secondary text | `--text-secondary` | #B1BABD |
| Supporting text | `--text-muted` | #98A5AB |
| Inverse text | `--text-inverse` | #14212B, for light primary controls |
| Structural rule | `--border-subtle` | #343F45, not a sufficient interactive boundary by itself |
| Control boundary | `--border-control` | #72838B |
| Interaction | `--interactive` | #A5C4D9, with hover/pressed/surface/text counterparts |
| Focus | `--focus-ring` | #D8E8F2 |
| Successful outcome | `--status-success` | #B6CD91 |
| Warning/unresolved | `--status-warning` | #E3BA80 |
| Error/incorrect | `--status-error` | #F0A09C |
| Information | `--status-info` | #A5C4D9 |

Each status has an associated background token. Never pair a status foreground with an arbitrary fill. The environmental brand mark uses restrained sage, not neon; normal navigation and probability bars use blue. A computed algorithm result is informational, not automatically a successful sorting outcome.

Charts have separate prior, posterior, track, positive, and negative roles. The grid has explicit empty/border/obstacle/exploration/route/robot/target tokens. Plastic is blue; Paper is warm stone, distinct from amber warning. The robot is warm white. Obstacles use a static hatch to reinforce their identity. Exploration and the final route differ in fill/stroke and sequence, not only hue. Stage pending/current/completed colors are shared with Motion through CSS variables.

Raw colors should not be added to TSX animation targets. Use the existing `--stage-*` properties. Invalid, unavailable, selected, paused, completed, and failed states must retain textual descriptions; color is supplementary.

## Typography and font delivery

Two system stacks are used:

- UI: Segoe UI, Helvetica Neue, Arial, sans-serif.
- Technical: Cascadia Code, SFMono-Regular, Consolas, Liberation Mono, monospace.

No font files are bundled, copied, downloaded, or requested from a third party. Fonts are supplied under the user's existing OS/browser installation and license. Fallback metrics can differ, so layouts must tolerate wrapping. This removes the previous undeclared Inter assumption and introduces no font-related network dependency.

| Role | Size | Treatment |
|---|---|---|
| Display | 28–44px responsive | Reserved for editorial introductions; not a giant operational hero |
| Page title | 24–32px responsive | Medium weight, tight leading, modest negative tracking |
| Section title | 16px | Semibold, short |
| Working text | 14–15px | Normal leading 1.5; longer explanations 1.7 |
| Supporting/control text | 13px | Readable labels and helper copy |
| Technical metadata | 12px minimum | Compact, low tracking |
| Numerical readout | 20px | Monospace/tabular figures |

A 16px root makes rem roles predictable. Existing tiny text declarations were mapped to named roles; no 7–10px text size is retained. Functional data labels such as PLASTIC/PAPER remain uppercase, while metadata badges use quiet lower-case styling. Monospace is for coordinates, probabilities, rewards, paths, and formulas, rather than all interface copy.

## Space, structure, and responsiveness

The scale is 0, 4, 8, 12, 16, 20, 24, 32, 40, and 48px, exposed as `--space-*`. Form controls use 40px height; compact buttons are an explicit 32px opt-in. Panels/control corners use a 3px radius. Shadows are limited to dialogs and tooltips.

Content max-width remains 1510px. Sidebar expanded/rail/drawer widths remain 210/68/240px. Page gutters are 32px, reducing to 24px at 1150px and 16px at 720px. Existing 900px tablet and 720px drawer behavior remains aligned with `useMediaQuery`. CSS custom properties are not used inside media-query conditions; document and change those breakpoints together if a later shell redesign needs them.

The foundation originally preserved grid geometry; the dedicated Simulator stylesheet now replaces those columns and the 490px floor cap with the responsive laboratory composition. Primary/secondary controls, editorial pages, tables, and numerical readouts have different internal rhythms; do not force all of them into identical padded cards. Shared `DataPanel` supports a plain surface for future layouts.

## Component contracts

Exports live in `src/design-system/components.tsx`.

| Component / treatment | Contract |
|---|---|
| `Button` | Primary, secondary, quiet, danger; normal/compact sizes; native attributes/handlers; defaults to `type="button"`; busy disables activation and exposes `aria-busy` |
| `IconButton` | Requires a readable `label`; retains native button behavior and shared hit area |
| `StatusBadge` | Neutral/info/success/warning/error. Does not announce every update as a live region |
| `Tooltip` | Wrapper-free trigger, unique description association, hover/focus visibility, Escape dismissal, short pointer-transfer grace, dismissal on resize/scroll, cleanup on unmount |
| `Tabs` | Controlled selection, associated tabs/panels, roving tab stop, Left/Right/Home/End navigation, disabled-item skipping; inactive content stays mounted and hidden |
| `DataPanel` | Labeled section with heading/meta/body; bounded or plain; no fabricated metrics |
| `Notice` | Status notification by default; error uses alert semantics; does not prescribe persistence or a new confirmation flow |
| `EmptyState` | Short title, explanatory content, optional real action; no fake results |
| `NumericReadout` | Labeled output with tabular numerals; formatting is supplied by the consumer |
| Native inputs/selects | Shared readable values, border, focus, disabled, placeholder, and invalid styling; native dropdown keyboard behavior retained |
| Native range/checkbox | Real input semantics; consistent accent and focus; no custom fake controls |
| Tables | Aligned data, readable captions/headers, restrained row rules, tabular figures; explicit overflow container available |
| Charts/progress | Existing real Bayesian progress and MDP meters retain numerical ARIA values; their tracks and values use chart tokens |
| Dialogs | Existing guide/shortcut dialogs retain their focus trap, Escape, backdrop, and restoration logic; shared panel/overlay/focus styling |
| Loading | `Button busy` supplies a restrained spinner and disabled state; use only for actual work, not decorative delays |

Current adoption: simulation transport buttons use `Button`; algorithm headers use `StatusBadge`; sidebar labels use `Tooltip`. Existing dialogs, controls, charts, tables, experiment sliders, empty states, and notifications use the shared compatibility styling. Other exported primitives are available for the next page-layout stage; no component-gallery route or new product feature was added.

```tsx
<Button variant="primary" onClick={transport.start} disabled={busy}>Start Simulation</Button>
<IconButton label="Reset simulation" onClick={reset}><RotateCcw size={16}/></IconButton>
<StatusBadge tone="warning">Classification unresolved</StatusBadge>
<Notice tone="error">The configured observation has zero probability.</Notice>
<NumericReadout label="Plastic posterior" value="81.82%" />
```

These examples are API illustrations, not hardcoded application results.

## Interaction and motion

Use 120ms for immediate feedback, 180ms for controls, and 210ms for shell width. Reduced motion sets motion-duration tokens to zero and suppresses CSS animation; the existing Motion reduced-motion and pause registry remain intact. Buttons change surface/boundary rather than bounce or scale. Robot, BFS, probability, and stage timing remain owned by the current playback system. Do not add decorative gradient or glow animation.

Focus is a light 2px ring with offset. Native form controls, summaries, tabs, and buttons receive it. The mobile header preserves an icon-only reset and suppresses the redundant Workspace suffix to avoid collisions with larger type. Its text remains in the DOM for the accessible name.

## Verification and limits

`tests/design-system.test.mjs` checks readable text/status/control/chart token contrast targets, safe button types and busy state, notice semantics, and tab/panel associations. Text pair targets are at least 4.5:1; control, focus, and chart distinctions tested are at least 3:1. Structural separator tokens are not claimed to meet control contrast. These checks do not constitute a full accessibility certification or test every possible composed background.

The existing production-browser audit covers all six views at five widths, keyboard/tooltips, mobile drawer/focus, simulation controls, actual robot path, history/replay/reset, parameter updates, and reduced motion. Desktop/mobile screenshots are inspected as part of this handoff. Component keyboard navigation for future Tabs consumers should be included when those consumers are integrated; server-rendered semantics are covered now.

The Simulator composition and progressive disclosure are implemented in the dedicated laboratory stylesheet; the reference and analysis pages now use their own purpose-specific compositions in `src/pages/pages.css`. Keep `src/algorithms`, `src/simulation`, persistence keys, mathematical fixtures, pause/reset semantics, and inspection/navigation outputs unchanged during visual work.

## Verification for this foundation

- 98 automated tests passed, including semantic color contrast targets, native button/busy semantics, status announcements, and tab/panel associations.
- TypeScript validation and production build passed.
- Production Chromium audit passed all six views at 1440, 1024, 768, 390, and 320px, including rendered primary-control contrast/size, tooltip Escape dismissal, existing simulation/replay/persistence controls, and reduced motion.
- Desktop/mobile Simulator, Experiment Lab, and populated Bellman screenshots were inspected. No browser runtime exceptions or unexpected console warnings were reported.
- SHA-256 checks confirmed all 15 existing algorithm, simulation, sensor, history, and interface-preference files were unchanged.
- Contrast tests cover declared role pairs and the rendered primary control, not a formal accessibility certification. Firefox, Safari, manual screen-reader testing, and physical touch-device checks were not performed.
