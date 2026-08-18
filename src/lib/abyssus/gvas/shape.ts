import { buildChallenge } from '../catalogs/challenges';
import { COIN_CATALOG } from '../catalogs/coins';
import { classifyEnemy, prettyEnemy } from '../catalogs/enemies';
import { KNOWN_ABILITIES, KNOWN_WEAPONS, matchesKnown } from '../catalogs/items';
import {
	categoryOf,
	classifyMutator,
	damageSource,
	pretty,
	prettyArea,
	ticksToDate
} from '../pretty';
import type {
	AbyssusProfile,
	ChallengeEntry,
	CoinBiome,
	CollectionItem,
	DamageSlice,
	LoadoutPreset,
	MutatorEntry,
	RunRecord
} from '../types';
import { emptyProfile } from '../types';
import type { GvasParsed } from './reader';
import { computeCrossStats } from '../stats';
import { isRunWin } from '../run-outcome';

type Loose = Record<string, unknown>;

function asObj(v: unknown): Loose | null {
	return v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : null;
}

function asArr(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

function asStr(v: unknown): string {
	return typeof v === 'string' ? v : String(v ?? '');
}

function asNum(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

function soulFragments(S: Loose): number | null {
	for (const key of ['SoulFragments', 'SoulFragment', 'NumSoulFragments', 'Currency']) {
		if (key in S && S[key] != null) return asNum(S[key]);
	}
	return null;
}

function parseBreakdown(r: Loose): DamageSlice[] {
	return asArr(r.DamageDealtBreakdown)
		.map((e) => {
			const row = asObj(e);
			if (!row) return null;
			const tagObj = asObj(row.DamageSourceTag);
			const tag = asStr(tagObj?.TagName ?? row.DamageSourceTag);
			const d = damageSource(tag);
			const amount = asNum(row.DamageAmount);
			if (amount <= 0) return null;
			return { tag, group: d.group, label: d.label, amount };
		})
		.filter((x): x is DamageSlice => x != null)
		.sort((a, b) => b.amount - a.amount);
}

function parseMutators(list: unknown): MutatorEntry[] {
	return asArr(list)
		.map((m) => {
			const row = asObj(m);
			if (!row) return null;
			const raw = asStr(row.MutatorPrimaryAsset ?? row);
			return classifyMutator(raw, asNum(row.Rank) || 1);
		})
		.filter((x): x is MutatorEntry => x != null);
}

function runIndexKey(v: unknown): number | null {
	if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v;
	if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
	return null;
}

function coopByRunIndex(otherStats: unknown): Record<number, Loose[]> {
	const out: Record<number, Loose[]> = {};
	for (const entry of asArr(otherStats)) {
		const pair = asArr(entry);
		const idx = runIndexKey(pair[0]);
		if (idx == null) continue;
		const blob = asObj(pair[1]);
		if (!blob) continue;
		out[idx] = asArr(blob.RunStats)
			.map((r) => asObj(r))
			.filter((row): row is Loose => row != null);
	}
	return out;
}

function shapePartner(row: Loose): RunRecord['coop'][number] {
	return {
		player: asStr(row.PlayerName).replace(/\/$/, '') || 'Partner',
		dealt: asNum(row.DamageDealt),
		taken: asNum(row.DamageTaken),
		kills: asNum(row.EnemiesKilled),
		deaths: asNum(row.Deaths),
		weapon: pretty(row.WeaponUsed),
		ability: pretty(row.AbilityPrimaryAssetAtStartOfRun)
	};
}

function parseRuns(rawRuns: unknown, coopMap: Record<number, Loose[]>): RunRecord[] {
	return asArr(rawRuns).map((r, i) => {
		const row = asObj(r) ?? {};
		const hits = asNum(row.bulletsHit);
		const miss = asNum(row.bulletsMissed);
		const weak = asNum(row.weakspotsHit);
		const nested = asObj(row.RunStats) ?? {};
		const coop = coopMap[i];
		const killedBy = pretty(row.EnemyKilledBy);
		return {
			index: i,
			win: isRunWin(row.RunSuccesful, killedBy),
			loop: asNum(row.LoopReached),
			infinite: Boolean(row.bInfiniteMode),
			player: asStr(row.PlayerName),
			weapon: pretty(row.WeaponUsed) ?? '—',
			weaponRaw: asStr(row.WeaponUsed),
			modPrimary: pretty(row.PrimaryWeaponModAtStartOfRun),
			modSecondary: pretty(row.SecondaryWeaponModAtStartOfRun),
			ability: pretty(row.AbilityPrimaryAssetAtStartOfRun),
			killedBy,
			dealt: asNum(row.DamageDealt),
			taken: asNum(row.DamageTaken),
			kills: asNum(row.EnemiesKilled),
			gold: asNum(row.GoldCollected),
			keys: asNum(row.NumKeys),
			deaths: asNum(row.Deaths),
			downed: asNum(row.TimesDowned),
			revives: asNum(row.TimesRevivedOtherPlayers),
			maxHP: asNum(row.MaxHPReached),
			hits,
			miss,
			weak,
			acc: hits + miss > 0 ? (hits / (hits + miss)) * 100 : null,
			weakPct: hits > 0 ? (weak / hits) * 100 : null,
			time: nested.RunTime != null ? asNum(nested.RunTime) : null,
			level: nested.LevelReached != null ? asNum(nested.LevelReached) : null,
			room: nested.RoomReached != null ? asNum(nested.RoomReached) : null,
			breakdown: parseBreakdown(row),
			mutators: parseMutators(row.MutatorsPickedUp),
			charms: asArr(row.EquippedCharms).map((p) => pretty(p) ?? asStr(p)),
			nodes: asArr(row.NodesVisited)
				.map((n) => asObj(n)?.NodeName)
				.filter(Boolean)
				.map(asStr),
			challenges: asArr(row.ChallengesCompleted).map((c) => pretty(c) ?? asStr(c)),
			enemies: asArr(row.EnemiesKilledOfType)
				.map((e) => {
					const er = asObj(e);
					if (!er) return null;
					const id = asStr(er.EnemyId);
					if (!id || id === 'None') return null;
					const name = prettyEnemy(id);
					const { faction, role } = classifyEnemy(id, name);
					return { name, count: asNum(er.KillCount), faction, role };
				})
				.filter((x) => x != null),
			coop: (coop ?? []).map(shapePartner)
		};
	});
}

function parseLoadouts(S: Loose): LoadoutPreset[] {
	const equipped = asObj(S.EquippedLoadout);
	const equippedWeapon = asStr(equipped?.Weapon);
	return asArr(S.Loadouts).map((entry, slot) => {
		const pair = asArr(entry);
		const data = asObj(pair[1]) ?? asObj(entry) ?? {};
		const weaponRaw = asStr(data.Weapon ?? pair[0]);
		return {
			slot: slot + 1,
			name: pretty(weaponRaw) ?? `Preset ${slot + 1}`,
			weapon: pretty(data.Weapon),
			ability: pretty(data.CharacterAbility),
			primaryMod: pretty(data.PrimaryFireMod),
			secondaryMod: pretty(data.SecondaryFireMod),
			attachment0: pretty(data.Attachment0Mod) || null,
			attachment1: pretty(data.Attachment1Mod) || null,
			suit: pretty(data.SuitMutator),
			cosmetic: pretty(data.WeaponCosmeticPA),
			equipped: Boolean(equippedWeapon && equippedWeapon === asStr(data.Weapon))
		};
	});
}

function parseCoins(mapData: unknown): CoinBiome[] {
	const foundByArea: Record<string, number[]> = {};
	for (const [k, v] of asArr(mapData) as [unknown, unknown][]) {
		if (!v) continue;
		const key = asStr(k);
		const m = /^CoinChallenge_(.+)_(\d+)$/.exec(key);
		if (!m) continue;
		(foundByArea[m[1]] ??= []).push(parseInt(m[2], 10));
	}
	for (const ids of Object.values(foundByArea)) ids.sort((a, b) => a - b);

	return COIN_CATALOG.map((c) => {
		const found = foundByArea[c.key] ?? [];
		const missing: number[] = [];
		for (let i = 1; i <= c.total; i++) {
			if (!found.includes(i)) missing.push(i);
		}
		return {
			key: c.key,
			label: c.label,
			wardrobe: c.wardrobe,
			total: c.total,
			found,
			missing,
			remaining: c.total - found.length
		};
	});
}

function parseChallenges(pairs: unknown): ChallengeEntry[] {
	return (asArr(pairs) as [unknown, unknown][])
		.map(([k, v]) => buildChallenge(asStr(k), asNum(v), pretty(asStr(k)) ?? asStr(k)))
		.filter((c) => !/^CoinChallenge_.+_\d+$/.test(c.key))
		.sort((a, b) => b.count - a.count);
}

function parseCollection(S: Loose): CollectionItem[] {
	const unlocked = asArr(S.UnlockedLoadoutOptions).map(asStr);
	const discovered = asArr(S.DiscoveredLoadoutOptions).map(asStr);
	const found = new Set(unlocked);
	const items: CollectionItem[] = [
		...unlocked.map((path) => ({
			path,
			name: pretty(path) ?? path,
			category: categoryOf(path),
			state: 'unlocked' as const
		})),
		...discovered
			.filter((p) => !found.has(p))
			.map((path) => ({
				path,
				name: pretty(path) ?? path,
				category: categoryOf(path),
				state: 'discovered' as const
			}))
	];
	const seen = new Set(items.map((i) => i.path + i.name));
	for (const w of KNOWN_WEAPONS) {
		if (items.some((i) => matchesKnown(i.path, w.id) || matchesKnown(i.name, w.id))) continue;
		const path = `catalog:${w.id}`;
		if (seen.has(path + w.name)) continue;
		items.push({ path, name: w.name, category: 'Weapon', state: 'unknown' });
	}
	for (const a of KNOWN_ABILITIES) {
		if (items.some((i) => matchesKnown(i.path, a.id) || matchesKnown(i.name, a.id))) continue;
		items.push({ path: `catalog:${a.id}`, name: a.name, category: 'Ability', state: 'unknown' });
	}
	items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
	return items;
}

function aggregateEnemies(runs: RunRecord[]): AbyssusProfile['enemyTotals'] {
	const totals: AbyssusProfile['enemyTotals'] = {};
	for (const run of runs) {
		for (const e of run.enemies) {
			const cur = totals[e.name] ?? { kills: 0, runs: 0, best: 0, faction: e.faction, role: e.role };
			cur.kills += e.count;
			cur.runs += 1;
			cur.best = Math.max(cur.best, e.count);
			totals[e.name] = cur;
		}
	}
	return totals;
}

function aggregateSrc(runs: RunRecord[]): DamageSlice[] {
	const map: Record<string, DamageSlice> = {};
	for (const run of runs) {
		for (const b of run.breakdown) {
			const k = `${b.group}|${b.label}`;
			if (!map[k]) map[k] = { ...b, amount: 0 };
			map[k].amount += b.amount;
		}
	}
	return Object.values(map).sort((a, b) => b.amount - a.amount);
}

export function shapeGvas(parsed: GvasParsed, fileName: string): AbyssusProfile {
	const profile = emptyProfile(fileName, 'gvas');
	const P = parsed.props;
	const S = asObj(P.SaveGameData) ?? {};
	profile.engine = parsed.engine;
	profile.saveClass = parsed.saveClass;
	profile.slot = asStr(P.SaveSlotName);
	profile.saved = ticksToDate(P.Timestamp);
	profile.build = P.CreationChangelist != null ? asNum(P.CreationChangelist) : null;
	profile.souls = soulFragments(S);
	profile.diffPoints = asNum(S.NumDifficultyPoints);
	profile.logbook = asNum(S.NumTimesOpenedLogbook);

	const coopMap = coopByRunIndex(S.OtherPlayerStats);
	profile.runs = parseRuns(S.RunStats, coopMap);
	profile.loadouts = parseLoadouts(S);
	profile.collection = parseCollection(S);
	profile.skills = asArr(S.SkillTreeNodesAssigned).map(asStr);
	profile.difficulty = (asArr(S.DifficultyTreeAssignedPointsNew) as [unknown, unknown][]).map(([k, v]) => ({
		name: asStr(k),
		pts: asNum(v)
	}));
	profile.challenges = parseChallenges(S.ChallengeCompletionCounts);
	for (const chal of profile.challenges) {
		chal.runHits = profile.runs.filter((r) =>
			r.challenges.some((c) => c === chal.name || c.includes(chal.key) || chal.name.includes(c))
		).length;
	}
	profile.coins = parseCoins(S.HiddenCoinsFoundMap);
	profile.cosmetics = asArr(S.CosmeticPAs).map((p) => pretty(p) ?? asStr(p));
	profile.lastBossVariant = (asArr(S.LastEncounteredBossVariantInArea) as [unknown, unknown][]).map(
		([k, v]) => ({
			area: prettyArea(asStr(asObj(k)?.TagName ?? k)),
			variant: asStr(v)
		})
	);
	profile.completedAreas = asArr(S.CompletedAreas).map((a) => prettyArea(asStr(a)));
	profile.seenAreas = asArr(S.SeenAreas).map((a) => prettyArea(asStr(a)));
	profile.bossVariants = asArr(S.BossVariantsKilled).map(asStr);
	profile.voidKills = asArr(S.VoidLobbyEnemiesKilled).map(asStr);
	profile.mutatorsFound = asArr(S.MutatorsFound).map((p) => classifyMutator(asStr(p)));

	const T = (f: keyof RunRecord) => profile.runs.reduce((a, r) => a + asNum(r[f]), 0);
	profile.tot = {
		kills: T('kills'),
		gold: T('gold'),
		deaths: T('deaths'),
		downed: T('downed'),
		dealt: T('dealt'),
		taken: T('taken'),
		hits: T('hits'),
		miss: T('miss'),
		weak: T('weak'),
		time: T('time')
	};
	profile.enemyTotals = aggregateEnemies(profile.runs);
	profile.srcTotals = aggregateSrc(profile.runs);

	const known = new Set([
		'NumDifficultyPoints',
		'UnlockedLoadoutOptions',
		'DiscoveredLoadoutOptions',
		'Loadouts',
		'EquippedLoadout',
		'CosmeticPAs',
		'ChallengeCompletionCounts',
		'SkillTreeNodesAssigned',
		'DifficultyTreeAssignedPointsNew',
		'HiddenCoinsFoundMap',
		'RunStats',
		'NumTimesOpenedLogbook',
		'CompletedAreas',
		'SeenAreas',
		'MutatorsFound',
		'LastEncounteredBossVariantInArea',
		'OtherPlayerStats',
		'BossVariantsKilled',
		'VoidLobbyEnemiesKilled',
		'SoulFragments',
		'SoulFragment',
		'NumSoulFragments',
		'Currency',
		'bHasSeenInitialTutorial',
		'bHasSeenPostGamePopup',
		'PlayerEmotes',
		'bTutorialDone',
		'bHasEverSpentDifficultyPoints'
	]);
	for (const [k, v] of Object.entries(S)) {
		if (!known.has(k)) profile.unknownKeys[k] = v;
	}

	computeCrossStats(profile);

	if (!profile.runs.length && !profile.collection.length) {
		profile.errors.push(
			'Parsed file but found no run history or collection. This may be GameSettings.sav or SAVE_GAME_SESSION_SLOT.sav.'
		);
	}
	if (profile.souls == null) {
		profile.warnings.push('Soul fragment count not found under known field names.');
	}

	return profile;
}
