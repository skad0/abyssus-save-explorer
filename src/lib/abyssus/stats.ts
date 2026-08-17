import type { AbyssusProfile, AbilityStats, WeaponStats } from './types';

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
