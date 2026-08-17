# Abyssus Save Viewer — Shared Grounding

**Status:** research contract only. Do not implement the viewer from this file’s existence.  
**Evidence date:** 2026-08-18. Live profile last written 2026-08-17 23:57 UTC.  
**Primary parse target:** Unreal Engine 5.6.1 GVAS `ProfileN.sav`. The markdown reports are a *summary* of the same profile, not the format the existing HTML explorer reads.

This document is the product contract seed. Four independent implementers should be able to build the same viewer from it. Fields that were not observed are marked **unknown**. Display names that come from wiki/community catalogs (not the save) are labeled **join**, not invented save fields.

---

## 0. Source inventory

| Source | Path | What it actually is |
|--------|------|---------------------|
| Markdown report | `c:\Users\mrska\Downloads\abyssus_save_report_1.md` | 3,880 B / 94 lines. Human summary extracted from `Profile1.sav`. Byte-identical to `abyssus_save_report.md`. **Six** sections (not eleven): Profile Summary, Lifetime Totals, Per-Run Breakdown, Enemy Kills, Notable Challenge Progress, Hidden Coins Found. |
| Existing explorer | `c:\Users\mrska\Downloads\abyssus_save_explorer.html` | 47,714 B / 948 lines. Single-file local GVAS viewer. Accepts `.sav` only. Teardown: `docs/abyssus-explorer-teardown.md`. |
| Live saves | `%LOCALAPPDATA%\Abyssus\Saved\SaveGames\` | UE5 GVAS binaries. `Profile1.sav` is the profile (281,177 B). |
| Game install | `Q:\SteamLibrary\steamapps\common\Abyssus` | UE5 shipping build. Project name **RGame**. Steam appid **1721110**. One pak: `RGame\Content\Paks\RGame-Windows.pak` (5,581,759,716 B). No loose JSON/CSV/locres. |
| Public wiki | https://abyssus.wiki.gg | Weapons, abilities, blessings, areas, Surge Fissures. Blessing *names* on the wiki are aspect labels (Blood, Barrier, Flares…) that do **not** match save `DamageSource.God.*` tags 1:1. |
| This workspace | `D:\project\agree` | `origin/main` is a **Hono + TypeScript civic-request platform** (SPEC.md). No app code, no SvelteKit app, no UI kit. **Wrong place to add viewer routes.** |

---

## 1. Game + save architecture

### 1.1 The game

**Abyssus** (Steam 1721110) is a 1–4 player co-op FPS roguelite. Studio/publisher branding in the install: Arcade Crew / Double Moose intro movies. Executable: `RGame.exe` → `RGame\Binaries\Win64\RGame-Win64-Shipping.exe`. Engine plugins: Steamworks, EOS (RedpointEOS), Steam Audio.

A **run** (in-game: expedition / dive) is one descent from the Lobby through biomes (Abandoned Temple / Boatyard → Submarine → Gardens → Sanctuary → Royal Abyss / Void), with optional **loop** (`LoopReached`) and **infinite mode** (`bInfiniteMode`). The player carries one weapon + one ability, three blessing Aspects (primary / secondary / ability), charms, and forge mods. Meta-progression lives on the profile: Soul Wheel / skill tree, unlocks, cosmetics, hidden coins (Surge Fissures), challenge counters.

### 1.2 Engine and file formats

| Artifact | Format | Evidence |
|----------|--------|----------|
| `Profile1.sav` | **GVAS** (`47 56 41 53`), UE5, save class `/Script/RGame.RSaveGame` | Header ASCII `GVAS` … `UE5`. Explorer comment: UE 5.6.1. |
| `Profile1_Temp.sav` | GVAS, same class, 1,879 B | Only `Timestamp` recovered as a named field. Mid-write / scratch. |
| `SAVE_GAME_SESSION_SLOT.sav` | GVAS `/Script/RGame.RSaveGameSession`, 1,932 B | `SaveGameSlots`, `LastSaveGameSlot` = `Profile1`. Slot bookkeeping. |
| `GameSettings.sav` | GVAS `/Script/RGame.RSaveGameSettings`, 2,602 B | Audio / FOV / crosshair. Not a profile. |
| `EnhancedInputUserSettings.sav` | GVAS Enhanced Input, 2,431 B | Keybinds (`IA_Dash`, `IA_Melee`). Not a profile. |
| `steam_autocloud.vdf` | text VDF, 51 B | `"accountid" "46642794"` — Steam Cloud is on. |
| `GameUserSettings.ini` | Unreal ini | `/Script/RGame.RGameUserSettings` — display/audio, `GameLanguage=en`. |
| `RGame-Windows.pak` | IoStore/pak, 5.5 GB | All item defs, loc, data tables. **Not unpacked in this research.** No loose `.uasset` / `.locres` / `.json` outside the pak. |
| Markdown reports | GitHub-flavored MD | Derived view. The HTML explorer **does not parse them**. |

Binary header (first 64 bytes of every `.sav` sampled):

```
GVAS 03 00 00 00 0A 02 00 00 F9 03 00 00 05 00 06 00 01 00 00 00
… UE5 … (custom version GUIDs) …
```

Parse strategy that already works: the in-page `parseGVAS` in `abyssus_save_explorer.html` (ported byte-level UE 5.6 reader). Port that reader; do not invent a second format.

### 1.3 Profiles / slots / live vs historical

| Layer | Where | Meaning |
|-------|-------|---------|
| **Slot bookkeeping** | `SAVE_GAME_SESSION_SLOT.sav` → `SaveGameSlots`, `LastSaveGameSlot` | Observed: only `Profile1`. Slots are `ProfileN.sav`. |
| **Live profile** | `Profile1.sav` → `SaveGameData` | Unlocks, skill tree, coins, challenge *counters*, cosmetics, saved loadouts, **array of finished-run records**. |
| **Historical runs** | `SaveGameData.RunStats[]` | One struct per recorded expedition. This profile: **10**. Start-of-run loadout, combat totals, damage-by-source, mutators, node path, per-enemy kills. |
| **Live session** | `Profile1_Temp.sav`, `SAVE_GAME_SESSION_SLOT.sav` | Not a run history. Do not treat as a second profile. |
| **Settings** | `GameSettings.sav` + `GameUserSettings.ini` | HUD/audio. Out of scope except “wrong file” errors. |

There is **no in-progress run dump** in the sampled files. Mid-run state, if it exists, was not recovered. `RunStats` are post-run (or end-of-session) records.

Co-op: `OtherPlayerStats` is a map of partner blobs, each with its own `RunStats`. The existing explorer keys partners by map key ≈ run index and keeps only `RunStats[0]` — treat that pairing as **fragile**.

### 1.4 Characters (Sin / Dani / Kari / Bob)

A prior brief named playable characters **Sin, Dani, Kari, Bob**.

| Fact | Status |
|------|--------|
| Those four strings in `Profile1.sav` ASCII/UTF-16 table | **Not present** |
| `CharacterId` / `Character` property in the live save string table | **Not present** |
| Observed player identity | `PlayerName` = `skad0`; `PlayerNetId` via `UniqueNetIdRepl` (`RedpointEOS` / hex ids) |
| Wiki.gg character pages confirming those four names | **Not recovered** in this pass |

**Assumption (recorded):** if a later save or pak loc table exposes a character enum, map it. Until then the viewer must **not** invent a character portrait from those four names. Show `PlayerName` from the run. If a numeric `CharacterId` appears, label it `Character #N` unless a pak/wiki join is added.

### 1.5 What a “run” is in the save

`SaveGameData.RunStats[]` item (`RPlayerStats` / nested `RRunStats`):

- Identity: `PlayerName`, `WeaponUsed`, `AbilityPrimaryAssetAtStartOfRun`, start-of-run mods, `LoopReached`, `bInfiniteMode`, `RunSuccesful` (game typo preserved).
- Outcome: `EnemyKilledBy` or survived (`(alive at end)` in the markdown; empty/`None` in raw).
- Combat: damage dealt/taken, kills, gold, keys, deaths, downed, revives, max HP, bullets hit/missed, weakspots.
- Nested `RunStats`: `RunTime`, `LevelReached`, `RoomReached`.
- Build: `MutatorsPickedUp` (blessings/passives/charms/forge — one bag), `EquippedCharms`, `DamageDealtBreakdown`.
- Path: `NodesVisited[].NodeName` — encounter **types** (Boss, Elite Enemy, Charm, Event, Gold, Locked Chest, Merchant, Void), not room IDs.
- Per-run challenges completed and per-enemy kill counts.

Start-of-run loadout fields are **not** end-of-run loadout. Do not pretend the player finished with the same mods.

---

## 2. Complete field catalog

Grain legend: **file** = GVAS header/slot; **profile** = `SaveGameData` lifetime; **run** = one `RunStats[]` element; **loadout** = saved preset; **map-entry** = UE `MapProperty` pair.

### 2.1 File / slot (outside `SaveGameData`)

| Raw key / path | Type | Meaning | Example | Grain |
|----------------|------|---------|---------|-------|
| (header magic) | 4 bytes | GVAS | `GVAS` | file |
| (engine version) | u16×3 | UE version | `5.6.1` (report + explorer) | file |
| save class | FString | USaveGame subclass | `/Script/RGame.RSaveGame` | file |
| `SaveSlotName` | Str/Name | Slot id | `Profile1` | file |
| `Timestamp` | DateTime (UE ticks) | Last write | report: 2026-08-17 23:57 UTC | file |
| `CreationChangelist` | Int | Build changelist | present; exact int **unknown** without a full dump | file |

`SAVE_GAME_SESSION_SLOT.sav`:

| Raw key | Type | Meaning | Example | Grain |
|---------|------|---------|---------|-------|
| `SaveGameSlots` | Array\<Str\> | Known slots | `Profile1` | file |
| `LastSaveGameSlot` | Str | Active slot | `Profile1` | file |

### 2.2 Profile currency, flags, meta

| Raw key / path | Type | Meaning | Example | Grain |
|----------------|------|---------|---------|-------|
| `SaveGameData.SoulFragments` | Int? | Meta currency (Soul Fragments). Explorer reads this. **String was not in the live ASCII table** — may be 0 or a different key. Report claims **31**. | 31 (report only) | profile |
| `SaveGameData.NumDifficultyPoints` | Int | Unspent difficulty points | `1` | profile |
| `SaveGameData.NumTimesOpenedLogbook` | Int | Logbook open count | unknown exact | profile |
| `SaveGameData.bHasEverSpentDifficultyPoints` | Bool | Difficulty tree touched | present | profile |
| `SaveGameData.bHasSeenInitialTutorial` | Bool | Tutorial flag | present | profile |
| `SaveGameData.bHasSeenPostGamePopup` | Bool | Post-game UI flag | present | profile |
| `SaveGameData.bTutorialDone` | Bool | Tutorial complete | present | profile |
| `SaveGameData.SkillTreeNodesAssigned` | Array\<Str\> | Assigned Soul Wheel / skill names (human strings in this save) | `Ancient Forge`, `Picky Worship`, … (17) | profile |
| `SaveGameData.DifficultyTreeAssignedPointsNew` | Map\<Name,Int\> | Difficulty modifiers → points | keys include `Abolished Shrines`, `Abyssal Leviathans`, `Corrupted Depths`, `EcoWarfare`, `Executioner`, `Frenzy`, `Gold Drain`, `Greedy Merchants`, `Infinite Pain`, `Nautical Horrors`, `Oceanic Omens`, `Spiked Charms`, `Surging Force`, `Tidal Pressure`, `Wildfire`, `Depleted Shrines`, `Corrupted Descent`, `Remnants`, `Royal Heralds`, `Saltwater Sorrows` / `Submerged Sorrows` (see §3.8) | profile |
| `SaveGameData.CompletedAreas` | Array\<Name/Str\> | Cleared biomes | `Boatyard`, `Gardens`, `Sanctuary`, `Submarine`, `Void` and/or `Area.*` tags | profile |
| `SaveGameData.SeenAreas` | Array | Seen but not cleared | present | profile |
| `SaveGameData.BossVariantsKilled` | Array\<Str\> | Boss variant display names | `Flame Tyrant Kri'su`, `Night Seer Un'glu`, `Trueborn Golemancer`, `Trueborn Champion` | profile |
| `SaveGameData.VoidLobbyEnemiesKilled` | Array | Void-lobby unique kills | present | profile |
| `SaveGameData.LastEncounteredBossVariantInArea` | Map\<GameplayTag, ?\> | Last boss variant per area | keys `Area.Boatyard` etc. **Parsed by explorer, never rendered** | profile |
| `SaveGameData.UnlockedLoadoutOptions` | Array\<SoftPath\> | Unlocked weapons/abilities/mods/cosmetics | 30 items (report): 6 weapons, 12 abilities/mutators, 7 weapon mods, 5 cosmetics | profile |
| `SaveGameData.DiscoveredLoadoutOptions` | Array\<SoftPath\> | Seen, not unlocked | 5 (report) | profile |
| `SaveGameData.MutatorsFound` | Array\<SoftPath\> | Everything shown at least once (huge) | hundreds of `/Game/PrimaryAssets/CharacterMutators/...` paths | profile |
| `SaveGameData.CosmeticPAs` | Array\<SoftPath\> | Cosmetics | emotes, helms, frames, paints, voices. **Explorer parses, does not render** | profile |
| `SaveGameData.Loadouts` | Array of `RLoadout` | Saved presets | report: **6**. Fields below | profile / loadout |
| `SaveGameData.EquippedLoadout` | Struct? | Currently equipped preset | present as name; struct layout **not fully dumped** | profile |
| `SaveGameData.ChallengeCompletionCounts` | Map\<Name,Int\> | Lifetime challenge counters | `KillChallenge` → `913` | profile |
| `SaveGameData.HiddenCoinsFoundMap` | Map\<Name,Bool\> | Found Surge Fissure IDs | `CoinChallenge_Lobby_1` → true | profile |
| `SaveGameData.OtherPlayerStats` | Map → `ROtherPlayerStats` | Co-op partners | keyed; each has `RunStats` | profile |
| `SaveGameData.PlayerEmotes` | unknown | Emote loadout | name present | profile |
| `SaveGameData.PlayerFrameWidgetClass` | Object/Soft | Profile frame widget | `/Game/Widgets/CosmeticsMenu/Widget_PlayerFrame_*` | profile |

**Unknown / not observed as named fields:** per-blessing damage, ally damage amp, challenge *targets*, coin *totals*, room-level coin locations, in-progress run, `CharacterId`.

### 2.3 Saved loadout (`RLoadout`) — present, unused by the HTML explorer

| Raw key | Type | Meaning | Example | Grain |
|---------|------|---------|---------|-------|
| `Weapon` | SoftPath | Weapon PA | `/Game/PrimaryAssets/Weapons/PA_EngineRifle.PA_EngineRifle` | loadout |
| `CharacterAbility` | SoftPath | Ability PA | `/Game/PrimaryAssets/CharacterMutators/FragGrenadeAbility/PA_FragGrenade_CharacterMutator.PA_FragGrenade_CharacterMutator` | loadout |
| `PrimaryFireMod` | SoftPath | Primary mode | `PA_EngineRifle_Automatic` | loadout |
| `SecondaryFireMod` | SoftPath | Secondary mode | `PA_EngineRifle_WindUp` | loadout |
| `Attachment0Mod` | SoftPath | Attachment slot 0 | unknown example | loadout |
| `Attachment1Mod` | SoftPath | Attachment slot 1 | unknown example | loadout |
| `SuitMutator` | SoftPath | Suit | `PA_BaseSuit_CharacterMutator` | loadout |
| `WeaponCosmeticPA` | SoftPath | Weapon paint | `PA_EngineRifle_PaintGold` | loadout |

### 2.4 Per-run (`SaveGameData.RunStats[]`)

| Raw key / path | Type | Meaning | Example (report run 9 / 10) | Grain |
|----------------|------|---------|------------------------------|-------|
| `RunSuccesful` | Bool | Completed (typo in game) | run 9–10 true; 1–8 false | run |
| `LoopReached` | Int | Loop index | `0` or `1` | run |
| `bInfiniteMode` | Bool | Infinite mode | present | run |
| `PlayerName` | Str | Local player name | `skad0` | run |
| `PlayerNetId` | UniqueNetIdRepl | EOS/Steam id | subsystem `RedpointEOS` | run |
| `WeaponUsed` | SoftPath | Weapon this run | `/Game/PrimaryAssets/Weapons/PA_EngineRifle.PA_EngineRifle` | run |
| `PrimaryWeaponModAtStartOfRun` | SoftPath | Primary mod at **start** | `PA_EngineRifle_WindUp` | run |
| `SecondaryWeaponModAtStartOfRun` | SoftPath | Secondary mod at start | `PA_EngineRifle_Automatic` etc. | run |
| `AbilityPrimaryAssetAtStartOfRun` | SoftPath | Ability at start | e.g. turret / grenade / cube PAs | run |
| `EnemyKilledBy` | SoftPath or Name | Killer | `BP_Golemancer`, `BP_EliteGardenEnemy`, `BP_GeneralKrisu`; empty if survived | run |
| `DamageDealt` | Float/Int | Total damage out | `2363927` (run 9) | run |
| `DamageTaken` | Float/Int | Damage in | `4838` (run 9) | run |
| `EnemiesKilled` | Int | Kill count | `151` (run 9) | run |
| `GoldCollected` | Int | Gold this run | `144` (run 9) | run |
| `NumKeys` | Int | Keys | present | run |
| `Deaths` | Int | Deaths | `0` (run 9) | run |
| `TimesDowned` | Int | Downs | `0` (run 9) | run |
| `TimesRevivedOtherPlayers` | Int | Revives given | present | run |
| `MaxHPReached` | Float | Peak HP | present | run |
| `bulletsHit` | Int | Hits | lifetime sum 30888 | run |
| `bulletsMissed` | Int | Misses | lifetime sum 17679 | run |
| `weakspotsHit` | Int | Weakspot hits | lifetime 9519 | run |
| `RunStats.RunTime` | Float (seconds) | Duration | nested struct, same name as the array | run |
| `RunStats.LevelReached` | Int | Level | present | run |
| `RunStats.RoomReached` | Int | Room index | present | run |
| `DamageDealtBreakdown[]` | Array of `RDamageDealtBreakdownEntry` | Damage by tag | see §2.5 | run |
| `MutatorsPickedUp[]` | Array of `RMutatorLogData` | Blessings/passives/charms/forge picked | `{MutatorPrimaryAsset, Rank}` | run |
| `EquippedCharms[]` | Array\<SoftPath\> | Charms | `PA_Backline_Charm_CharacterMutator` etc. | run |
| `NodesVisited[]` | Array of `RNodeLogData` | Path | `{NodeName}` = `Boss`, `Merchant`, … | run |
| `NumNodesVisited` | Int | Path length | present | run |
| `ChallengesCompleted[]` | Array\<Soft/Object\> | Challenges finished **this run** | `/Game/Maps/StaticActors...RChallengeGridItem_*` | run |
| `EnemiesKilledOfType[]` | Array of `REnemyKillCount` | Per-enemy | `{EnemyId, KillCount}`; drop `EnemyId=="None"` | run |

Markdown per-run table (all 10 — quote as the only complete numeric run list):

| # | Loop | Weapon | Killed By | Dmg Dealt | Dmg Taken | Kills | Gold | Deaths | Downed | Accuracy |
|---|------|--------|-----------|-----------|-----------|-------|------|--------|--------|----------|
| 1 | 0 | PA_EngineRifle | Golemancer | 179,583 | 774 | 72 | 62 | 4 | 3 | 50% |
| 2 | 0 | PA_EngineRifle | Golemancer | 222,020 | 860 | 38 | 43 | 3 | 3 | 67% |
| 3 | 0 | PA_EngineRifle | Golemancer | 194,841 | 478 | 30 | 14 | 1 | 1 | 67% |
| 4 | 1 | PA_EngineRifle | EliteGardenEnemy | 479,576 | 1,391 | 48 | 170 | 5 | 5 | 68% |
| 5 | 1 | PA_EngineRifle | EliteGardenEnemy | 348,868 | 1,974 | 93 | 277 | 3 | 3 | 60% |
| 6 | 1 | PA_Shotgun | GeneralKrisu | 1,056,526 | 1,662 | 90 | 55 | 1 | 1 | 67% |
| 7 | 1 | PA_Shotgun | GeneralKrisu | 841,392 | 1,938 | 88 | 31 | 4 | 4 | 70% |
| 8 | 1 | PA_HarpoonGun | GeneralKrisu | 727,689 | 2,356 | 126 | 168 | 1 | 1 | 54% |
| 9 | 1 | PA_EngineRifle | (alive at end) | 2,363,927 | 4,838 | 151 | 144 | 0 | 0 | 69% |
| 10 | 1 | PA_BoomerangGun | (alive at end) | 1,451,918 | 1,756 | 72 | 227 | 0 | 0 | 54% |

Lifetime (sum of those runs): 10 runs, 808 kills, 7,866,340 dealt, 18,026 taken, 1191 gold, 22 deaths / 21 downed, 63.6% accuracy (30888 / 17679), 9519 weakspots (30.8% of hits).

### 2.5 Damage breakdown entry

| Raw key | Type | Meaning | Example | Grain |
|---------|------|---------|---------|-------|
| `DamageDealtBreakdown[].DamageSourceTag.TagName` | GameplayTag | Source | `DamageSource.PrimaryFire` | per-run × source |
| `DamageDealtBreakdown[].DamageAmount` | Float | Amount | (per run; not in markdown) | per-run × source |

**Observed tags in the live save:**

| Tag | Group | Label to show |
|-----|-------|---------------|
| `DamageSource.PrimaryFire` | Direct | Primary Fire |
| `DamageSource.SecondaryFire` | Direct | Secondary Fire |
| `DamageSource.Ability` | Direct | Ability |
| `DamageSource.Melee` | Direct | Melee |
| `DamageSource.God.Abyss` | Blessing (god) | Abyss |
| `DamageSource.God.Blood` | Blessing (god) | Blood |
| `DamageSource.God.Brine` | Blessing (god) | Brine |
| `DamageSource.God.Defender` | Blessing (god) | Defender |
| `DamageSource.God.Fire` | Blessing (god) | Fire |
| `DamageSource.God.Frost` | Blessing (god) | Frost |
| `DamageSource.God.Gold` | Blessing (god) | Gold (alias Fortune — see §3.4) |
| `DamageSource.God.Lightning` | Blessing (god) | Lightning |
| `DamageSource.God.Ocean` | Blessing (god) | Ocean |
| `DamageSource.God.Spirit` | Blessing (god) | Spirit |
| `DamageSource.God.Wind` | Blessing (god) | Wind |

**Not observed:** `DamageSource.Ally`, `DamageSource.Amp`, `DamageSource.Passive`, per-blessing IDs (`PA_FirePassive8` is a *mutator path*, not a damage tag). **There is no per-blessing damage and no ally-amp channel in this save.**

### 2.6 Mutator log / enemy kill / node

| Raw key | Type | Meaning | Example | Grain |
|---------|------|---------|---------|-------|
| `MutatorsPickedUp[].MutatorPrimaryAsset` | SoftPath | Pickup | `PA_FireGodPassive_CharacterMutator` | per-run × mutator |
| `MutatorsPickedUp[].Rank` | Int | Stack/rank | `1`+ | per-run × mutator |
| `EnemiesKilledOfType[].EnemyId` | Name/Str | Display name in this save | `Golem Sentry` | per-run × enemy |
| `EnemiesKilledOfType[].KillCount` | Int | Kills | `145` lifetime for Golem Sentry | per-run × enemy |
| `NodesVisited[].NodeName` | Str | Encounter type | `Boss`, `Elite Enemy`, `Charm`, `Event`, `Gold`, `Locked Chest`, `Merchant`, `Void` | per-run × node |

### 2.7 Hidden coins

| Raw key | Type | Meaning | Example | Grain |
|---------|------|---------|---------|-------|
| `HiddenCoinsFoundMap` key | Name | Found fissure | `CoinChallenge_Lobby_3` | profile × coin |
| value | Bool | Found | `true` (only found keys appear) | profile × coin |

Regex: `^CoinChallenge_(?<area>.+)_(?<n>\d+)$`.

**Also present as unnumbered keys** (dropped by that regex): `CoinChallenge_Boatyard`, `CoinChallenge_Gardens`, `CoinChallenge_Lobby`, `CoinChallenge_Sanctuary`, `CoinChallenge_Submarine`, `CoinChallenge_Void`. Treat as area-level flags, **unknown** semantics (challenge unlock vs. “any coin in biome”).

**Found IDs in this profile (16):**  
`CoinChallenge_Submarine_5`, `_14`, `CoinChallenge_Lobby_1` through `_8`, `CoinChallenge_Sanctuary_15`, `_5`, `_11`, `_6`, `CoinChallenge_Void_1`, `_6`.

Canonical totals are **not in the save**. Wiki Surge Fissures (join): Lobby 8, Boatyard/Abandoned Temple 15, Submarine 15, Gardens 15, Sanctuary 15, Void/Royal Abyss 6. Total **74**.

### 2.8 Challenge counters (profile)

All keys observed in the live string table. Values in the markdown “Notable” subset only.

| Raw key | Type | Report value | Grain |
|---------|------|--------------|-------|
| `KillChallenge` | Int | 913 | profile |
| `BreakBreakablesChallenge` | Int | 1,000 | profile |
| `TakeDamageChallenge` | Int | 5,000 | profile |
| `DealExplosionDamageChallenge` | Int | 500,000 | profile |
| `DealDoTDamageChallenge` | Int | 100,000 | profile |
| `CompleteAllChallenges` | Int | 37 | profile |
| `FindAllRelics` | Int | 101 | profile |
| `UnlockAllWeaponsAndAbilities` | Int | 11 | profile |
| `UnlockAllArtifacts` | Int | 18 | profile |
| `ArmorDamageChallenge` | Int | 100,000 | profile |
| `KnockbackShotgunChallenge` | Int | 602 | profile |

**Keys present, values unknown** (not in the short report):  
`AnchorMastery`, `AncientSpearMastery`, `AtlanteanCubeMastery`, `DropShieldMastery`, `FragGrenadeMastery`, `TurretMastery`, `WeaponMastery`,  
`BoatyardBossChallenge`, `GardensBossChallenge`, `SanctuaryBossChallenge`, `SubmarineBossChallenge`, `VoidBossChallenge`, `BossVariantsChallenge`,  
`BowAccuracyChallenge`, `BowMultiKillChallenge`, `DiscLightningKillChallenge`, `DistanceKillChallenge`, `DistanceKillFishDeityChallenge`, `EliteEngineVesselsChallenge`, `ExplosionKillsWithEngineRifleChallenge`, `FishDeityReloadKill`, `HarpoonGunFireRate`, `HarpoonGunWeakspots`, `HitMultipleEnemiesFishDeityChallenge`, `KillEliteEnemy`, `KillEliteEnemy2`, `KillEliteEnemyFishDeityChallenge`, `KillMultipleEnemiesAtOnceChallenge`, `LightningOrbKillChallenge`, `LightTheBrazierChallenge`, `MultiHitDiscThrowerChallenge`, `OverheatEngineRifleChallenge`, `OverkillBrineRevolverChallenge`, `ScopeKillsBrineRevolverChallenge`, `SeekerKillMultipleEnemiesAtOnceChallenge`, `ShotgunMeleeExecuteChallenge`, `SpeedShotgunKills`, `SpendComboPoints`, `WeakspotHitCombatBowChallenge`, `WeakspotKillChallenge`, `WeakspotKillsBrineRevolverChallenge`,  
`DealHighDamageChallenge`, `DealLightningDamageChallenge`, `DefeatVoidChampionChallenge`, `DefeatVoidChieftainChallenge`, `DefeatVoidPrototypeChallenge`, `FirstDeathChallenge`, `GainHealthChallenge`, `HaveGoldChallenge`, `UseKeysChallenge`, `WishingWellChallenge`, `WinFastChallenge`, `WinWithoutHealingChallenge`, `WinWithoutMutatorChallenge`,  
`FillAbilitySlots`, `FillForgeSlots`, `FillPrimarySlots`, `FillSecondarySlots`,  
`CompleteBothModes`, `CompleteInfiniteMode`, `CompleteInfiniteModeAreas`, `CompleteRandomOrderMode`, `CompleteRunWithAllDifficulties`,  
`WinOnDifficulty1`, `WinOnDifficulty5`, `WinOnDifficulty10`, `WinOnDifficulty20`,  
`WinWithBrineRevolverChallenge`, `WinWithCombatBowChallenge`, `WinWithDiscGunChallenge`, `WinWithEngineRifleChallenge`, `WinWithFishDeityChallenge`, `WinWithHarpoonGunChallenge`, `WinWithPlasmaLauncherChallenge`, `WinWithShotgunChallenge`, `WinWithTeslaRifleChallenge`,  
`UnlockAllBrineRevolverMods`, `UnlockAllCombatBowMods`, `UnlockAllDiscThrowerMods`, `UnlockAllEngineRifleMods`, `UnlockAllFishDeityMods`, `UnlockAllHarpoonGunMods`, `UnlockAllPlasmaLauncherMods`, `UnlockAllShotgunMods`, `UnlockAllTeslaGunMods`, `UnlockAllSkills`,  
`UnlockAnchorChallenge`, `UnlockAncientSpearChallenge`, `UnlockAtlanteanCubeChallenge`, `UnlockBrineRevolverChallenge`, `UnlockCombatBowChallenge`, `UnlockDiscThrowerChallenge`, `UnlockDropShieldChallenge`, `UnlockFishDeityChallenge`, `UnlockHarpoonGunChallenge`, `UnlockPlasmaLauncherChallenge`, `UnlockShotgunChallenge`, `UnlockTeslaGunChallenge`, `UnlockTurretChallenge`.

**Targets / max values:** unknown (live in the pak). Do not fake percentages unless a community catalog supplies a target.

### 2.9 Settings files (do not parse as a profile)

`GameSettings.sav` / ini keys (examples): `MasterAudioVolume=0.800938`, `MusicAudioVolume=0.500789`, `AimSensitivity=0.150000`, `FieldOfView=100`, `CrosshairAlignmentOption=E_CENTERED`, `DamageNumbersOption=E_SEPARATE`, `GameLanguage=en`, `bPlayOnline=True`, `bCrossplay=True`.

### 2.10 Markdown report parser contract (secondary)

If the user drops `abyssus_save_report*.md` instead of a `.sav`, parse:

- Bullet stats under Profile Summary / Lifetime Totals.
- The per-run pipe table (columns `#`, `Loop`, `Weapon`, `Killed By`, `Dmg Dealt`, `Dmg Taken`, `Kills`, `Gold`, `Deaths`, `Downed`, `Accuracy`).
- Enemy table (`Enemy`, `Kills`).
- Challenge table (`Challenge`, `Progress`).
- Hidden-coins sentence (comma-separated IDs).

This is a **lossy** view: no damage breakdown, no mutators, no nodes, no loadouts, no soft paths. Mark the session as `source: markdown-report`.

---

## 3. Entity dictionaries

Join key: last path segment, strip `_C`, `PA_`, `BP_`, `_CharacterMutator`, `_Cosmetic`, `_Mutator`, `_Behavior`. Prefer a catalog over regex when both exist.

### 3.1 Weapons

Wiki (https://abyssus.wiki.gg/wiki/Weapons): eight/nine weapons; player starts with Engine Rifle; 3 primary + 3 secondary modes; golden skin for all six modes.

| ID / path leaf | Display | In this save? | Notes |
|----------------|---------|---------------|-------|
| `PA_EngineRifle` | Engine Rifle | yes (runs 1–5, 9) | Default |
| `PA_Shotgun` | Shotgun | yes (runs 6–7) | |
| `PA_HarpoonGun` | Harpoon Gun | yes (run 8) | |
| `PA_BoomerangGun` | Boomerang Gun / Disc Thrower? | yes (run 10) | Challenge keys also say `DiscThrower` / `DiscGun`. **Unknown** whether they are the same gun or two guns. |
| `PA_TeslaGun` | Tesla Gun | unlocked path present | Challenges: `WinWithTeslaRifleChallenge` |
| `PA_BrineRifle` | Brine Rifle | path present | |
| `PA_CombatBow` | Combat Bow | path present | |
| `PA_BrineRevolver` | Brine Revolver | **challenge keys only** | Not in `/Weapons/` strings of this profile |
| `DiscThrower` | Disc Thrower | **challenge keys only** | |
| `FishDeity` | Fish Deity | **challenge keys only** | |
| `PlasmaLauncher` | Plasma Launcher | **challenge keys only** | |

Weapon mods observed (family → leaves):

| Family | Mod IDs |
|--------|---------|
| EngineRifle | `Automatic`, `Burst`, `ConcentratedShot`, `EngineRev`, `SplitShot`, `WindUp` |
| Shotgun | `Buckshot`, `FullAutomatic`, `SemiAutomatic` |
| HarpoonGun | `BarbedHarpoons`, `Harpoon`, `RailgunHarpoon` |
| BoomerangGun | `Automatic`, `FanFire`, `Flame`, `SearchAndDestroy` |
| BrineRifle | `ChargedScope`, `RapidBurst`, `RapidFire`, `SteadyScope` |
| CombatBow | `MultiShot`, `PrecisionShot` |
| TeslaGun | `LightningBeam`, `LightningOrb` |

### 3.2 Abilities

Wiki list: Frag Grenade, Anchor, Smiting Spear, Ancient Core, Brine Field, Turret.

| Save family / PA | Wiki / pretty name | Notes |
|------------------|--------------------|-------|
| `FragGrenadeAbility` / `PA_FragGrenade_CharacterMutator` | Frag Grenade | mods: `BouncyBomb`, `ImplosiveForce` |
| `AnchorAbility` / `PA_Anchor_CharacterMutator` | Anchor | |
| `AncientSpear` / `PA_AncientSpear_CharacterMutator` | Smiting Spear (wiki) | join, not a save string |
| `AtlanteanCubeAbility` / `PA_AtlanteanCube_CharacterMutator` | Ancient Core (wiki) | `ConeBlase` (typo in asset), `AtlanteanCubeMasteryChallenge` |
| `DropShieldAbility` / `PA_DropShield_CharacterMutator` | Brine Field? **unknown join** | `LingeringShield`, `MobileShield`, `Sanctum` |
| `TurretAbility` / `PA_Turret_CharacterMutator` | Turret | `AmmoTransferMod`, `BuddySystem`, `Persistent` |
| `HealingFlask` / `PA_HealingFlask_CharacterMutator` | Healing Flask | not on the short wiki list |
| `GenericAbility` | shared ability upgrades | `DoubleTrouble`, `ExtraPockets`, `IncreasedEfficiency`, `RichGetRicher` |

Healing Flask / Dash / Jump / melee (`BP_Melee_CharacterMutator`, `PA_Dash_CharacterMutator`, `PA_Jump_CharacterMutator`) are **systems**, not workbench abilities. Do not count them as the six workbench abilities.

### 3.3 Charms / relics / forge

The save does **not** have a field named `Relic`. `FindAllRelics` is a challenge counter (101). Relics in player language ≈ mutators / charms / blessings picked up.

**Charm PAs** (`CharmMutators`): `PA_Backline_Charm`, `PA_Durable`, `PA_Enervate_Charm`, `PA_FavoredFoe_Charm`, `PA_GoldConverter_Charm`, `PA_Headstart`, `PA_Lifeline_Charm`, `PA_Overdrive_Charm`, `PA_Revenant_Charm`, `PA_Fan_Charm_WeaponMutator`.

**Skill-tree mutator PAs** (assigned nodes also stored as human names): Ability Abundance, Abyssal Stamina / II, Bartering, Bountiful Bottles / II, Combat Medic, Controlled Chaos, Extra encounter/reward nodes (Ability Weapon Altar, Healing Boatyard/Gardens, Upgrade Altar, Wishing Well), Favorite Costumer (typo), Growing Chain, Hastened Dash, Locksmith, Mutator Reroll, Plague, Rare Supplies, Reserve Stock, Timely Reward, Treasure Map, Upgraded Inventions, Wellfare (typo), Ability Abundance II, Enhanced Weapons, Keen Vision, Magazine Madness, Rapid Fire.

**Report’s 17 assigned skill names:** Ancient Forge, Bountiful Bottles, Enhanced Weapons, Plague, Controlled Chaos, Abyssal Stamina, Starting Funds, Upgraded Inventions, Hastened Dash, Rare Supplies, Abyssal Stamina II, Gambler, Magazine Madness, Reserve Stock, Abundance, Ability Abundance, Picky Worship.

### 3.4 Blessings / gods / aspects

Save **god folder + damage tag** vs wiki **aspect title** (join is approximate; wiki tables were empty in the fetch):

| Save God / `DamageSource.God.*` | Asset prefix | Wiki aspect (join) |
|---------------------------------|--------------|--------------------|
| Blood | `PA_Blood*` | Blood |
| Defender | `PA_Defender*` | Barrier |
| Fire | `PA_Fire*` / `PA_ApplyFire_*` | Flares |
| Gold | `DamageSource.God.Gold` | Goldburst |
| Fortune | `PA_Fortune_*` (no `God.Fortune` tag) | Goldburst / Fortune — **same pantheon, two names** |
| Frost | `PA_Frost*` / `PA_ApplyChill_*` | Frozen |
| Lightning | `PA_Lightning*` / `PA_ChainLightning_*` | Chain Lightning |
| Abyss | `PA_Abyss*` | Shadows? **unknown** |
| Ocean | `PA_Ocean*` | Tentacles? **unknown** |
| Spirit | `PA_Spirit*` | Spirit |
| Wind | `PA_Wind*` / `PA_Windburst_*` | Windburst |
| Brine | `PA_Brine*` | Brine |

Per-god asset *kinds* (do not flatten):

- `PA_{God}GodPassive_CharacterMutator`
- `PA_{God}MajorBlessing_CharacterMutator`
- `PA_{God}MinorBlessing_CharacterMutator`
- `PA_{God}Passive{N}_CharacterMutator`
- `PA_{God}_Behavior_{PrimaryFire\|SecondaryFire\|Ability}_Mutator`

Wiki mechanics (context, not save fields): 10 aspects advertised; 11 blessing slots per aspect; 3rd = Minor, 6th = Major; one aspect per primary / secondary / ability; upgrade altar doubles effects.

**Cannot show:** damage of `PA_FirePassive8` vs `PA_FirePassive2`. Only `DamageSource.God.Fire` as a lump.

### 3.5 Enemies (lifetime kills from the report)

| Display name (`EnemyId`) | Kills | Faction / tier (inferred from prefix) |
|--------------------------|------:|----------------------------------------|
| Golem Sentry | 145 | Golem / trash |
| Golem Scrapper | 141 | Golem / trash |
| Primal Grenadier | 76 | Primal / trash |
| Primal Bomber | 59 | Primal / trash |
| Primal Slinger | 50 | Primal / trash |
| Golem Dragonfly | 46 | Golem / trash |
| Primal Bulwark | 42 | Primal / trash |
| Trueborn Ghoul | 28 | Trueborn / trash |
| Golem Damselfly | 24 | Golem / trash |
| Trueborn Husk | 24 | Trueborn / trash |
| Golem Tank | 22 | Golem / trash |
| Primal Bruiser | 12 | Primal / trash |
| Primal Shaman Offensive | 9 | Primal / trash |
| Trueborn Wraith | 9 | Trueborn / trash |
| Golem Sweeper | 8 | Golem / trash |
| Golem Fabricator | 7 | Golem / trash |
| Trueborn Necromancer | 5 | Trueborn / trash |
| Trueborn Embalmer | 5 | Trueborn / trash |
| Trueborn Vicar | 4 | Trueborn / trash |
| The Golemancer | 3 | Boss |
| Elite Overseer | 2 | Elite |
| Elite Berserker | 2 | Elite |
| To'raka, King of the Abyss | 2 | Boss |
| Trueborn Dreadknight | 2 | Trueborn / elite-or-trash **unknown** |
| General Kri'su | 1 | Boss |
| Elite Catalyst | 1 | Elite |
| Highpriest Un'glu | 1 | Boss |
| Primal Chieftain | 1 | Boss |

Blueprint killers (join to pretty names):

| Soft path leaf | Display |
|----------------|---------|
| `BP_Golemancer` | The Golemancer |
| `BP_EliteGardenEnemy` | Elite Garden Enemy |
| `BP_GeneralKrisu` | General Kri'su |
| `BP_Elite_Golem_Sentry` | Elite Golem Sentry |
| `BP_GardensChieftain` | Primal Chieftain / Gardens Chieftain |
| `BP_TruebornGhoul_2` | Trueborn Ghoul |

Other named variants in the string table (kills unknown): `Flame Tyrant Kri'su`, `Night Seer Un'glu`, `Trueborn Golemancer`, `Trueborn Champion`.

### 3.6 Locations / biomes

| Save key (`Area.*` / coin prefix) | Wiki / player name | Coins (wiki join) | Wardrobe (wiki join) |
|-----------------------------------|--------------------|-------------------:|----------------------|
| `Lobby` | Lobby | 8 | Tinker |
| `Boatyard` | Abandoned Temple | 15 | Sturdy |
| `Submarine` | Submarine | 15 | Brine |
| `Gardens` | Gardens | 15 | Vines |
| `Sanctuary` | Sanctuary | 15 | Deep |
| `Void` | Royal Abyss / THE ROYAL ABYSS | 6 | Heavenly |

String `THE ROYAL ABYSS` appears in the save. Node type `Void` is an encounter type, not the biome.

### 3.7 Cosmetics (paths in this save)

Emotes: `PA_Emote_Brine_Share_Cosmetic`, `PA_Emote_Brineston_Cosmetic`, `PA_Emote_Flag_Cosmetic`, `PA_Emote_SeaShanty_Cosmetic`.  
Helms: `PA_Helm_Juggernaut_Cosmetic`, `PA_Helm_Replacement_Cosmetic`.  
Paints: `PA_PaintJob_Golden_Cosmetic`, `PA_PaintJobs_Reward_03`, `_05`, `PA_EngineRifle_PaintGold`, `PA_EngineRifle_PaintStandard`.  
Frames: `PA_PlayerFrame_BrineRot_Cosmetic`; widgets `Widget_PlayerFrame_BrineRot_01`, `_Frozen_01`, `_WeatheredGold_01`.  
Voice: `PA_Voice_BrinehunterA_Cosmetic`.  
Suit: `PA_Suit_Explorer_Cosmetic`.

### 3.8 Currencies

| Name | Save key | Example | Grain |
|------|----------|---------|-------|
| Soul Fragments | `SoulFragments` (uncertain) | 31 (report) | profile |
| Gold | `GoldCollected` | 1191 lifetime | run + sum |
| Keys | `NumKeys` | per run | run |
| Difficulty points | `NumDifficultyPoints` | 1 | profile |

Steam: “over 250 Charms and Blessings”, “140 Ancient Forge”, “9 weapons / 45 mods” — marketing, not save fields.

### 3.9 Difficulty modifier names (string table)

Abolished Shrines, Abyssal Leviathans, Corrupted Depths, Corrupted Descent, Depleted Shrines, EcoWarfare, Executioner, Frenzy, Gold Drain, Greedy Merchants, Infinite Pain, Nautical Horrors, Oceanic Omens, Remnants, Royal Heralds, Saltwater Sorcery, Spiked Charms, Submerged Sorrows, Surging Force, Tidal Pressure, Wildfire. Point values **unknown** except “1 point available” on the profile.

---

## 4. Derived / cross stats the data actually supports

### 4.1 Supported (compute these)

| Stat | How | Grain |
|------|-----|-------|
| Weapon vs ability vs melee vs blessing **composition** | Sum `DamageDealtBreakdown` by tag group | run + lifetime |
| Ability damage | `DamageSource.Ability` | run + lifetime |
| Blessing damage **by god** | `DamageSource.God.{God}` | run + lifetime |
| Weapon table | Group runs by `WeaponUsed`: n, wins, avg dealt/taken, acc, kills, gold | lifetime |
| Ability table | Group by `AbilityPrimaryAssetAtStartOfRun` | lifetime |
| Accuracy / weakspot % | `hits/(hits+miss)`, `weak/hits` | run + pooled lifetime |
| Hidden coins missing | Found IDs vs **wiki totals** (hardcode 8/15/15/15/15/6). Gaps in 1..total. Empty biomes still 0/N | profile |
| Challenge progress | Counter + family group; optional “likely complete” only if a published target exists | profile |
| Per-run drill-down | guns, start mods, ability, charms, mutators+rank, nodes, enemies, challenges this run, damage mix | run |
| Co-op share | `dealt / (dealt + partner.dealt)` **if** pairing is trusted | run |
| Collection completeness | catalog − unlocked − discovered = missing | profile |
| Loop / infinite / win rate | `LoopReached`, `bInfiniteMode`, `RunSuccesful` | run + lifetime |

### 4.2 Not supported (say so in the UI)

| Requested feature | Why it cannot be backed |
|-------------------|-------------------------|
| **Per-blessing damage** (this Fire passive vs that one) | Only god-level tags exist |
| **Ally damage amp** | No `DamageSource.Ally` / Amp. Turret/`BuddySystem` is invisible or folded into Ability |
| Challenge **percent bars to a real target** | Targets are in the pak, not the save |
| Coin **room names** from the save | IDs are `Area + number` only. Room text is wiki-only if added later |
| “What this dive unlocked” | Unlocks are profile-level, not attributed to a run |
| End-of-run loadout | Only `*AtStartOfRun` |
| Character (Sin/Dani/Kari/Bob) stats | Not in this save |
| Live mid-run HP/ammo | Not in sampled files |
| Exact Soul Fragment key | Report 31 vs missing ASCII `SoulFragments` — show with a confidence flag |

---

## 5. Viewer product contract (arena prompt seed)

### 5.1 Product

Professional **drop-to-parse** dive log. User drops `ProfileN.sav` (preferred) and/or the markdown report. Parse **locally**. Never upload. Present categorized, contextual views — not a raw JSON dump.

This is a **new standalone app**, not a feature of the civic platform.

### 5.2 Recommended stack (mandatory)

`origin/main` of `agree` is **Hono + TypeScript + SSR JSX/HTMX + Pico CSS + SQLite** (civic request platform). It is **not** SvelteKit. Do **not** add viewer routes to that Hono app.

**Build:** a standalone **Vite + Svelte 5 + TypeScript + Tailwind** app in:

```
abyssus-viewer/
```

(at the workspace root of whichever arena/repo is implementing). No SvelteKit file router required. No Hono. No Pico. Client-only parse is enough (FileReader + GVAS). Optional tiny Vite preview server only.

Port the proven GVAS reader from `abyssus_save_explorer.html` into `src/lib/gvas.ts` (or equivalent). Add a markdown-report fallback parser.

### 5.3 Parse strategy

1. If magic `GVAS` and class `RSaveGame` → full profile.  
2. If GVAS but `RSaveGameSettings` / `RSaveGameSession` / Enhanced Input → specific error naming those files.  
3. If `.md` matching the report headings/tables → lossy markdown mode.  
4. Else → field-level diagnostic (magic, class, first property names).

Do not depend on the explorer’s `peek<200` alignment hack without a fixture test against this `Profile1.sav`.

### 5.4 Information architecture

Persistent two layers:

| Layer | Contents |
|-------|----------|
| **Profile** | Souls/difficulty, skill tree, difficulty mods, collection (owned/seen/missing), cosmetics, saved loadouts, coins, challenge families, lifetime combat + composition |
| **Runs** | List → drill-down → compare. Each dive: loadout, mix, path, mutators grouped by god/kind, enemies, per-run challenges |

**Suggested chrome (single page, dense):**

1. Drop / empty state  
2. **Overview** — labeled profile vs lifetime vs last-run; composition chart; missing-coins sparkline; do not mash skill tree into the same card as DPS  
3. **Runs** — filterable list, lazy detail, compare two  
4. **Loadouts** — the 6 presets + equipped  
5. **Blessings** — god × kind; damage share by god (not 400 chips)  
6. **Arsenal / collection** — weapons, mods, abilities, charms, cosmetics  
7. **Enemies** — faction/tier, sort, drill to runs  
8. **Challenges** — grouped families, counters, dropdown for related runs/keys  
9. **Coins** — all six biomes always, found/total, missing IDs, wardrobe reward  

Empty states: “No runs — finish a dive with the game closed, then re-drop Profile1.sav.”  
Wrong file: name `GameSettings.sav` and `SAVE_GAME_SESSION_SLOT.sav`.

### 5.5 Interaction model

- Drop zone + file picker (`accept` `.sav,.md` or no accept + sniff).  
- Run selector: weapon, ability, outcome, loop, infinite, killer. Sort: idx, dealt, kills, acc, time, gold, deaths, loop.  
- Drill-down: open one run; do **not** pre-render every SVG.  
- Compare: pin two runs (loadout + mix + path + mutators).  
- Enemies: sortable compact table; click → runs that killed that type.  
- Challenges: search + family dropdown; chip filters.  
- Graphs: stacked composition (100% or absolute), damage-per-run with win/loss color, coin bars against **canonical** totals.  
- Export: shaped JSON + CSV of runs; copy compact run card. No upload.  
- Virtualize long lists. Do not replace the whole panel on each keystroke.

### 5.6 Required product surface (user + expansion)

Must beat the HTML explorer (see teardown §4). Minimum:

- Categorized exploration of **all catalogued fields**, with context.  
- Hidden coins: every biome, missing IDs, progress against wiki totals, wardrobe reward.  
- Challenge progress (honest counters; group; related-info dropdowns).  
- Enemy kills: sortable, compact, navigable to runs.  
- Per-run breakdown with drill-down (guns, abilities, blessings/passives grouped, charms).  
- Cross-stats: ability damage, weapon vs ability vs melee vs blessing composition, god-level blessing damage. **No fake ally amp. No fake per-blessing damage.**  
- Graphs + filters where data supports them.  
- Loadouts tab (explorer skipped this).  
- Render `CosmeticPAs` and `LastEncounteredBossVariantInArea`.

### 5.7 Visual quality (“extreme professional”)

- Game-native dive log: abyss `#08181F`, phosphor `#79CDBB`, cream `#EADFC6`, coral `#E4674B`, brass `#DFA63A`. Steal tokens from the explorer; **raise density**.  
- Typography: serif for the log title only; mono for instruments; tabular nums.  
- Data-ink: composition and missing-coins should be readable at a glance. Decorative bathymetry is optional.  
- Motion: restrained; honor `prefers-reduced-motion`.  
- Comparison and export are part of quality, not extras.  
- A11y: real tablist keyboard nav; no `focusBack` caret hack.

### 5.8 What the viewer can uniquely show

Abyssus’s in-game stats screen omits (explorer footer, confirmed by fields): accuracy, weakspot rate, damage-by-source, node path, mutator ranks, per-enemy lifetime, coin IDs, challenge counters, saved loadouts. That is the product.

---

## 6. Assumptions + open risks

### 6.1 Assumptions (plow-ahead)

1. Implement in `abyssus-viewer/` as Vite + Svelte 5 + TS + Tailwind, even though Cursor plugins include SvelteKit helpers.  
2. `CoinChallenge_*` = wiki Surge Fissures. `Boatyard` → Abandoned Temple, `Void` → Royal Abyss. Hardcode 8/15/15/15/15/6 until the pak is unpacked.  
3. `DamageSource.God.Gold` and `PA_Fortune_*` are one pantheon.  
4. `PA_BoomerangGun` may be the Disc Thrower; keep both labels if uncertain.  
5. Sin/Dani/Kari/Bob are **unverified**; do not render as fact.  
6. Relics = mutators/charms/blessings for `FindAllRelics`, not a separate array.  
7. Profiles can grow to hundreds of runs / mutator paths.  
8. Markdown report and HTML explorer describe the same `Profile1.sav`.  
9. Steam Cloud `accountid` must not be displayed as a headline identity.  
10. English loc (`GameLanguage=en`) is enough for v1 pretty-names.

### 6.2 Data gaps

- Pak not unpacked → no official string table, no challenge targets, no room-level coin names, no full weapon list beyond save + wiki.  
- `SoulFragments` key mismatch.  
- Loadout struct not hex-dumped field-by-field (names only).  
- Co-op map key semantics.  
- Unnumbered `CoinChallenge_{Area}` keys.  
- Wiki blessing *individual* names not recovered (empty tables in fetch).  
- Character roster unverified.

### 6.3 Files not fully read

| File | Why |
|------|-----|
| `RGame-Windows.pak` (5.5 GB) | No UnrealPak/repak run in this pass |
| `RGame-Win64-Shipping.exe` | No full strings harvest |
| EOS cache `PDSFriends.db` | Friends cache; out of scope |
| Per-run nested numeric fields | Markdown + explorer schema; not a JSON dump of all 10 structs |
| Wiki room-by-room fissure text | Totals only |

---

## 7. UI architecture alternatives (grafting appendix)

| ID | Approach | Verdict |
|----|----------|---------|
| **A. Layered dive log (recommended)** | One SPA: Profile rail + Runs workspace. Overview is a *summary of both layers*, labeled. Blessings/coins/challenges are profile tools; run compare is the historical tool. | **Recommend.** Matches the save, beats the explorer’s mashed tabs, still one drop-zone product. |
| **B. Clone the six HTML tabs** | Overview / Runs / Enemies / Challenges / Collection / Coins, restyle. | Fast, loses loadouts, blessings IA, compare, catalog completeness. Do not ship as the contract. |
| **C. Run-first timeline** | Vertical feed of dives; profile as a slide-over. | Good for “last night’s session,” weak for coins/challenges/collection — the unique meta data. |

**Arena contract = Alternative A** with the stack in §5.2 and the must-beat list in the explorer teardown §4 (coins vs canonical totals, blessing grouping, cross-stats, loadouts, IA split, challenge families, enemy factions, run compare, collection completeness, GVAS+markdown parse, export, virtualization, a11y, dense dive-log visuals).

---

## 8. Implementer checklist (non-goals)

- Do **not** implement inside the Hono civic app.  
- Do **not** invent ally amp or per-blessing damage.  
- Do **not** use “at least max(found)” for coins.  
- Do **not** dump 400 mutator chips.  
- Do **not** treat the markdown report as richer than the `.sav`.  
- Do **not** ask the user questions; the assumptions above are the decisions.

---

*Grounding compiled from the live `Profile1.sav` string table, `abyssus_save_report_1.md`, `abyssus_save_explorer.html` + teardown, AppData tree, Steam install/appmanifest 1721110, and https://abyssus.wiki.gg (Weapons, Abilities, Blessings, Surge Fissures).*
