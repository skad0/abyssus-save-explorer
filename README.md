# Abyssus Dive Log

Local viewer for Abyssus `Profile1.sav` (Unreal GVAS) and the thin markdown save report. The file never leaves the browser.

```sh
npm install
npm run dev
```

Drop `%LOCALAPPDATA%\Abyssus\Saved\SaveGames\Profile1.sav`. Close the game first. Do not use `GameSettings.sav` or `SAVE_GAME_SESSION_SLOT.sav`.

v1 of this tool lives at `legacy-v1.html` / `legacy/index.html`.

## Assumptions

- Surge Fissure totals come from wiki.gg (Lobby 8, Temple/Submarine/Gardens/Sanctuary 15, Royal Abyss 6). Room names are not in the save.
- Challenge targets are unknown except binary win/unlock/boss/mastery flags. Sample-profile counters are not treated as goals.
- `DamageSource.God.Gold` is Fortune. There is no ally-amp tag in current saves.
- Weapon / ability / aspect blurbs are baked from wiki.gg and a community aspect guide (2026-08-18). Drop Shield = Brine Field, Ancient Spear = Smiting Spear, Atlantean Cube = Ancient Core.
- Combo efficiency is measured against *your* runs (DPS, dealt/taken, vs profile mean). Catalog synergies are hints, not a meta tier list.
- `SoulFragments` may be missing from GVAS; the markdown report lists 31 for this profile.
