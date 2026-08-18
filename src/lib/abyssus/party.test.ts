import { describe, expect, it } from 'vitest';
import { shapeGvas } from './gvas/shape';
import { partyCompareRows } from './stats';
import type { CoopPartner, RunRecord } from './types';

function mate(over: Partial<CoopPartner> & Pick<CoopPartner, 'player' | 'dealt'>): CoopPartner {
	return { taken: 0, kills: 0, deaths: 0, weapon: null, ability: null, ...over };
}

function run(partial: Partial<RunRecord> & Pick<RunRecord, 'dealt' | 'coop'>): RunRecord {
	return {
		index: 0,
		win: false,
		loop: 0,
		infinite: false,
		player: 'you',
		weapon: 'Engine Rifle',
		weaponRaw: '',
		modPrimary: null,
		modSecondary: null,
		ability: 'Turret',
		killedBy: 'Golemancer',
		taken: 100,
		kills: 10,
		gold: 0,
		keys: 0,
		deaths: 1,
		downed: 0,
		revives: 0,
		maxHP: 0,
		hits: 0,
		miss: 0,
		weak: 0,
		acc: null,
		weakPct: null,
		time: null,
		level: null,
		room: null,
		breakdown: [],
		mutators: [],
		charms: [],
		nodes: [],
		challenges: [],
		enemies: [],
		...partial
	};
}

describe('partyCompareRows', () => {
	it('returns empty when the dive was solo', () => {
		expect(partyCompareRows(run({ dealt: 100, coop: [] }))).toEqual([]);
	});

	it('puts you first and splits damage across the party', () => {
		const rows = partyCompareRows(
			run({
				dealt: 100,
				kills: 10,
				taken: 40,
				deaths: 1,
				coop: [
					{
						player: 'GhostRider',
						dealt: 300,
						taken: 80,
						kills: 20,
						deaths: 2,
						weapon: 'Brine Rifle',
						ability: 'Frag Grenade'
					}
				]
			})
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({ you: true, name: 'you', share: 25 });
		expect(rows[1]).toMatchObject({ you: false, name: 'GhostRider', share: 75, weapon: 'Brine Rifle' });
	});

	it('splits three-person damage and keeps zero-damage rows at 0%', () => {
		const three = partyCompareRows(
			run({
				dealt: 100,
				coop: [mate({ player: 'a', dealt: 100 }), mate({ player: 'b', dealt: 200 })]
			})
		);
		expect(three.map((r) => r.share)).toEqual([25, 25, 50]);
		const zero = partyCompareRows(run({ dealt: 0, coop: [mate({ player: 'a', dealt: 0 })] }));
		expect(zero).toHaveLength(2);
		expect(zero.every((r) => r.share === 0)).toBe(true);
	});

	it('does not throw when an old export stored coop as null', () => {
		expect(partyCompareRows(run({ dealt: 10, coop: null as unknown as [] }))).toEqual([]);
	});
});

describe('OtherPlayerStats pairing', () => {
	it('attaches partners by map key and drops non-integer keys', () => {
		const profile = shapeGvas(
			{
				engine: '5.6.1',
				saveClass: 'test',
				props: {
					SaveGameData: {
						RunStats: [{ PlayerName: 'me', DamageDealt: 10 }, { PlayerName: 'me', DamageDealt: 20 }],
						OtherPlayerStats: [
							[0, { RunStats: [{ PlayerName: 'A/', DamageDealt: 1, WeaponUsed: 'PA_BrineRifle' }] }],
							[
								1,
								{
									RunStats: [
										{ PlayerName: 'GhostRider', DamageDealt: 2, WeaponUsed: 'PA_Shotgun' },
										{ PlayerName: 'pal', DamageDealt: 3, WeaponUsed: 'PA_TeslaGun' }
									]
								}
							],
							['nope', { RunStats: [{ PlayerName: 'bad', DamageDealt: 99 }] }]
						]
					}
				}
			},
			't.sav'
		);
		expect(profile.runs[0]?.coop).toHaveLength(1);
		expect(profile.runs[0]?.coop[0]?.player).toBe('A');
		expect(profile.runs[1]?.coop.map((c) => c.player)).toEqual(['GhostRider', 'pal']);
		expect(profile.runs.some((r) => r.coop.some((c) => c.player === 'bad'))).toBe(false);
	});
});
