import { describe, expect, it } from 'vitest';
import { challengeState } from './catalogs/challenges';
import { classifyEnemy, prettyEnemy } from './catalogs/enemies';
import { COIN_CATALOG } from './catalogs/coins';
import { classifyMutator, damageSource, pretty, prettyArea } from './pretty';

describe('pretty', () => {
	it('names weapons', () => {
		expect(pretty('/Game/PrimaryAssets/Weapons/PA_EngineRifle.PA_EngineRifle')).toBe('Engine Rifle');
		expect(pretty('PA_TeslaGun')).toBe('Tesla Rifle');
	});

	it('maps areas', () => {
		expect(prettyArea('Area.Boatyard')).toBe('Abandoned Temple');
		expect(prettyArea('Area.Void')).toBe('Royal Abyss');
	});

	it('splits god damage', () => {
		expect(damageSource('DamageSource.God.Gold')).toEqual({ group: 'Blessing', label: 'Fortune' });
		expect(damageSource('DamageSource.PrimaryFire')).toEqual({ group: 'Direct', label: 'Primary Fire' });
	});

	it('classifies blessings vs abilities', () => {
		expect(
			classifyMutator(
				'/Game/PrimaryAssets/CharacterMutators/TempRework/Blood/PA_BloodMajorBlessing_CharacterMutator'
			).category
		).toBe('major-blessing');
		expect(
			classifyMutator(
				'/Game/PrimaryAssets/CharacterMutators/TurretAbility/PA_Turret_CharacterMutator'
			).category
		).toBe('ability');
	});
});

describe('catalogs', () => {
	it('lists every fissure biome with wiki totals', () => {
		expect(COIN_CATALOG.map((c) => [c.key, c.total])).toEqual([
			['Lobby', 8],
			['Boatyard', 15],
			['Submarine', 15],
			['Gardens', 15],
			['Sanctuary', 15],
			['Void', 6]
		]);
	});

	it('does not treat KillChallenge 913 as unfinished for lack of a target', () => {
		expect(challengeState('KillChallenge', 913, null)).toBe('in-progress');
		expect(challengeState('WinWithShotgunChallenge', 1, 1)).toBe('likely-complete');
		expect(challengeState('UnlockTeslaGunChallenge', 0, 1)).toBe('untouched');
	});

	it('factions bosses and golems', () => {
		expect(prettyEnemy('Golemancer')).toBe('The Golemancer');
		expect(classifyEnemy('Golemancer').faction).toBe('Boss');
		expect(classifyEnemy('Golem Sentry').faction).toBe('Golem');
	});
});
