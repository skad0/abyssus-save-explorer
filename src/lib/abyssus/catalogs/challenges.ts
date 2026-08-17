import type { ChallengeEntry } from '../types';

export interface ChallengeTarget {
	target: number | null;
	family: string;
}

/**
 * Targets only when the save or wiki makes them binary / known.
 * Do not use a sample profile's current counters as targets.
 */
const TARGETS: Record<string, ChallengeTarget> = {
	CompleteInfiniteMode: { target: 1, family: 'Modes' },
	CompleteBothModes: { target: 1, family: 'Modes' },
	CompleteRandomOrderMode: { target: 1, family: 'Modes' },
	FirstDeathChallenge: { target: 1, family: 'Meta' },
	LightTheBrazierChallenge: { target: 1, family: 'World' },
	WishingWellChallenge: { target: 1, family: 'World' },
	BoatyardBossChallenge: { target: 1, family: 'Biome boss' },
	GardensBossChallenge: { target: 1, family: 'Biome boss' },
	SanctuaryBossChallenge: { target: 1, family: 'Biome boss' },
	SubmarineBossChallenge: { target: 1, family: 'Biome boss' },
	VoidBossChallenge: { target: 1, family: 'Biome boss' },
	BossVariantsChallenge: { target: null, family: 'Biome boss' },
	WinOnDifficulty1: { target: 1, family: 'Difficulty win' },
	WinOnDifficulty5: { target: 1, family: 'Difficulty win' },
	WinOnDifficulty10: { target: 1, family: 'Difficulty win' },
	WinOnDifficulty20: { target: 1, family: 'Difficulty win' }
};

export function challengeMeta(key: string): ChallengeTarget {
	if (TARGETS[key]) return TARGETS[key];
	if (/^CoinChallenge_/.test(key) && /_\d+$/.test(key)) return { target: 1, family: 'Surge fissures' };
	if (/^CoinChallenge_/.test(key)) return { target: 1, family: 'Surge fissures' };
	if (key.includes('BossChallenge') || key === 'BossVariantsChallenge') return { target: 1, family: 'Biome boss' };
	if (/Mastery$/.test(key) || key === 'WeaponMastery') return { target: 1, family: 'Mastery' };
	if (key.startsWith('WinWith') || key.startsWith('WinWithout') || key.startsWith('WinFast')) {
		return { target: 1, family: 'Win conditions' };
	}
	if (key.startsWith('UnlockAll') || key.startsWith('FindAll')) return { target: null, family: 'Collection' };
	if (key.startsWith('Unlock')) return { target: 1, family: 'Unlocks' };
	if (key.startsWith('Complete') || key.startsWith('Fill')) return { target: null, family: 'Meta' };
	if (/Damage|Armor|Knockback|Overheat|Overkill|Explosion|DoT|Lightning/.test(key)) {
		return { target: null, family: 'Combat' };
	}
	if (/Kill|Weakspot|Bow|Disc|Scope|Shotgun|Seeker|Multi|Hit|Elite|Distance/.test(key)) {
		return { target: null, family: 'Combat' };
	}
	if (/Gold|Keys|Health|Break|Brazier|Well/.test(key)) return { target: null, family: 'World' };
	return { target: null, family: 'Other' };
}

export function challengeState(key: string, count: number, target: number | null): ChallengeEntry['state'] {
	if (count <= 0) return 'untouched';
	if (target != null) return count >= target ? 'likely-complete' : 'in-progress';
	const meta = challengeMeta(key);
	if (meta.target === 1) return count >= 1 ? 'likely-complete' : 'untouched';
	return 'in-progress';
}

export function buildChallenge(key: string, count: number, name: string): ChallengeEntry {
	const meta = challengeMeta(key);
	const target = meta.target;
	const remaining = target != null ? Math.max(0, target - count) : null;
	const pct = target != null && target > 0 ? Math.min(100, (count / target) * 100) : null;
	return {
		key,
		name,
		count,
		family: meta.family,
		target,
		remaining,
		pct,
		state: challengeState(key, count, target),
		runHits: 0
	};
}
