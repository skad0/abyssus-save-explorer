/** Baked from wiki.gg + GameRant, 2026-08-18. Offline on purpose — the save never leaves the browser. */

export type WeaponRole = 'spray' | 'burst' | 'beam' | 'precision' | 'combo' | 'pellet' | 'other';
export type AbilityRole = 'aoe' | 'summon' | 'support' | 'single-target' | 'dot' | 'other';

export interface WeaponKnowledge {
	name: string;
	aliases: string[];
	role: WeaponRole;
	blurb: string;
	mechanic: string;
	source: string;
}

export interface AbilityKnowledge {
	name: string;
	aliases: string[];
	wikiName: string;
	role: AbilityRole;
	blurb: string;
	charges: string;
	source: string;
}

export interface AspectKnowledge {
	god: string;
	wikiName: string;
	mechanic: string;
	stackBonus: string;
	pairsWellWith: string[];
	source: string;
}

export interface CatalogSynergy {
	id: string;
	when: { weapons?: string[]; abilities?: string[]; gods?: string[] };
	title: string;
	why: string;
}

function k(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const WEAPON_KNOWLEDGE: WeaponKnowledge[] = [
	{
		name: 'Engine Rifle',
		aliases: ['PA_EngineRifle'],
		role: 'spray',
		blurb: 'Starter rapid-fire rifle. Low damage per shot, 100-round mag, mid-to-long range.',
		mechanic: 'All secondary modes build Heat instead of spending ammo; overheat locks secondary for ~5s.',
		source: 'wiki.gg/Engine_Rifle'
	},
	{
		name: 'Shotgun',
		aliases: ['PA_Shotgun'],
		role: 'pellet',
		blurb: 'Short-range pellet gun. High burst, 6-shell mag (12 on full-auto).',
		mechanic: 'Pellets fall off fast. Buckshot knocks you back; Unload ramps per shell.',
		source: 'wiki.gg/Shotgun'
	},
	{
		name: 'Tesla Rifle',
		aliases: ['Tesla Gun', 'PA_TeslaGun'],
		role: 'beam',
		blurb: 'Continuous electric beam, 100-unit mag, long range.',
		mechanic: 'Primary is a stream. Secondary charges orbs / storms — those count as AoE for Wind.',
		source: 'wiki.gg/Tesla_Gun'
	},
	{
		name: 'Brine Revolver',
		aliases: ['PA_BrineRevolver'],
		role: 'precision',
		blurb: 'Six-shooter with ADS secondary. High per-shot, weakspot-friendly.',
		mechanic: 'Scope modes trade speed for damage. Lightning can clear a room off a few shots.',
		source: 'wiki.gg/Brine_Revolver'
	},
	{
		name: 'Harpoon Gun',
		aliases: ['PA_HarpoonGun'],
		role: 'combo',
		blurb: 'Precision sticks that feed a dedicated combo-point meter (default cap 4).',
		mechanic: 'Primary generates combo points. Secondary spends them — damage and effects scale with the bank.',
		source: 'wiki.gg/Harpoon_Gun'
	},
	{
		name: 'Combat Bow',
		aliases: ['PA_CombatBow'],
		role: 'precision',
		blurb: 'Charge bow. Weakspot and multi-shot challenges sit on this weapon.',
		mechanic: 'Charge time vs weakspot value. Blessings that care about weakspots pair cleanly.',
		source: 'wiki.gg/Weapons'
	},
	{
		name: 'Boomerang Gun',
		aliases: ['PA_BoomerangGun'],
		role: 'other',
		blurb: 'Returning projectile gun. Present in this save; wiki list is still catching up.',
		mechanic: 'Projectiles come back — dwell time favors DoT / status aspects.',
		source: 'save paths'
	},
	{
		name: 'Brine Rifle',
		aliases: ['PA_BrineRifle'],
		role: 'precision',
		blurb: 'Scoped rifle (charged / rapid / steady). Sister to the Revolver, not on the short wiki list.',
		mechanic: 'Scope and burst mods. Same ADS family as Brine Revolver.',
		source: 'save paths'
	},
	{
		name: 'Disc Thrower',
		aliases: ['Disc Gun', 'PA_DiscThrower', 'PA_DiscGun'],
		role: 'other',
		blurb: 'Thrown disc weapon. Unlock / win-with challenges exist in the save.',
		mechanic: 'Multi-hit and lightning-kill challenges imply ricochet / linger.',
		source: 'wiki.gg/Weapons'
	},
	{
		name: 'Plasma Launcher',
		aliases: ['PA_PlasmaLauncher'],
		role: 'burst',
		blurb: 'Explosive launcher. Unlock challenge in the save.',
		mechanic: 'Explosion damage — Mr. Boom and Frag/Anchor-style explosion mods apply.',
		source: 'wiki.gg/Weapons'
	},
	{
		name: 'Fish Deity',
		aliases: ['PA_FishDeity'],
		role: 'other',
		blurb: 'Living armament. Several unique kill challenges in the logbook.',
		mechanic: 'Reload-kill and multi-hit challenges; treat as a special-case weapon.',
		source: 'wiki.gg/Weapons'
	}
];

export const ABILITY_KNOWLEDGE: AbilityKnowledge[] = [
	{
		name: 'Frag Grenade',
		aliases: ['PA_FragGrenade'],
		wikiName: 'Frag Grenade',
		role: 'aoe',
		blurb: 'Thrown sea-mine. Bounce, contact, or airburst. 200 / 400 weakspot, 3 charges. Counts as explosion (Mr. Boom).',
		charges: '3',
		source: 'wiki.gg/Frag_Grenade'
	},
	{
		name: 'Anchor',
		aliases: ['PA_Anchor'],
		wikiName: 'Anchor',
		role: 'aoe',
		blurb: 'Slam in front. 600 damage, 2 charges, explosion. Wide melee-range nuke.',
		charges: '2',
		source: 'wiki.gg/Anchor'
	},
	{
		name: 'Ancient Spear',
		aliases: ['Smiting Spear', 'PA_AncientSpear'],
		wikiName: 'Smiting Spear',
		role: 'dot',
		blurb: 'Throws a spear that sticks and pulses (200 + 8×50). Shoot it for extra pulses. Up to six out at once. Explosion-scaling.',
		charges: '1',
		source: 'wiki.gg/Smiting_Spear'
	},
	{
		name: 'Atlantean Cube',
		aliases: ['Ancient Core', 'PA_AtlanteanCube'],
		wikiName: 'Ancient Core',
		role: 'single-target',
		blurb: 'Cube fires a 1000 weakspot ray at one target, 2 charges. Boss execute.',
		charges: '2',
		source: 'wiki.gg/Ancient_Core'
	},
	{
		name: 'Drop Shield',
		aliases: ['Brine Field', 'PA_DropShield'],
		wikiName: 'Brine Field',
		role: 'support',
		blurb: 'Placed brine container: 200/tick, 50% damage reduction in the field (non-stacking), 1 charge. Only dedicated support ability.',
		charges: '1',
		source: 'wiki.gg/Brine_Field'
	},
	{
		name: 'Turret',
		aliases: ['PA_Turret'],
		wikiName: 'Turret',
		role: 'summon',
		blurb: 'Deployed auto-turret, 50/shot, 1 charge, expires. Buddy System / Persistent change uptime. Counts as an ally for Ocean.',
		charges: '1',
		source: 'wiki.gg/Turret'
	},
	{
		name: 'Healing Flask',
		aliases: ['PA_HealingFlask'],
		wikiName: 'Healing Flask',
		role: 'support',
		blurb: 'Heal flask in this save. Not on the current wiki ability list (Syringe is the world heal). Treat as sustain, not damage.',
		charges: '?',
		source: 'save paths'
	}
];

export const ASPECT_KNOWLEDGE: AspectKnowledge[] = [
	{
		god: 'Fire',
		wikiName: 'Flares',
		mechanic: 'Burn, then Flare bursts when a burning enemy takes any damage. Boss DPS first; stacking makes it a room-clearer.',
		stackBonus: 'Status effect strength.',
		pairsWellWith: ['Abyss', 'Shotgun', 'Engine Rifle'],
		source: 'GameRant Aspects guide / wiki Blessings (Flares)'
	},
	{
		god: 'Lightning',
		wikiName: 'Chain Lightning',
		mechanic: 'Hits arc chain lightning. Room-clear on high-impact shots (Revolver). Every lightning blessing also raises crit chance.',
		stackBonus: 'Critical hit chance.',
		pairsWellWith: ['Brine Revolver', 'Disc Thrower'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Wind',
		wikiName: 'Windburst',
		mechanic: 'Chance to Windburst (AoE explosion, shorter range than lightning, higher damage). Wind blessings enlarge all your AoE.',
		stackBonus: 'AoE size — grenade, Tesla orbs, Windburst itself.',
		pairsWellWith: ['Frag Grenade', 'Tesla Rifle', 'Anchor'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Fortune',
		wikiName: 'Goldburst',
		mechanic: 'Goldburst damage scales with gold carried. High fire-rate and turrets proc it constantly.',
		stackBonus: 'Gold found during the run.',
		pairsWellWith: ['Engine Rifle', 'Tesla Rifle', 'Turret', 'Ocean'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Frost',
		wikiName: 'Frozen',
		mechanic: 'Build a freeze meter; freeze stuns and deals % max HP. Excellent on a turret that sits on a target.',
		stackBonus: 'Damage to elites and bosses.',
		pairsWellWith: ['Turret', 'Ancient Spear'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Blood',
		wikiName: 'Blood',
		mechanic: 'Hemorrhage scales with your max HP. Tankier = more damage.',
		stackBonus: 'Maximum health.',
		pairsWellWith: ['Defender', 'Drop Shield', 'Shotgun'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Defender',
		wikiName: 'Barrier',
		mechanic: 'Dealing damage fills Barrier; full bar grants a shield. Retaliating Barrier reflects huge damage.',
		stackBonus: 'Damage reduction.',
		pairsWellWith: ['Blood', 'Drop Shield'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Spirit',
		wikiName: 'Spirit',
		mechanic: 'Spirit gauge fills on damage, then a spirit volley. High downtime, high payoff if you fill fast.',
		stackBonus: 'Damage vs targets below half HP.',
		pairsWellWith: ['Engine Rifle', 'Tesla Rifle'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Abyss',
		wikiName: 'Shadows / Night',
		mechanic: 'Shadows mark: +20% damage taken from all sources. Best utility aspect after Barrier. Synergizes with Fire.',
		stackBonus: 'Duration of all status effects.',
		pairsWellWith: ['Fire', 'Turret', 'Brine Revolver', 'Shotgun'],
		source: 'GameRant Aspects guide (Night)'
	},
	{
		god: 'Ocean',
		wikiName: 'Tentacles',
		mechanic: 'Hits spawn tentacles that throw independently. Blessings scale with nearby allies — tentacles and turrets count.',
		stackBonus: 'Damage per nearby ally.',
		pairsWellWith: ['Turret', 'Fortune'],
		source: 'GameRant Aspects guide'
	},
	{
		god: 'Brine',
		wikiName: 'Brine',
		mechanic: 'Eleventh aspect in the wiki logbook. Save tracks DamageSource.God.Brine separately from Ocean.',
		stackBonus: 'Unknown — wiki table is still empty.',
		pairsWellWith: ['Drop Shield'],
		source: 'wiki.gg/Blessings'
	}
];

export const CATALOG_SYNERGIES: CatalogSynergy[] = [
	{
		id: 'lightning-revolver',
		when: { weapons: ['Brine Revolver', 'Brine Rifle'], gods: ['Lightning'] },
		title: 'Lightning on a heavy shot',
		why: 'Chain lightning wants few, fat hits. Revolver / scoped brine clears rooms off a couple of shots.'
	},
	{
		id: 'wind-grenade',
		when: { abilities: ['Frag Grenade', 'Anchor'], gods: ['Wind'] },
		title: 'Wind enlarges explosions',
		why: 'Wind blessings grow all AoE. Frag and Anchor are explosion abilities — the radius buff is the point.'
	},
	{
		id: 'wind-tesla',
		when: { weapons: ['Tesla Rifle'], gods: ['Wind'] },
		title: 'Wind on Tesla orbs',
		why: 'Tesla secondary storms/orbs are AoE; Wind is the documented pairing.'
	},
	{
		id: 'fortune-spray',
		when: { weapons: ['Engine Rifle', 'Tesla Rifle'], gods: ['Fortune'] },
		title: 'Goldburst on a spray gun',
		why: 'Goldburst procs per hit and scales with gold. High RoF weapons farm it.'
	},
	{
		id: 'fortune-turret',
		when: { abilities: ['Turret'], gods: ['Fortune', 'Ocean'] },
		title: 'Turret + Gold / Tentacles',
		why: 'Turret ticks Goldburst constantly. Ocean counts turrets as allies for tentacle damage.'
	},
	{
		id: 'frost-turret',
		when: { abilities: ['Turret', 'Ancient Spear'], gods: ['Frost'] },
		title: 'Frost on a parked damage source',
		why: 'Freeze meter wants uptime on one target. Turret and stuck spears sit still and freeze.'
	},
	{
		id: 'blood-barrier',
		when: { gods: ['Blood', 'Defender'] },
		title: 'Blood + Barrier',
		why: 'Hemorrhage scales with max HP; Barrier and Blood stacks both push the tank curve.'
	},
	{
		id: 'night-fire',
		when: { gods: ['Abyss', 'Fire'] },
		title: 'Shadows + Fire',
		why: 'Night lengthens statuses; Fire is a status. Shadows also amp all damage by 20%.'
	},
	{
		id: 'night-burst',
		when: { weapons: ['Shotgun', 'Brine Revolver'], gods: ['Abyss'] },
		title: 'Shadows on burst weapons',
		why: 'Marked enemies take 20% more from everything — shotgun and revolver want that multiplier on each pellet/shot.'
	},
	{
		id: 'harpoon-combo',
		when: { weapons: ['Harpoon Gun'] },
		title: 'Harpoon combo bank',
		why: 'This gun has its own combo-point system. Efficiency is “did secondary spend a full bank,” not just raw DPS.'
	}
];

const WEAPON_INDEX = new Map<string, WeaponKnowledge>();
for (const w of WEAPON_KNOWLEDGE) {
	WEAPON_INDEX.set(k(w.name), w);
	for (const a of w.aliases) WEAPON_INDEX.set(k(a), w);
}

const ABILITY_INDEX = new Map<string, AbilityKnowledge>();
for (const a of ABILITY_KNOWLEDGE) {
	ABILITY_INDEX.set(k(a.name), a);
	ABILITY_INDEX.set(k(a.wikiName), a);
	for (const al of a.aliases) ABILITY_INDEX.set(k(al), a);
}

const ASPECT_INDEX = new Map<string, AspectKnowledge>();
for (const a of ASPECT_KNOWLEDGE) {
	ASPECT_INDEX.set(k(a.god), a);
	ASPECT_INDEX.set(k(a.wikiName), a);
}
ASPECT_INDEX.set('gold', ASPECT_KNOWLEDGE.find((a) => a.god === 'Fortune')!);
ASPECT_INDEX.set('night', ASPECT_KNOWLEDGE.find((a) => a.god === 'Abyss')!);
ASPECT_INDEX.set('shadows', ASPECT_KNOWLEDGE.find((a) => a.god === 'Abyss')!);
ASPECT_INDEX.set('defense', ASPECT_KNOWLEDGE.find((a) => a.god === 'Defender')!);
ASPECT_INDEX.set('barrier', ASPECT_KNOWLEDGE.find((a) => a.god === 'Defender')!);

export function lookupWeapon(name: string | null | undefined): WeaponKnowledge | null {
	if (!name) return null;
	return WEAPON_INDEX.get(k(name)) ?? null;
}

export function lookupAbility(name: string | null | undefined): AbilityKnowledge | null {
	if (!name || name === 'None') return null;
	return ABILITY_INDEX.get(k(name)) ?? null;
}

export function lookupAspect(god: string | null | undefined): AspectKnowledge | null {
	if (!god) return null;
	return ASPECT_INDEX.get(k(god)) ?? null;
}

function hitList(name: string, list: string[]): boolean {
	const kn = k(name);
	return list.some((x) => k(x) === kn || lookupWeapon(name)?.name === x || lookupAbility(name)?.name === x);
}

export function matchingSynergies(opts: {
	weapon?: string | null;
	ability?: string | null;
	gods?: string[];
}): CatalogSynergy[] {
	const gods = new Set((opts.gods ?? []).map(k));
	return CATALOG_SYNERGIES.filter((s) => {
		const w = s.when.weapons;
		const a = s.when.abilities;
		const g = s.when.gods;
		if (w?.length && !(opts.weapon && hitList(opts.weapon, w))) return false;
		if (a?.length && !(opts.ability && hitList(opts.ability, a))) return false;
		if (g?.length && !g.some((x) => gods.has(k(x)))) return false;
		return true;
	});
}
