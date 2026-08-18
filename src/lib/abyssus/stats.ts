import { lookupAbility, lookupAspect, lookupWeapon, matchingSynergies } from './catalogs/knowledge';
import { displayPlayerName } from './pretty';
import type { AbyssusProfile, AbilityStats, ComboStats, RunRecord, WeaponStats } from './types';

export function leadGod(run: RunRecord): string | null {
	let best: { label: string; amount: number } | null = null;
	for (const s of run.breakdown) {
		if (s.group !== 'Blessing') continue;
		if (!best || s.amount > best.amount) best = { label: s.label, amount: s.amount };
	}
	return best?.label ?? null;
}

export function godsInRun(run: RunRecord): string[] {
	const set = new Set<string>();
	for (const s of run.breakdown) if (s.group === 'Blessing') set.add(s.label);
	for (const m of run.mutators) if (m.god) set.add(m.god);
	return [...set];
}

export function runDps(run: RunRecord): number | null {
	if (run.time == null || run.time <= 0) return null;
	return run.dealt / run.time;
}

export function runSurvival(run: RunRecord): number {
	return run.dealt / Math.max(1, run.taken);
}

export function computeCrossStats(profile: AbyssusProfile): void {
	const weaponMap = new Map<string, { runs: number; wins: number; dealt: number; acc: number[]; kills: number }>();
	const abilityMap = new Map<string, { runs: number; wins: number; dealt: number; kills: number }>();
	const blessingMap = new Map<string, { runs: Set<number>; damage: number }>();

	for (const run of profile.runs) {
		const w = run.weapon || '—';
		const wm = weaponMap.get(w) ?? { runs: 0, wins: 0, dealt: 0, acc: [], kills: 0 };
		wm.runs += 1;
		if (run.win) wm.wins += 1;
		wm.dealt += run.dealt;
		if (run.acc != null) wm.acc.push(run.acc);
		wm.kills += run.kills;
		weaponMap.set(w, wm);

		const a = run.ability ?? 'None';
		const am = abilityMap.get(a) ?? { runs: 0, wins: 0, dealt: 0, kills: 0 };
		am.runs += 1;
		if (run.win) am.wins += 1;
		am.dealt += run.dealt;
		am.kills += run.kills;
		abilityMap.set(a, am);

		const godsInRun = new Set<string>();
		for (const slice of run.breakdown) {
			if (slice.group === 'Blessing') {
				godsInRun.add(slice.label);
				const bm = blessingMap.get(slice.label) ?? { runs: new Set(), damage: 0 };
				bm.damage += slice.amount;
				bm.runs.add(run.index);
				blessingMap.set(slice.label, bm);
			}
		}
	}

	profile.weaponStats = [...weaponMap.entries()]
		.map(([weapon, s]): WeaponStats => ({
			weapon,
			runs: s.runs,
			wins: s.wins,
			winRate: s.runs ? (s.wins / s.runs) * 100 : 0,
			avgDealt: s.runs ? s.dealt / s.runs : 0,
			avgAcc: s.acc.length ? s.acc.reduce((a, b) => a + b, 0) / s.acc.length : null,
			totalKills: s.kills
		}))
		.sort((a, b) => b.runs - a.runs);

	profile.abilityStats = [...abilityMap.entries()]
		.map(([ability, s]): AbilityStats => ({
			ability,
			runs: s.runs,
			wins: s.wins,
			winRate: s.runs ? (s.wins / s.runs) * 100 : 0,
			avgDealt: s.runs ? s.dealt / s.runs : 0,
			totalKills: s.kills
		}))
		.sort((a, b) => b.runs - a.runs);

	profile.blessingFreq = [...blessingMap.entries()]
		.map(([god, s]) => ({ god, runs: s.runs.size, damage: s.damage }))
		.sort((a, b) => b.damage - a.damage);

	profile.comboStats = buildComboStats(profile);
}

type Bucket = {
	runs: number;
	wins: number;
	dealt: number;
	taken: number;
	kills: number;
	dps: number[];
};

function addBucket(map: Map<string, Bucket>, key: string, run: RunRecord) {
	const b = map.get(key) ?? { runs: 0, wins: 0, dealt: 0, taken: 0, kills: 0, dps: [] };
	b.runs += 1;
	if (run.win) b.wins += 1;
	b.dealt += run.dealt;
	b.taken += run.taken;
	b.kills += run.kills;
	const dps = runDps(run);
	if (dps != null) b.dps.push(dps);
	map.set(key, b);
}

function finishCombos(
	kind: ComboStats['kind'],
	map: Map<string, Bucket>,
	baseline: number,
	noteFn: (left: string, right: string) => string[]
): ComboStats[] {
	return [...map.entries()]
		.map(([key, s]): ComboStats => {
			const [left, right] = key.split('\t');
			const avgDealt = s.runs ? s.dealt / s.runs : 0;
			return {
				kind,
				left,
				right,
				runs: s.runs,
				wins: s.wins,
				winRate: s.runs ? (s.wins / s.runs) * 100 : 0,
				avgDealt,
				avgDps: s.dps.length ? s.dps.reduce((a, b) => a + b, 0) / s.dps.length : null,
				avgSurvival: s.taken > 0 ? s.dealt / s.taken : s.dealt,
				avgKills: s.runs ? s.kills / s.runs : 0,
				vsBaselineDealt: baseline > 0 ? avgDealt / baseline : 1,
				notes: noteFn(left, right)
			};
		})
		.sort((a, b) => b.avgDealt - a.avgDealt);
}

function buildComboStats(profile: AbyssusProfile): ComboStats[] {
	const wa = new Map<string, Bucket>();
	const wg = new Map<string, Bucket>();
	const ag = new Map<string, Bucket>();
	const baseline = profile.runs.length
		? profile.runs.reduce((a, r) => a + r.dealt, 0) / profile.runs.length
		: 0;

	for (const run of profile.runs) {
		const ability = run.ability ?? 'None';
		addBucket(wa, `${run.weapon}\t${ability}`, run);
		const god = leadGod(run) ?? '—';
		addBucket(wg, `${run.weapon}\t${god}`, run);
		addBucket(ag, `${ability}\t${god}`, run);
	}

	return [
		...finishCombos('weapon-ability', wa, baseline, (weapon, ability) =>
			matchingSynergies({ weapon, ability: ability === 'None' ? null : ability }).map((s) => s.title)
		),
		...finishCombos('weapon-aspect', wg, baseline, (weapon, god) => {
			const notes = matchingSynergies({
				weapon,
				gods: god === '—' ? [] : [god]
			}).map((s) => s.title);
			const aspect = lookupAspect(god === '—' ? null : god);
			if (aspect) notes.unshift(`${aspect.wikiName}: ${aspect.mechanic}`);
			return notes.slice(0, 3);
		}),
		...finishCombos('ability-aspect', ag, baseline, (ability, god) =>
			matchingSynergies({
				ability: ability === 'None' ? null : ability,
				gods: god === '—' ? [] : [god]
			}).map((s) => s.title)
		)
	];
}

export function runInsight(run: RunRecord, profile: AbyssusProfile) {
	const gods = godsInRun(run);
	const dps = runDps(run);
	const survival = runSurvival(run);
	const tot = run.breakdown.reduce((a, s) => a + s.amount, 0) || 1;
	const blessingAmt = run.breakdown.filter((s) => s.group === 'Blessing').reduce((a, s) => a + s.amount, 0);
	const abilityAmt = run.breakdown.filter((s) => s.label === 'Ability').reduce((a, s) => a + s.amount, 0);
	const weapon = lookupWeapon(run.weapon);
	const ability = lookupAbility(run.ability);
	const lead = leadGod(run);
	const synergies = matchingSynergies({ weapon: run.weapon, ability: run.ability, gods });
	const same = profile.comboStats.filter((c) => c.kind === 'weapon-ability');
	const mine = same.find((c) => c.left === run.weapon && c.right === (run.ability ?? 'None'));
	const byDealt = [...same].sort((a, b) => b.avgDealt - a.avgDealt);
	const rank =
		mine == null ? null : { of: byDealt.length, place: byDealt.findIndex((c) => c === mine) + 1 };

	const baselineDps = (() => {
		const vals = profile.runs.map(runDps).filter((x): x is number => x != null);
		if (!vals.length) return null;
		return vals.reduce((a, b) => a + b, 0) / vals.length;
	})();

	return {
		dps,
		survival,
		blessingPct: (blessingAmt / tot) * 100,
		abilityPct: (abilityAmt / tot) * 100,
		leadGod: lead,
		weapon,
		ability,
		aspects: gods.map((g) => lookupAspect(g)).filter((a) => a != null),
		synergies,
		comboRank: rank,
		dpsVsAvg: dps != null && baselineDps ? dps / baselineDps : null,
		harpoonCombo: weapon?.role === 'combo'
	};
}

export function damageMixPercent(profile: AbyssusProfile): { label: string; pct: number; color: string }[] {
	const total = profile.srcTotals.reduce((a, s) => a + s.amount, 0) || 1;
	const colors: Record<string, string> = {
		'Primary Fire': '#79cdbb',
		'Secondary Fire': '#4fa8c4',
		Ability: '#b48ad6',
		Melee: '#8fa98f',
		Fire: '#e4674b',
		Lightning: '#dfa63a',
		Blood: '#c4425f',
		Abyss: '#4e6fbf',
		Frost: '#7fc7e8',
		Wind: '#a9c9b4',
		Ocean: '#3e8fa8',
		Spirit: '#c9a6e0',
		Defender: '#8fb36b',
		Brine: '#5fb59a',
		Gold: '#e0c060',
		Fortune: '#e0c060'
	};
	return profile.srcTotals.map((s) => ({
		label: s.group === 'Blessing' ? `${s.label} (blessing)` : s.label,
		pct: (s.amount / total) * 100,
		color: colors[s.label] ?? '#6e93a0'
	}));
}

export function pairByKey<T>(
	you: T[],
	them: T[],
	keyOf: (row: T) => string
): { key: string; you: T | null; them: T | null }[] {
	const map = new Map<string, { you: T | null; them: T | null }>();
	for (const row of you) map.set(keyOf(row), { you: row, them: null });
	for (const row of them) {
		const k = keyOf(row);
		const cur = map.get(k);
		if (cur) cur.them = row;
		else map.set(k, { you: null, them: row });
	}
	return [...map.entries()].map(([key, v]) => ({ key, ...v }));
}

export function profileAcc(profile: AbyssusProfile): number | null {
	const den = profile.tot.hits + profile.tot.miss;
	return den > 0 ? (profile.tot.hits / den) * 100 : null;
}

export function biomeWinRates(profile: AbyssusProfile): { biome: string; wins: number; runs: number; rate: number }[] {
	const map = new Map<string, { wins: number; runs: number }>();
	for (const run of profile.runs) {
		const biome = run.loop >= 1 ? 'Loop 1+' : 'Loop 0';
		const m = map.get(biome) ?? { wins: 0, runs: 0 };
		m.runs += 1;
		if (run.win) m.wins += 1;
		map.set(biome, m);
	}
	return [...map.entries()].map(([biome, s]) => ({
		biome,
		wins: s.wins,
		runs: s.runs,
		rate: s.runs ? (s.wins / s.runs) * 100 : 0
	}));
}

export interface PartyRow {
	name: string;
	you: boolean;
	weapon: string;
	ability: string | null;
	dealt: number;
	taken: number;
	kills: number;
	deaths: number;
	share: number;
}

export function partyCompareRows(run: RunRecord): PartyRow[] {
	const mates = run.coop ?? [];
	if (!mates.length) return [];
	const people = [
		{
			name: displayPlayerName(run.player || 'You'),
			you: true,
			weapon: run.weapon,
			ability: run.ability,
			dealt: run.dealt,
			taken: run.taken,
			kills: run.kills,
			deaths: run.deaths
		},
		...mates.map((p) => ({
			name: displayPlayerName(p.player),
			you: false,
			weapon: p.weapon ?? '—',
			ability: p.ability,
			dealt: p.dealt,
			taken: p.taken,
			kills: p.kills,
			deaths: p.deaths
		}))
	];
	const total = people.reduce((s, p) => s + p.dealt, 0);
	return people.map((p) => ({
		...p,
		share: total > 0 ? (p.dealt / total) * 100 : 0
	}));
}
