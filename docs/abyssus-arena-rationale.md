# Abyssus Arena Candidate D — Design Rationale

## Direction
Compact tactical notebook: keyboard-first master-detail, motion restraint, phosphor-on-abyss palette inherited from the HTML explorer but at higher information density.

## Alternatives considered and rejected

1. **Tab-sprawl SPA (6+ top-level routes)** — Rejected. One `/abyssus` surface with numbered panels (1–7) keeps context and beats the explorer’s disconnected tabs while preserving profile vs run mental model via panel labels.

2. **Markdown-only viewer** — Rejected. The conquest artifact is GVAS-first; we accept `.sav` + `.md` + JSON export so users can drop either Profile1.sav or community reports.

3. **Re-implement GVAS from scratch without the explorer baseline** — Rejected. Ported `parseGVAS`/`readProps` from the HTML explorer, then added typed `shapeGvas` with loadouts, fixed co-op indexing, canonical coin totals, and cross-stats.

4. **400-chip mutator cloud** — Rejected. `classifyMutator()` groups god / major / minor / passive / behavior / ability / skill-tree in run drill-down.

5. **“At least N” coin heuristic** — Rejected. Hardcoded wiki totals per biome (Lobby 8 … Void 6) with remaining count and room names where known; empty biomes still render 0/N.

6. **Pre-rendered run accordions** — Rejected. Windowed virtual list (fixed row height + scroll offset) with lazy detail pane on selection.

7. **Chart.js / React charts** — Rejected per rubric. SVG `StackBar` for damage mix; tables for weapon/ability WR.

8. **SvelteKit route inside civic platform** — Rejected. Standalone Vite SPA at `abyssus-viewer/`; no Hono routes or parent auth.

9. **Invented SoulFragments field** — Rejected. Alias search in shape; warning when absent (this profile has no SoulFragments key in GVAS).

10. **Compare as separate route** — Rejected. Shift+Enter pins compare run in the same detail column.

## Omitted graphs (honest)
- Per-run dive-profile SVG (node path) — data is node *types*, not rooms; omitted until biome inference exists.
- Ally/summon damage slice — no `DamageSource.Ally` in sample save; not invented.
- Collection “N of M catalog” — no shipped weapon roster JSON; shows unlocked/discovered only.

## Verification
- From `abyssus-viewer/`: `npm run test:parse` against AppData Profile1.sav and Downloads report.
- `npm run check` / `npm run build`; open with `npm run dev` (http://localhost:5173).

## Assumptions
- Coin wiki totals stable until game ships counts in save.
- Challenge targets from community catalog where known; unknown counters show count only.
- Markdown 11-section schema covers empty sections gracefully.
