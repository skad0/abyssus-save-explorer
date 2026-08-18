export type ParseSource = 'gvas' | 'markdown' | 'json';

export type SectionId =
	| 'meta'
	| 'profile-summary'
	| 'lifetime-totals'
	| 'per-run-breakdown'
	| 'enemy-kills'
	| 'challenge-progress'
	| 'hidden-coins'
	| 'loadouts'
	| 'collection'
	| 'skill-tree'
	| 'damage-breakdown'
	| 'mutators-blessings';

export interface ParseSection {
	id: SectionId | string;
	title: string;
	raw: string;
	parsed: unknown;
	warnings: string[];
}

export interface DamageSlice {
	tag: string;
	group: 'Direct' | 'Blessing' | 'Other';
	label: string;
	amount: number;
}

export interface MutatorEntry {
	raw: string;
	name: string;
	rank: number;
	category:
		| 'ability'
		| 'god-passive'
		| 'major-blessing'
		| 'minor-blessing'
		| 'numbered-passive'
		| 'behavior'
		| 'skill-tree'
		| 'charm'
		| 'suit'
		| 'weapon-mod'
		| 'cosmetic'
		| 'other';
	god?: string;
	behaviorSlot?: 'primary' | 'secondary' | 'ability';
}

export interface RunRecord {
	index: number;
	win: boolean;
	loop: number;
	infinite: boolean;
	player: string;
	weapon: string;
	weaponRaw: string;
	modPrimary: string | null;
	modSecondary: string | null;
	ability: string | null;
	killedBy: string | null;
	dealt: number;
	taken: number;
	kills: number;
	gold: number;
	keys: number;
	deaths: number;
	downed: number;
	revives: number;
	maxHP: number;
	hits: number;
	miss: number;
	weak: number;
	acc: number | null;
	weakPct: number | null;
	time: number | null;
	level: number | null;
	room: number | null;
	breakdown: DamageSlice[];
	mutators: MutatorEntry[];
	charms: string[];
	nodes: string[];
	challenges: string[];
	enemies: { name: string; count: number; faction: string; role: string }[];
	coop: CoopPartner[];
}

export interface CoopPartner {
	player: string;
	dealt: number;
	taken: number;
	kills: number;
	deaths: number;
	weapon: string | null;
	ability: string | null;
}

export interface LoadoutPreset {
	slot: number;
	name: string;
	weapon: string | null;
	ability: string | null;
	primaryMod: string | null;
	secondaryMod: string | null;
	attachment0: string | null;
	attachment1: string | null;
	suit: string | null;
	cosmetic: string | null;
	equipped: boolean;
}

export interface CoinBiome {
	key: string;
	label: string;
	wardrobe: string;
	total: number;
	found: number[];
	missing: number[];
	remaining: number;
}

export interface ChallengeEntry {
	key: string;
	name: string;
	count: number;
	family: string;
	target: number | null;
	remaining: number | null;
	pct: number | null;
	state: 'untouched' | 'in-progress' | 'likely-complete';
	runHits: number;
}

export interface CollectionItem {
	path: string;
	name: string;
	category: string;
	state: 'unlocked' | 'discovered' | 'unknown';
}

export interface WeaponStats {
	weapon: string;
	runs: number;
	wins: number;
	winRate: number;
	avgDealt: number;
	avgAcc: number | null;
	totalKills: number;
}

export interface AbilityStats {
	ability: string;
	runs: number;
	wins: number;
	winRate: number;
	avgDealt: number;
	totalKills: number;
}

export interface ComboStats {
	kind: 'weapon-ability' | 'weapon-aspect' | 'ability-aspect';
	left: string;
	right: string;
	runs: number;
	wins: number;
	winRate: number;
	avgDealt: number;
	avgDps: number | null;
	avgSurvival: number;
	avgKills: number;
	vsBaselineDealt: number;
	notes: string[];
}

export interface AbyssusProfile {
	source: ParseSource;
	fileName: string;
	engine: string | null;
	saveClass: string | null;
	slot: string;
	saved: Date | null;
	build: number | null;
	souls: number | null;
	diffPoints: number;
	logbook: number;
	runs: RunRecord[];
	loadouts: LoadoutPreset[];
	collection: CollectionItem[];
	skills: string[];
	difficulty: { name: string; pts: number }[];
	challenges: ChallengeEntry[];
	coins: CoinBiome[];
	cosmetics: string[];
	lastBossVariant: { area: string; variant: string }[];
	completedAreas: string[];
	seenAreas: string[];
	bossVariants: string[];
	voidKills: string[];
	mutatorsFound: MutatorEntry[];
	enemyTotals: Record<string, { kills: number; runs: number; best: number; faction: string; role: string }>;
	srcTotals: DamageSlice[];
	tot: {
		kills: number;
		gold: number;
		deaths: number;
		downed: number;
		dealt: number;
		taken: number;
		hits: number;
		miss: number;
		weak: number;
		time: number;
	};
	weaponStats: WeaponStats[];
	abilityStats: AbilityStats[];
	blessingFreq: { god: string; runs: number; damage: number }[];
	comboStats: ComboStats[];
	sections: ParseSection[];
	unknownKeys: Record<string, unknown>;
	warnings: string[];
	errors: string[];
}

export interface ParseResult {
	ok: boolean;
	profile: AbyssusProfile | null;
	error?: string;
}

export function emptyProfile(fileName: string, source: ParseSource): AbyssusProfile {
	return {
		source,
		fileName,
		engine: null,
		saveClass: null,
		slot: '',
		saved: null,
		build: null,
		souls: null,
		diffPoints: 0,
		logbook: 0,
		runs: [],
		loadouts: [],
		collection: [],
		skills: [],
		difficulty: [],
		challenges: [],
		coins: [],
		cosmetics: [],
		lastBossVariant: [],
		completedAreas: [],
		seenAreas: [],
		bossVariants: [],
		voidKills: [],
		mutatorsFound: [],
		enemyTotals: {},
		srcTotals: [],
		tot: {
			kills: 0,
			gold: 0,
			deaths: 0,
			downed: 0,
			dealt: 0,
			taken: 0,
			hits: 0,
			miss: 0,
			weak: 0,
			time: 0
		},
		weaponStats: [],
		abilityStats: [],
		blessingFreq: [],
		comboStats: [],
		sections: [],
		unknownKeys: {},
		warnings: [],
		errors: []
	};
}
