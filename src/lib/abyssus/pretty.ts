import type { DamageSlice, MutatorEntry } from './types';

const NAME_FIX: Record<string, string> = {
	GeneralKrisu: "General Kri'su",
	'General Krisu': "General Kri'su",
	Golemancer: 'The Golemancer',
	EliteGardenEnemy: 'Elite Overseer',
	HighpriestUnglu: "Highpriest Un'glu",
	PA_EngineRifle: 'Engine Rifle',
	PA_Shotgun: 'Shotgun',
	PA_HarpoonGun: 'Harpoon Gun',
	PA_BoomerangGun: 'Boomerang Gun',
	PA_TeslaGun: 'Tesla Rifle',
	PA_BrineRifle: 'Brine Rifle',
	PA_CombatBow: 'Combat Bow',
	PA_BrineRevolver: 'Brine Revolver',
	PA_DiscThrower: 'Disc Thrower',
	PA_DiscGun: 'Disc Thrower',
	PA_FishDeity: 'Fish Deity',
	PA_PlasmaLauncher: 'Plasma Launcher',
	TeslaRifle: 'Tesla Rifle',
	TeslaGun: 'Tesla Rifle',
	DiscGun: 'Disc Thrower'
};

export function pretty(path: unknown): string | null {
	if (!path || typeof path !== 'string') return null;
	const raw = path.trim();
	if (!raw || raw === 'None') return null;
	if (NAME_FIX[raw]) return NAME_FIX[raw];
	const leaf = raw.split('/').pop()?.split('.')[0] ?? raw;
	if (NAME_FIX[leaf]) return NAME_FIX[leaf];
	let s = leaf
		.replace(/_C$/, '')
		.replace(/^(PA_|BP_)/, '')
		.replace(/_CharacterMutator\d*$/, '')
		.replace(/_Cosmetic$/, '')
		.replace(/_Mutator$/, '')
		.replace(/_Behavior$/, '')
		.replace(/_WeaponMutator$/, '')
		.replace(/_ProjectileMutator$/, '');
	if (NAME_FIX[s] || NAME_FIX[`PA_${s}`]) return NAME_FIX[s] ?? NAME_FIX[`PA_${s}`];
	s = s.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
	return NAME_FIX[s] ?? (s || null);
}

export function displayPlayerName(name: string): string {
	const m = /^[^$\s]*\$([^$]+)\$/.exec(name);
	return m?.[1] || name;
}

export function categoryOf(path: string): string {
	if (!path) return 'Other';
	if (path.includes('/Weapons/')) return 'Weapon';
	if (path.includes('/WeaponMods/')) return 'Weapon mod';
	if (path.includes('/Cosmetics/')) return 'Cosmetic';
	return mutatorLabel(classifyMutator(path).category);
}

export function damageSource(tag: string): Omit<DamageSlice, 'amount' | 'tag'> {
	const t = String(tag || '').replace(/^DamageSource\./, '');
	if (t.startsWith('God.')) {
		const god = t.slice(4) === 'Gold' ? 'Fortune' : t.slice(4);
		return { group: 'Blessing', label: god };
	}
	return {
		group: 'Direct',
		label: t.replace(/([a-z])([A-Z])/g, '$1 $2')
	};
}

const GODS = [
	'Fortune',
	'Lightning',
	'Defender',
	'Abyss',
	'Blood',
	'Brine',
	'Frost',
	'Ocean',
	'Spirit',
	'Wind',
	'Fire',
	'Gold'
] as const;

export function classifyMutator(raw: string, rank = 1): MutatorEntry {
	const name = pretty(raw) ?? raw;
	const lower = raw.toLowerCase();
	let category: MutatorEntry['category'] = 'other';
	let god: string | undefined;
	let behaviorSlot: MutatorEntry['behaviorSlot'];

	for (const g of GODS) {
		if (lower.includes(g.toLowerCase())) {
			god = g === 'Gold' ? 'Fortune' : g;
			break;
		}
	}

	if (raw.includes('CharmMutators')) category = 'charm';
	else if (lower.includes('skilltree')) category = 'skill-tree';
	else if (lower.includes('suitmutator') || lower.includes('basesuit')) category = 'suit';
	else if (raw.includes('/WeaponMods/')) category = 'weapon-mod';
	else if (raw.includes('/Cosmetics/')) category = 'cosmetic';
	else if (lower.includes('_behavior_') || raw.includes('CharacterBehaviorMutators')) {
		category = 'behavior';
		if (lower.includes('primaryfire')) behaviorSlot = 'primary';
		else if (lower.includes('secondaryfire')) behaviorSlot = 'secondary';
		else if (lower.includes('ability')) behaviorSlot = 'ability';
	} else if (lower.includes('majorblessing')) category = 'major-blessing';
	else if (lower.includes('minorblessing')) category = 'minor-blessing';
	else if (lower.includes('godpassive')) category = 'god-passive';
	else if (/passive\d/i.test(raw) || raw.includes('TempRework')) category = 'numbered-passive';
	else if (
		/AnchorAbility|AncientSpear|AtlanteanCubeAbility|DropShieldAbility|FragGrenadeAbility|HealingFlask|TurretAbility/.test(
			raw
		)
	) {
		category = 'ability';
	}

	return { raw, name, rank, category, god, behaviorSlot };
}

export function prettyArea(tag: string): string {
	const s = String(tag).replace(/^Area\./, '');
	switch (s) {
		case 'Boatyard':
			return 'Abandoned Temple';
		case 'Void':
			return 'Royal Abyss';
		default:
			return pretty(s) ?? s;
	}
}

export function fmtNum(n: number | null | undefined): string {
	if (n == null || Number.isNaN(n)) return '—';
	return Number(n).toLocaleString();
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
	if (n == null || Number.isNaN(n)) return '—';
	return `${n.toFixed(digits)}%`;
}

export function fmtDur(sec: number | null | undefined): string {
	if (sec == null) return '—';
	const s = Math.round(sec);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const ss = s % 60;
	if (h > 0) return `${h}h ${m}m ${ss}s`;
	return `${m}m ${ss}s`;
}

export function ticksToDate(t: unknown): Date | null {
	if (t == null) return null;
	try {
		const ms = Number(BigInt(String(t)) / 10000n) - 62135596800000;
		const d = new Date(ms);
		return Number.isNaN(d.getTime()) ? null : d;
	} catch {
		return null;
	}
}

export function mutatorLabel(category: MutatorEntry['category']): string {
	switch (category) {
		case 'ability':
			return 'Ability';
		case 'god-passive':
			return 'Aspect';
		case 'major-blessing':
			return 'Major blessing';
		case 'minor-blessing':
			return 'Minor blessing';
		case 'numbered-passive':
			return 'Blessing';
		case 'behavior':
			return 'Aspect on slot';
		case 'skill-tree':
			return 'Skill tree';
		case 'charm':
			return 'Charm';
		case 'suit':
			return 'Suit';
		case 'weapon-mod':
			return 'Weapon mod';
		case 'cosmetic':
			return 'Cosmetic';
		case 'other':
			return 'Other';
		default: {
			const _n: never = category;
			return _n;
		}
	}
}
