# Abyssus Dive Log — Save Explorer Teardown

**Subject:** `C:/Users/mrska/Downloads/abyssus_save_explorer.html`  
**Size:** 47,714 bytes · 948 lines · single-file HTML (inline CSS + JS, no external assets)  
**Adjacent files in Downloads:**

| File | Size | Role |
|------|------|------|
| `abyssus_save_explorer.html` | 47,714 B | The viewer (this teardown) |
| `abyssus_save_report.md` | 3,880 B / 94 lines | Markdown dump of the same profile |
| `abyssus_save_report_1.md` | 3,880 B / 94 lines | Byte-identical copy of the report |

No adjacent CSS, JS, or JSON samples. The explorer does **not** read the markdown reports. It only accepts a binary Unreal `.sav`.

**Live save used for field evidence:** `%LOCALAPPDATA%\Abyssus\Saved\SaveGames\Profile1.sav` (281,177 bytes). String-table extraction from that file is cited below as “live save.”

---

## 1. Feature inventory

### 1.1 How drop / parse works

Not a markdown viewer. Pipeline:

1. Drop zone `#drop` or `#pick` → hidden `<input type="file" accept=".sav">`.
2. `FileReader.readAsArrayBuffer`.
3. Custom in-page **GVAS** reader (`parseGVAS` → `Reader` / `readProps` / `readArray` / `readMap`). Comment: *“Ported from a byte-level read of Abyssus' UE 5.6 save format.”*
4. `shape(parsed)` maps `props.SaveGameData` into a display model `D`.
5. `renderTabs()` / `renderActive()` string-concat HTML into `#panels`.

Rejected files: anything without a `GVAS` magic header; files that parse but have empty `RunStats` **and** empty collection; `GameSettings.sav` / `SAVE_GAME_SESSION_SLOT.sav` called out in the error copy. Markdown reports cannot be loaded (`accept=".sav"`).

Privacy copy is accurate: parse is local, nothing is uploaded.

### 1.2 Views / tabs

Wired in `TABS` (line ~861):

| Tab id | Label | What it renders |
|--------|-------|-----------------|
| `overview` | Overview | 8 stat cards; “Where your damage comes from” bars; “Damage per run” bars; Progress kv list; skill-tree tags; difficulty-modifier tags |
| `runs` | Runs | Weapon `<select>`, sort `<select>`, accordion `<details class="run">` per run with full `runDetail()` |
| `enemies` | Enemies | Search, sortable table (name / total / runs seen / best / avg / share bar) |
| `challenges` | Challenges | Search + chip filter All / In progress / Untouched; table of counter + binary state |
| `collection` | Collection | Category stat cards; search + category select; item table; “Mutators encountered” tag dump (capped at 400) |
| `coins` | Hidden coins | Per-area cards: found count vs “at least N”, found `#` tags, gap `#` tags |

No seventh tab. No blessings tab, no weapons tab, no abilities tab, no loadouts tab, no compare view, no raw-JSON view, no export.

### 1.3 Charts, tables, filters, sort, progress

| Control | Where | Behavior |
|---------|-------|----------|
| `#runWeapon` | Runs | Filter by pretty weapon name; “All weapons” |
| `#runSort` | Runs | `idx` / `dealt` / `kills` / `acc` / `time` |
| `#enemyQ` | Enemies | Substring filter; **re-renders whole panel on every `input`** |
| `th[data-sort]` | Enemies | Toggle `ui.enemySort` + `ui.enemyDir` |
| `#chalQ` + `[data-chal]` chips | Challenges | Search + `all` / `started` (`count>0`) / `untouched` (`count===0`) |
| `#colQ` + `#colCat` | Collection | Search + category |
| `.bar > i` | Overview, run detail, coins, enemies | Width = value / **max-in-series** (not share of total), floor 1% |
| `diveProfile()` SVG | Run detail | Diagonal “descent” of `NodesVisited`; color by node type |
| Stat cards `.stat` | Overview, run detail, collection | Big phosphor number + muted label |

No date-range filter. No win/loss filter. No ability filter. No loop filter. No blessing filter. No run-vs-run compare. No export. No global search.

### 1.4 Data model the UI assumes

Top-level: `parsed.props` → `SaveGameData` (`S`) plus `SaveSlotName`, `Timestamp`, `CreationChangelist`.

**Per-run (`S.RunStats[]` → `shape` run object):**

| Save field | UI field | Notes |
|------------|----------|-------|
| `RunSuccesful` | `win` | Game typo preserved |
| `LoopReached` | `loop` | |
| `bInfiniteMode` | `infinite` | |
| `PlayerName` | `player` | Shown only indirectly via coop |
| `WeaponUsed` | `weapon` via `pretty()` | |
| `PrimaryWeaponModAtStartOfRun` | `modPrimary` | Start-of-run, not current |
| `SecondaryWeaponModAtStartOfRun` | `modSecondary` | |
| `AbilityPrimaryAssetAtStartOfRun` | `ability` | |
| `EnemyKilledBy` | `killedBy` | |
| `DamageDealt` / `DamageTaken` | `dealt` / `taken` | |
| `EnemiesKilled` / `GoldCollected` / `NumKeys` | `kills` / `gold` / `keys` | |
| `Deaths` / `TimesDowned` / `TimesRevivedOtherPlayers` | `deaths` / `downed` / `revives` | |
| `MaxHPReached` | `maxHP` | |
| `bulletsHit` / `bulletsMissed` / `weakspotsHit` | `hits` / `miss` / `weak` → `acc`, `weakPct` | |
| `RunStats.RunTime` / `LevelReached` / `RoomReached` | `time` / `level` / `room` | Nested struct, same name as the array |
| `DamageDealtBreakdown[].DamageSourceTag.TagName` + `DamageAmount` | `breakdown[]` | `damageSource()` splits `DamageSource.God.*` vs direct |
| `MutatorsPickedUp[]` `{MutatorPrimaryAsset, Rank}` | `mutators[]` | |
| `EquippedCharms[]` | `charms[]` | |
| `NodesVisited[].NodeName` | `nodes[]` | Generic types: Boss, Elite Enemy, Charm, Event, Gold, Locked Chest, Merchant, Void |
| `ChallengesCompleted[]` | `challenges[]` | Per-run, pretty’d paths |
| `EnemiesKilledOfType[]` `{EnemyId, KillCount}` | `enemies[]` | Drops `EnemyId === "None"` |

**Co-op:** `S.OtherPlayerStats` map → `coop[k] = v.RunStats[0]`, then `coop[i]` keyed by **run index**. Fragile (see weak spots).

**Profile-level:**

| Save field | UI use |
|------------|--------|
| `SoulFragments` | Overview card |
| `NumDifficultyPoints` | Shown only when no difficulty tags |
| `NumTimesOpenedLogbook` | Progress kv |
| `UnlockedLoadoutOptions` + `DiscoveredLoadoutOptions` | Collection table (`Unlocked` / `Seen, not unlocked`) |
| `SkillTreeNodesAssigned` | Tag cloud |
| `DifficultyTreeAssignedPointsNew` | Tags with `pts` if `pts>0` |
| `ChallengeCompletionCounts` | Challenges tab |
| `HiddenCoinsFoundMap` keys `CoinChallenge_{Area}_{N}` | Coins tab |
| `CompletedAreas` / `SeenAreas` | Comma-joined strings |
| `BossVariantsKilled` / `VoidLobbyEnemiesKilled` | Comma-joined strings |
| `MutatorsFound` | Collection footer tags, `.slice(0,400)` |
| `CosmeticPAs` | **Parsed into `D.cosmetics`, never rendered** |
| `LastEncounteredBossVariantInArea` | **Parsed into `D.lastBossVariant`, never rendered** |

**`pretty(path)`:** last path segment, strip `_C`, `PA_`, `BP_`, `_CharacterMutator`, `_Cosmetic`, `_Mutator`, `_Behavior`, then split CamelCase.

**`categoryOf(path)`:** `/Weapons/` → Weapon; `/WeaponMods/` → Weapon mod; `/Cosmetics/` → Cosmetic; `CharmMutators` → Charm; `/CharacterMutators/` → **“Ability / mutator”** (one bucket for abilities, blessings, passives, skill-tree nodes, triggers, suit).

**Damage groups:** `DamageSource.God.X` → `{group:"Blessing", label:X}`; else `{group:"Direct", label: rest}`. Live save tags actually present: `DamageSource.PrimaryFire`, `.SecondaryFire`, `.Ability`, `.Melee`, `.God.{Abyss,Blood,Brine,Defender,Fire,Frost,Gold,Lightning,Ocean,Spirit,Wind}`. No `Ally` / `Amp` / `Passive` damage tag.

### 1.5 Visual design

- **Layout:** centered `.wrap` max-width 1180px; masthead + tabs + one panel; footer disclaimer.
- **Type:** system sans 15px / 1.55; serif (`Iowan` / Palatino) for h1 and run numbers; mono for labels, stats, chips, path.
- **Color:** `--abyss #08181F`, `--phosphor #79CDBB`, `--cream #EADFC6`, `--coral #E4674B`, `--brass #DFA63A`, `--muted #6E93A0`. Bathymetric repeating radial contours on `body`.
- **Density:** medium-low. 8 overview cards, 14px grid gap, 16–18px card padding, 520px scroll tables, lots of vertical whitespace.
- **Motion:** `.panel.on` fade 0.25s; `prefers-reduced-motion` kills animation. No other motion.
- **Aesthetic:** game-adjacent (dive log / phosphor / coral) rather than generic SaaS, but the chrome is still “stat cards + tabs + tables.”

### 1.6 Interaction model

- **Nav:** click tabs (`role="tab"`, `aria-selected`). No arrow-key tablist, no hash/URL persistence, no browser history.
- **Search:** three local search boxes; each keystroke calls `renderActive()` then `focusBack()` to restore caret.
- **Compare:** none.
- **Export:** none (no JSON, CSV, share link, print stylesheet).
- **Reload:** `#reset` hides `#app`, shows `#loader`, clears file input. In-memory `D` is abandoned.

---

## 2. Ranked weak spots

Severity: **blocker** = a better viewer that ships this still loses; **high** = players will feel it immediately; **medium** = real but secondary; **polish** = quality bar.

### BLOCKER

**B1. Hidden coins are a numbered-gap heuristic, not a collectible tracker.**  
`tabCoins()` + regex `/^CoinChallenge_(.+)_(\d+)$/` (line ~519). Copy admits the save “records the ID of every coin you've found, but not how many exist.” Wiki.gg *Surge Fissures* has canonical totals and wardrobe rewards:

| Save area key | Wiki biome | Real total | Wardrobe unlock |
|---------------|------------|------------|-----------------|
| `Lobby` | Lobby | **8** | Tinker |
| `Boatyard` | Abandoned Temple | **15** | Sturdy |
| `Submarine` | Submarine | **15** | Brine |
| `Gardens` | Gardens | **15** | Vines |
| `Sanctuary` | Sanctuary | **15** | Deep |
| `Void` | Royal Abyss | **6** | Heavenly |

Against the adjacent report (16 found IDs): Lobby 1–8 looks “complete” only because `#8` was found; Submarine `{5,14}` renders as **“2 of at least 14”** and misses `#15`; Void `{1,6}` is accidentally right only because `#6` was found; **Boatyard and Gardens do not appear at all** (no numbered finds → area omitted). No room/location names. No remaining count against the real total. Unnumbered keys `CoinChallenge_Boatyard` / `CoinChallenge_Gardens` exist in the live save and are dropped by the regex.

**B2. Blessings / passives / abilities are a tag soup.**  
Per-run `MutatorsPickedUp` and profile `MutatorsFound` are dumped as `.tag` chips. `categoryOf()` collapses everything under `/CharacterMutators/` into “Ability / mutator.” Live save paths distinguish:

- Abilities: `AnchorAbility`, `AncientSpear`, `AtlanteanCubeAbility`, `DropShieldAbility`, `FragGrenadeAbility`, `TurretAbility`, `HealingFlask`, …
- God **passives / major / minor**: `TempRework/{God}/PA_{God}GodPassive`, `PA_{God}MajorBlessing`, `PA_{God}MinorBlessing`, `PA_{God}PassiveN`
- Behavior mutators: `CharacterBehaviorMutators/{God}/PA_{God}_Behavior_{PrimaryFire|SecondaryFire|Ability}_Mutator`
- Skill-tree mutators, charms, suit, triggers

The UI never groups by god, never separates major/minor/passive/behavior, never shows rank except `×N` on a chip. Collection’s “Mutators encountered” even warns it includes “internal behaviour modifiers,” then prints up to 400 of them.

**B3. No first-class weapon / ability / blessing cross-stats.**  
Damage breakdown exists (`DamageDealtBreakdown`) and is shown as a **flat bar list** on Overview (lifetime sum) and inside each run. Missing, despite the data being in `D.runs`:

- Lifetime table by **weapon** (runs, win rate, avg damage, accuracy, kills)
- Lifetime table by **ability**
- Blessing share **per run and over time** (which god carried the run)
- Weapon vs ability vs melee vs blessing as a **composition** (bars are scaled to the *largest* source, not a 100% stack)
- Ally / summon / turret amp as its own slice — live save has **no** `DamageSource.Ally`; turret/`BuddySystem` is invisible unless folded into `DamageSource.Ability`

Overview “Damage per run” is just `barRow("Run N · weapon", dealt)` — a sparkline of one metric, no outcome, no blessing mix, no ability.

**B4. Profile vs per-run IA is mashed together.**  
Overview mixes lifetime combat totals, profile currency, area unlocks, skill tree, and difficulty points. Per-run challenges live only inside a collapsed accordion (`Challenges completed this run`). Profile `ChallengeCompletionCounts` is a different tab with no link to which runs moved the counter. Coins and collection are profile-only but sit as peer tabs to Runs. A player cannot answer “what did *this* dive unlock?” vs “what does my *account* own?”

### HIGH

**H1. Saved loadouts are in the save and completely ignored.**  
Adjacent report: *“Saved loadout presets: 6.”* Live save strings: `Loadouts`, `RLoadout`, `EquippedLoadout`, plus loadout fields `Weapon`, `CharacterAbility`, `PrimaryFireMod`, `SecondaryFireMod`, `Attachment0Mod`, `Attachment1Mod`, `SuitMutator`, `WeaponCosmeticPA`. `shape()` never reads them. The collection tab is unlock/discover only — not “what I have equipped / saved.”

**H2. Parsed then discarded: `CosmeticPAs`, `LastEncounteredBossVariantInArea`.**  
`shape()` lines ~549–551 build `D.cosmetics` and `D.lastBossVariant`. Nothing in `tabOverview` / `tabCollection` reads them. Cosmetics that *are* in `UnlockedLoadoutOptions` show up as rows; `CosmeticPAs` (emotes, helms, frames, paint jobs, voices in the live save) do not.

**H3. Challenges are an ungrouped counter list with a fake state machine.**  
`tabChallenges()` sorts by count desc. State is only `count>0` → “in progress” else “untouched.” Live keys are a taxonomy the UI throws away:

- Progress: `KillChallenge`, `TakeDamageChallenge`, `DealExplosionDamageChallenge`, `DealDoTDamageChallenge`, `FindAllRelics`, `UnlockAllArtifacts`, …
- Completions / modes: `CompleteAllChallenges`, `CompleteInfiniteMode`, `CompleteBothModes`, `WinOnDifficulty{1,5,10,20}`
- Per-weapon wins/unlocks/mastery: `WinWithShotgunChallenge`, `UnlockTeslaGunChallenge`, `AnchorMastery`, `TurretMastery`, …
- Per-biome bosses: `BoatyardBossChallenge`, `GardensBossChallenge`, `SanctuaryBossChallenge`, `SubmarineBossChallenge`, `VoidBossChallenge`
- Coin-area keys sitting next to real coin IDs

No target, no % (copy is honest that targets live in packed assets), but also no **family grouping**, no “likely complete” heuristic, no join to per-run `ChallengesCompleted`. `KillChallenge` at 913 in the report looks finished and is still labeled “in progress.”

**H4. Runs accordion pre-renders every run’s full detail, including SVG.**  
`tabRuns()` maps `runDetail(r)` for **every** filtered run into one `innerHTML`. Each detail includes 4 stat cards, loadout kv, damage bars, optional coop, `diveProfile()` SVG (`stepX=44` × node count), mutator/challenge/enemy tag lists. Ten runs (this profile) is fine. The pattern does not survive a long profile: no virtualization, no lazy-open fetch, whole-panel replace on every filter change.

**H5. Filters are shallow; there is no compare and no export.**  
Runs: weapon + five sorts. Cannot filter by win/loss, loop, infinite, ability, killed-by, blessing present. Cannot pin two runs. Cannot export CSV/JSON of the shaped model. Enemies table is the only real sortable grid. No “same weapon, different ability” or “best Engine Rifle run.”

**H6. Enemy presentation is a lifetime rollup with raw IDs and no biome/family.**  
`tabEnemies()` aggregates `EnemiesKilledOfType` across runs. Report names are already pretty (`Golem Sentry`, `The Golemancer`). No faction (Golem / Primal / Trueborn / Elite / Boss), no per-biome, no drill-down to the runs that produced the kills. Per-run enemy lists are more tag chips at the bottom of `runDetail`. Bosses and trash share one table.

**H7. Co-op pairing is probably wrong.**  
```js
(S.OtherPlayerStats||[]).forEach(([k,v])=>{
  if(v&&Array.isArray(v.RunStats)&&v.RunStats.length) coop[k]=v.RunStats[0];
});
// later: coop: coop[i] ? …
```
`k` is the map key (live save also has `PlayerNetId`). `i` is run index. Only `RunStats[0]` of the partner is kept. Partner loadout/breakdown/nodes are dropped. “Your share of damage” is the only cross-stat, and only if the key happens to equal the run index.

**H8. Overview Progress is an unscannable comma dump.**  
`completedAreas.join(", ")`, same for `seenAreas`, `bossVariants`, `voidKills`. Live area tags include `Area.Boatyard`, `Area.Gardens`, `Area.Sanctuary`, `Area.Submarine`, `Area.Void` — `pretty()` is **not** applied here (unlike weapons). Skill tree is an unordered tag cloud (17 names in the report) with no tree, no remaining nodes, no `UnlockAllSkills` join.

### MEDIUM

**M1. Custom GVAS parser is a single-format, heuristic reader.**  
Alignment peek `if(!(peek>0&&peek<200)) r.p=mark+1` (line ~396). `Guid` skipped (value discarded). `ATOMIC` lists `Color` / `Quat` / `Vector4` but `readAtomic` does not handle them. Map/array errors are swallowed (`val=null` / `break`). Works on this UE 5.6.1 `RSaveGame` profile; a patch that changes property headers, or a markdown-only user, gets a hard fail. No golden-fixture tests in the file. No fallback to the adjacent `.md` report schema.

**M2. `pretty()` + `categoryOf()` lose game language.**  
`PA_EngineRifle` → “Engine Rifle” (good). `DealExplosionDamageChallenge` → “Deal Explosion Damage Challenge” (noisy). `PA_AbyssPassive8_CharacterMutator8` → garbage. Skill-tree names in the report are already human (`Ancient Forge`); if the save stores paths, overview tags would show raw strings because `D.skills` is **not** passed through `pretty()`.

**M3. Charts are decorative relative bars.**  
`barRow` sets width to `max(1, value/max*100)` — a zero still paints ~1%. Percentage-of-total is in the label, not the bar. “Damage per run” has no axis, no win/loss color, no click-through to the run. `diveProfile` only labels Boss / Void / first / last; middle nodes are unlabeled dots. Node names are encounter *types*, not room or biome.

**M4. Re-render-the-panel interaction.**  
`renderActive()` replaces `el.innerHTML` on tab click, sort, chip, select, and **every search keystroke**. `focusBack` is a caret hack. No `aria-controls` / `aria-labelledby` on the tablist. Tab buttons are not a roving tabindex. Empty states exist (good) but error recovery is “pick Profile1.sav” only.

**M5. Currency / soul card may be a wrong field.**  
Overview reads `S.SoulFragments`. That exact identifier was **not** in the live `Profile1.sav` ASCII or UTF-16 string table, while the markdown report claims **31**. Risk: the card shows `0` or `—` against a real profile. (Assumption: the report generator used a different key or a derived value.)

**M6. Lifetime totals hide per-run shape.**  
`tot` is a sum. Accuracy is pooled hits/misses (correct for shots, misleading as “your accuracy”). Two Engine Rifle deaths to Golemancer and one 2.3M damage win sit in the same “Runs recorded: 10 / 2 completed” card. No streak, no last-run recency, no `Timestamp` per run (only profile `Timestamp`).

**M7. Collection completeness is unknown.**  
Category counts are “how many this save has seen,” not “N of M weapons.” Live save weapons include Engine Rifle, Shotgun, Harpoon, Boomerang, Tesla, Brine Rifle, Combat Bow — challenge keys also mention Disc Thrower, Fish Deity, Plasma Launcher, Brine Revolver. The UI cannot say what is still locked because it has no catalog.

### POLISH

**P1.** `MutatorsFound.slice(0,400)` silent truncation.  
**P2.** Footer is a feature advertisement, not a data citation.  
**P3.** Bathymetric background is pretty and unrelated to any data.  
**P4.** No print CSS, no `#tab` hash, no “copy run as text.”  
**P5.** `fmtDur` drops seconds when hours exist (`h+"h "+m+"m"`).  
**P6.** Sticky `th` background is `--abyss` while the table sits on a darker card — slight visual seam.  
**P7.** `accept=".sav"` blocks renaming; drag of a `.sav.txt` or the `.md` report fails with a generic parse error.

---

## 3. Steal list (keep the idea, not the implementation)

1. **Local GVAS parse + honest privacy line.** Drop-a-save, never upload. Keep this trust model.
2. **`pretty()` on `/Game/PrimaryAssets/...` paths.** Players should see “Engine Rifle Wind Up,” not the asset path. Extend it with a real catalog instead of regex-only.
3. **DamageSource.God.* → Blessing group.** The split is the right grain; make it a composition chart and a blessing tab, not a bar list.
4. **Coin IDs as `CoinChallenge_{Biome}_{N}`.** Group-by-biome is correct. Replace “at least max(found)” with wiki totals + location names.
5. **Run accordion summary:** outcome + weapon/ability/loop + dealt/taken/acc in one row. Dense and scannable. Steal the *summary* pattern; lazy-load the body.
6. **Dive-profile metaphor.** A descent path of node types is memorable. Steal the metaphor; label biome/room and make it a filterable sequence, not an unlabeled SVG.
7. **Unlocked vs “Seen, not unlocked.”** That two-state collection model matches `UnlockedLoadoutOptions` + `DiscoveredLoadoutOptions`. Keep it, add a third state: still unknown (catalog minus both).
8. **Challenge honesty:** “counters, not percentages” is the right disclaimer. Keep it, then group and add targets where the community catalog knows them.
9. **Phosphor / abyss / coral / brass palette + serif log title + mono instruments.** Game-native, not Tableau-on-navy. Reuse the tokens; raise density.
10. **Empty/error copy that names the wrong files** (`GameSettings.sav`, `SAVE_GAME_SESSION_SLOT.sav`). Keep that specificity.
11. **`prefers-reduced-motion` and focus outlines on inputs.** Baseline a11y to extend, not invent.
12. **Start-of-run loadout fields** (`*AtStartOfRun`) as the run’s identity — do not pretend they are end-of-run loadout.

---

## 4. Must-beat requirements

A new viewer is not done if it only restyles this HTML. It must beat the conquest on each line:

1. **Hidden coins / Surge Fissures:** For every biome (Lobby, Abandoned Temple/Boatyard, Submarine, Gardens, Sanctuary, Royal Abyss/Void), show found / **canonical total**, remaining IDs, **location or room name** where known, and wardrobe reward. Empty biomes still appear as 0/N. Do not use “at least max(found).”
2. **Blessings:** Group mutators by god × (god passive / major / minor / numbered passive / behavior-on-primary|secondary|ability). Show which gods were in a run and their damage share from `DamageSource.God.*`. Do not emit a 400-chip cloud.
3. **Cross-stats:** A composition of Primary Fire / Secondary Fire / Ability / Melee / Blessing (and Ally/summon if a tag appears). Plus lifetime **weapon table** and **ability table** (runs, wins, avg dealt, acc, kills). Ability damage must be visible without opening a run.
4. **Loadouts:** Surface `Loadouts` / `EquippedLoadout` / `RLoadout` (the report’s 6 presets): weapon, ability, fire mods, attachments, suit, cosmetics. Mark which is equipped.
5. **Information architecture:** Persistent **Profile** layer (unlocks, coins, challenges, skill tree, difficulty, cosmetics) vs **Run** layer (each dive). Overview may summarize both but must label the grain. Per-run challenges must roll up to profile counters.
6. **Challenges:** Group by family (kills, damage type, unlocks, win-with, mastery, biome boss, relics/artifacts). State is not a boolean `count>0`. Join per-run `ChallengesCompleted` to the profile counter.
7. **Enemies:** Faction/biome grouping, boss vs elite vs trash, drill-down to runs. Not one flat sortable table plus tag chips.
8. **Runs:** Filter by outcome, loop, infinite, weapon, **ability**, killer. Sort including gold/deaths/loop. **Compare two runs** side by side (loadout + damage mix + path + mutators). Do not pre-render every `runDetail` SVG.
9. **Collection completeness:** Each category is `owned / seen / missing` against a catalog (weapons, mods, abilities, charms, cosmetics). Render `CosmeticPAs` and paint jobs, not only loadout-option paths.
10. **Path:** Node sequence with type **and** biome/area when inferable; click a node type to filter runs that took it. Not an unlabeled diagonal polyline.
11. **Parse:** GVAS local parse **or** the markdown report schema (the adjacent `.md` is a real user artifact). Fail with field-level diagnostics, not only “Couldn’t read that file.” Do not depend on the `peek<200` alignment hack without a test fixture.
12. **Export / share:** Shaped JSON + a compact run card (copy or CSV). No upload required.
13. **Performance:** Virtualize long lists; render run bodies on open; do not replace the whole panel on each search keystroke.
14. **A11y:** Real tablist keyboard nav, maintain focus without `focusBack`, empty/error states that say what to do next, reduced motion kept.
15. **Visual:** Keep the dive-log palette but raise density: one screen should answer “what am I missing, and which loadout actually works.” Decorative contour backgrounds are optional; data hierarchy is not.

---

## 5. Assumptions (plow-ahead)

1. The two markdown reports are the same extractor output as this HTML’s intended profile (10 runs, 16 coins, 31 souls). They are a **coverage checklist**, not a second parser input the HTML supports.
2. `HiddenCoinsFoundMap` IDs are the game’s Surge Fissures. Area key mapping: `Boatyard` → Abandoned Temple, `Void` → Royal Abyss. Wiki totals above are the targets a better viewer should hardcode until the game ships a count in the save.
3. `Loadouts` / `EquippedLoadout` / `RLoadout` are the “6 saved loadout presets” in the report. Not verified by opening the struct in a full GVAS dump; names are in the live save.
4. There is no `DamageSource.Ally` in this profile. “Ally amp” must be inferred from turret/BuddySystem mutators and/or `DamageSource.Ability`, or shown as **unknown** — not invented.
5. `DamageSource.God.Gold` is the Fortune / gold blessing channel (`PA_Fortune_*` assets exist; no `DamageSource.God.Fortune`).
6. `SoulFragments` may be mis-keyed; a better viewer should search aliases rather than hardcode one name.
7. Typical profiles will exceed 10 runs. Design for hundreds of `MutatorsFound` paths (this save already has a large mutator string table).
8. The new product still reads the live `.sav` locally. Beating this explorer means better IA and catalogs, not a prettier bar chart on the same six tabs.
9. In-game stats screen omissions cited in the footer (accuracy, weakspot, damage-by-source, node path, mutator rank) are real differentiators — keep them, then add the catalog and cross-stats this file skipped.
10. No CSS/JS split in Downloads means this was a one-shot “conquest” artifact, not a maintained app. Treat it as a ceiling to beat, not a codebase to extend.

---

## 6. Architecture snapshot (for implementers)

```
parseGVAS(ArrayBuffer)
  → { engine, saveClass, props }
shape(parsed)
  → D { runs[], collection[], challenges[], coinsByArea, srcTotals, enemyTotals, tot, … }
renderTabs()        // builds empty .panel nodes
renderActive()      // innerHTML = tabFn()   ← full replace
event delegation    // click tabs / th[data-sort] / [data-chal]
                    // input #enemyQ #chalQ #colQ
                    // change #runWeapon #runSort #colCat
```

**Functions to cite:** `Reader`, `parseGVAS`, `shape`, `pretty`, `categoryOf`, `damageSource`, `diveProfile`, `tabOverview`, `tabRuns`, `runDetail`, `tabEnemies`, `tabChallenges`, `tabCollection`, `tabCoins`, `renderActive`, `load`.

**Selectors to cite:** `#drop`, `#pick`, `#file`, `#loader`, `#app`, `#tabs`, `#panels`, `#reset`, `#loadErr`, `#slotline`, `.run`, `.bar`, `.chip`, `.stat`, `.dive`.
