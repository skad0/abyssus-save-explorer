import { describe, expect, it } from 'vitest';
import { pairByKey } from './stats';

describe('pairByKey', () => {
	it('keeps you-only and them-only rows and fills matches', () => {
		const you = [
			{ weapon: 'Engine Rifle', runs: 4 },
			{ weapon: 'Shotgun', runs: 2 }
		];
		const them = [
			{ weapon: 'Shotgun', runs: 8 },
			{ weapon: 'Harpoon Gun', runs: 1 }
		];
		expect(pairByKey(you, them, (r) => r.weapon)).toEqual([
			{ key: 'Engine Rifle', you: you[0], them: null },
			{ key: 'Shotgun', you: you[1], them: them[0] },
			{ key: 'Harpoon Gun', you: null, them: them[1] }
		]);
	});

	it('returns empty when both sides are empty', () => {
		expect(pairByKey([], [], (r: { k: string }) => r.k)).toEqual([]);
	});
});
