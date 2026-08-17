# Abyssus Save Explorer — Handoff

**Date:** 2026-08-18  
**Home repo (this one):** `D:\project\abyssus-save-explorer`  
**Remote:** https://github.com/skad0/abyssus-save-explorer.git  
**Branch:** `main` @ `836dbf1` (`v1`)  
**Prior chat:** [Abyssus viewer arena](ca9d5add-dc6d-4a3a-b56c-9e282a567aca)

This file is the resume point. Do not continue in `D:\project\agree` (that is a Hono civic platform). Build the next viewer **in this repo**.

---

## Goal

Replace v1 (`index.html`) with an extreme professional local save viewer.

User drops a file → we parse locally (nothing uploaded) → all available data is shown in a dense, game-native, navigable UI: categorized exploration, hidden coins with real missing-by-biome, challenge progress, enemy kills, per-run drill-down (guns / abilities / blessings / passives), cross-stats, graphs, and rich filters.

v1 is the **ceiling to beat**, not a codebase to restyle.

---

## What this repo is

| Item | State |
|------|--------|
| `index.html` | **v0.2 Vite entry** (Svelte 5 app). Open with `npm run dev`. |
| `legacy/index.html` / `legacy-v1.html` | v1 “Dive Log” single-file HTML (the conquest to beat) |
| LICENSE | MIT, Anton Krichevskii, 2026 |
| Current app | Snapshot of **candidate D** (keyboard-first notebook). Parses `.sav` + `.md` + JSON. |

```bash
cd D:\project\abyssus-save-explorer
npm install
npm run dev
```

Then drop `%LOCALAPPDATA%\Abyssus\Saved\SaveGames\Profile1.sav` at http://localhost:5173.

Keyboard: `1`–`7` panels · `j`/`k` runs · `/` search · `Esc` close · Shift+Enter compare.

---

## Inputs (read these)

| What | Path |
|------|------|
| Live save | `C:\Users\mrska\AppData\Local\Abyssus\Saved\SaveGames\Profile1.sav` |
| Markdown report (11 short sections; coverage checklist) | `C:\Users\mrska\Downloads\abyssus_save_report_1.md` (byte-identical `abyssus_save_report.md`) |
| Game install (UE 5.6, packed; not a data catalog) | `Q:\SteamLibrary\steamapps\common\Abyssus` |
| Full teardown of v1 | `docs/abyssus-explorer-teardown.md` (this repo) |
| Grounding catalog | `docs/abyssus-viewer-grounding.md` (this repo; restored 2026-08-18, 46 KB) |

The markdown report is a **thin summary** (10 runs, 16 coins, 31 souls). The `.sav` is the real source. v1 cannot load the `.md`.

---

## Product contract

### Parse

- Accept **`.sav` (GVAS)** and **`.md`** (and JSON export of the shaped model).
- Local only. Fail with field-level diagnostics, not only “Couldn’t read that file.”
- Unknown keys must still surface.
- Do not depend on v1’s `peek<200` alignment hack without a fixture test.

### Information architecture

Persistent **Profile** layer (unlocks, coins, challenges, skill tree, difficulty, cosmetics, loadout presets) vs **Run** layer (each dive). Overview may summarize both but must label the grain.

### Must ship

1. **Coins / Surge Fissures** — every biome (Lobby, Abandoned Temple/Boatyard, Submarine, Gardens, Sanctuary, Royal Abyss/Void): found / **canonical total**, remaining IDs, room names where known. Empty biomes still 0/N. Never “at least max(found).”
2. **Challenges** — grouped by family; progress bars; remaining-to-complete where catalog known; join per-run `ChallengesCompleted`. `KillChallenge` 913 must not look “unfinished” solely because `count>0`.
3. **Enemy kills** — sortable, compact, faction/biome (Golem / Primal / Trueborn / Elite / Boss), drill-down to runs. Named enemies, not raw IDs.
4. **Runs** — virtualized list; filter outcome / loop / infinite / weapon / **ability** / killer; click → weapons + stats/blessings/evolutions, abilities, relics, passives, damage split, kill board, coins this run, duration, biome, outcome, character. Compare two runs.
5. **Blessings** — god × (god passive / major / minor / numbered passive / behavior-on-slot). Damage share from `DamageSource.God.*`. No 400-chip cloud.
6. **Cross-stats** — composition Primary / Secondary / Ability / Melee / Blessing (Ally only if a tag exists — this profile has **no** `DamageSource.Ally`; do not invent). Lifetime weapon table and ability table (runs, wins, avg dealt, acc, kills). Graphs that explain + filters that slice every view.
7. **Loadouts** — `Loadouts` / `EquippedLoadout` / `RLoadout` (report: 6 presets). v1 never reads these.
8. **Collection** — owned / seen / missing vs catalog; render `CosmeticPAs` and `lastBossVariant` (v1 parses then drops them).
9. **Export** — shaped JSON + compact run CSV/card. No upload.
10. **A11y / perf** — real tablist keyboard, do not `innerHTML`-replace the whole panel on each keystroke, virtualize long lists, keep `prefers-reduced-motion`.

### Honest data gaps (do not fake)

- No per-blessing damage beyond `DamageSource.God.*` buckets.
- No ally amp in this save.
- `SoulFragments` may be absent from GVAS (report says 31); search aliases, warn if missing.
- Packed game assets do not yield a complete item dictionary; catalog must be built from save paths + report + wiki/community totals for coins.

### Visual

Steal v1 tokens (abyss / phosphor / coral / brass / serif title / mono instruments). Raise density. Decorative bathymetric background is optional; hierarchy is not.

---

## Beat list (v1 weak spots)

Full evidence: `D:\project\agree\docs\abyssus-explorer-teardown.md`.

1. Coin “at least N” heuristic (Submarine `{5,14}` → “2 of at least 14”; Boatyard/Gardens vanish if nothing found).
2. Blessing/ability tag soup (`categoryOf` dumps `/CharacterMutators/` into one bucket).
3. No weapon × ability × blessing cross-stats; `DamageDealtBreakdown` is a flat bar list.
4. Mashed profile vs run on Overview.
5. Ignored `Loadouts` / `RLoadout` / `EquippedLoadout`.
6. Dropped `CosmeticPAs` + `lastBossVariant`.
7. Ungrouped challenge counters; state = `count>0`.
8. Pre-rendered every run accordion + SVG; full panel replace on search.
9. Shallow filters; no compare; no export.
10. Flat enemy rollup with raw IDs.
11. Broken co-op: `OtherPlayerStats` keyed by map key, then read as `coop[runIndex]`; only `RunStats[0]` kept.
12. Progress comma-dump (`completedAreas.join(", ")`); skill tree unordered cloud.

**Steal:** local-parse trust, `pretty()` on `/Game/PrimaryAssets/...`, God-vs-direct damage split, `CoinChallenge_{Biome}_{N}` grouping, run-summary row, dive-profile metaphor (label it), unlocked vs seen, challenge “counters not percentages” honesty, palette, wrong-file error copy (`GameSettings.sav`, `SAVE_GAME_SESSION_SLOT.sav`).

---

## Sample profile facts (Profile1)

- Engine: UE 5.6.1 `RSaveGame`
- 10 runs recorded, 2 completed (alive at end on runs 9–10)
- Characters in play via weapons: Engine Rifle, Shotgun, Harpoon, Boomerang (also seen in save: Tesla, Brine Rifle, Combat Bow)
- Lifetime: 808 kills, 7,866,340 dealt, 18,026 taken, 63.6% acc, 31 souls (report)
- 16 hidden coins; Lobby looks complete; Submarine/Sanctuary/Void partial; Boatyard/Gardens empty
- `RunSuccesful` is the game’s typo — preserve in parse, display as win

---

## Arena (in-flight, do not rebuild in `agree`)

Four isolated worktrees were created **on the wrong repo** (`agree`). Use them as **idea/code donors**, then implement here.

| ID | Direction | Worktree | Agent | Disk status (2026-08-18 01:35) |
|----|-----------|----------|-------|--------------------------------|
| A | Dense operator console | `D:\project\agree-arena-a` `arena/abyssus-a` | [A](de9e22c2-fc26-4f2e-b81f-406360b8901e) | `abyssus-viewer/` scaffold: `package.json` (dive-console), `types.ts`, `catalog.ts` only. `npm install` already ran. |
| B | Codex / entity-first | `D:\project\agree-arena-b` `arena/abyssus-b` | [B](7879f4e2-7f89-4b46-ad4e-164f7a3687c7) | **DONE.** 6/6 tests; svelte-check/build clean. Real save: 10 runs, 808 kills, 16 coins, 6 loadouts. Entity pages, unknown-field retention, **does not invent coin room names**. Uncommitted. Open: `cd D:\project\agree-arena-b\abyssus-viewer && npm run dev`. **Graft donor** (tests + entity IA + honest coin labels). |
| C | Analytics / filters | `D:\project\agree-arena-c` `arena/abyssus-c` | [C](c94df6b4-0015-4495-930e-3b33aa7a1507) | **DONE.** `npm run verify` / svelte-check / vite build passed. Filters slice graphs+tables together; 100% damage-mix stack; loadout fingerprints; souls `null` if absent (not 0); co-op keeps every partner `RunStats`, not only `[0]`. Open: `cd D:/project/agree-arena-c/abyssus-viewer && npm run dev`. Commit `5d182ce`. **Graft donor, not base.** |
| D | Keyboard-first notebook | `D:\project\agree-arena-d` `arena/abyssus-d` | [D](56ff6e12-0341-4be1-aba3-efa018539b39) | **DONE.** `npm run test:parse` / `check` / `build` passed in the worktree. **Copied into this repo** as the working tree. Rationale: `docs/abyssus-arena-rationale.md`. Commits on worktree: `48e684f`, `78b0299`. |

Also: [research](2931bda7-bdf2-474c-82f8-a897521aca32) (grounding restored; copied here), [teardown](686b9792-fdb8-4173-b545-cda5decb8987) (done), [worktrees](9622a928-4fa4-49ea-86e9-e7e1ea7a6c91) (done).

**Arena phases left:** wait for A or record dropout → cross-judge vs rubric → graft B (tests, entity pages, honest coin rooms) and C (filters/graphs/souls-null/coop) into D → verify here → synthesis note.

Candidate D is the **provisional base** in this repo. B and C are graft donors. Do not merge civic-platform history from `agree`.

---

## Recommended next actions (in order)

1. `npm install && npm run test:parse && npm run check && npm run dev` in this repo.
2. Side-by-side with `legacy/index.html` using the same `Profile1.sav`.
3. When A finishes (or dropout), graft: **B** (`D:/project/agree-arena-b/abyssus-viewer/`) tests, entity-first navigation, no invented coin rooms; **C** (`D:/project/agree-arena-c/abyssus-viewer/`) filter bar, 100% damage-mix, loadout fingerprints, souls null+note, co-op all partners.
4. Fill remaining must-beat gaps D called out: dive-profile SVG omitted (node types ≠ rooms); no Ally slice; collection still unlocked/seen only (no full roster).
5. **Do not push** unless asked. Do not force-push `main`. Do not commit until asked.

### Rubric (pick/graft)

1. Parses full GVAS **and** the markdown report; unknown keys visible; drop-zone for both.
2. Coins by biome with real totals/room names; challenges with remaining math; enemy kills sortable/compact.
3. Per-run drill-down: guns, abilities, relics, blessings, passives, damage split, kills, loadouts.
4. Cross-stats + graphs + filters from real fields only.
5. Beats the 12 weak spots.
6. Svelte 5 runes, parser isolated from UI, types, v1 not silently broken until replacement is proven.

---

## Pitfalls already hit (do not repeat)

1. **`D:\project\agree` is not this product.** `origin/main` is Hono/TypeScript civic platform. No SvelteKit `src/routes` in git. Arena `best-of-n-runner` failed to isolate; worktrees were created later by hand.
2. **Local `agree` `main` was 22 commits behind** and missing app files. Candidate B blocked on that.
3. **Grounding markdown was missing once**; it is now at `docs/abyssus-viewer-grounding.md` in this repo. Do not reconstruct from chat.
4. **v1 is a `.sav` parser, not a markdown viewer.** A markdown-only app does not beat it; it is a different product.
5. **Do not interrupt candidates into the civic tree again.** Continue here.
6. **Stale handoff:** [handoff writer](e3c443b1-91f3-46b7-bc4f-68c3dceb8d20) wrote `agree/docs/abyssus-viewer-handoff.md` at ~01:38. It is **wrong** (graft onto civic `origin/main`, grounding missing, C unfinished). Ignore that snapshot. This file is the source of truth.

---

## Skills / stack notes

User asked for arena + Context7 + plow-ahead.

- Context7: Svelte 5 runes, Svelte MCP `svelte-autofixer` on every `.svelte`.
- No React. Charts: SVG / LayerCake / Chart.js — not Recharts.
- No inline imports. Exhaustive `never` defaults on union/enum switches.
- Plow-ahead: pick reversible defaults; do not wait for coin-wiki confirmation — hardcode community totals, cite them.

Available Task models if fanning out again: `claude-opus-5-thinking-high`, `gpt-5.6-sol-medium`, `cursor-grok-4.6-high`, `cursor-grok-4.5-high`, `composer-2.5-fast`.

---

## Stop vs continue

**Continue** through ordinary UI/parser choices.

**Stop and ask** only for: publishing/secrets, force-push, deleting v1 from GitHub `main` without a replacement, or anything that mutates the user’s live `Profile1.sav`.
