import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFileBuffer, parseFileText } from './index';

const SAV = 'C:/Users/mrska/AppData/Local/Abyssus/Saved/SaveGames/Profile1.sav';
const MD = 'C:/Users/mrska/Downloads/abyssus_save_report_1.md';

describe('live Profile1.sav', () => {
	it.skipIf(!existsSync(SAV))('shapes the live save', () => {
		const bytes = readFileSync(SAV);
		const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
		const result = parseFileBuffer('Profile1.sav', copy);
		expect(result.ok).toBe(true);
		const p = result.profile!;
		expect(p.runs.length).toBe(10);
		expect(p.loadouts.length).toBe(6);
		expect(p.coins).toHaveLength(6);
		const lobby = p.coins.find((c) => c.key === 'Lobby');
		expect(lobby?.found.length).toBe(8);
		expect(lobby?.remaining).toBe(0);
		const sub = p.coins.find((c) => c.key === 'Submarine');
		expect(sub?.found).toEqual([5, 14]);
		expect(sub?.missing).toContain(15);
		expect(sub?.total).toBe(15);
		const yard = p.coins.find((c) => c.key === 'Boatyard');
		expect(yard?.found.length).toBe(0);
		expect(yard?.total).toBe(15);
		expect(p.cosmetics.length).toBeGreaterThan(0);
		expect(p.weaponStats.length).toBeGreaterThan(0);
		expect(p.srcTotals.some((s) => s.group === 'Blessing')).toBe(true);
		const kill = p.challenges.find((c) => c.key === 'KillChallenge');
		expect(kill?.state).not.toBe('untouched');
		expect(kill?.target).toBeNull();
	});
});

describe('markdown report', () => {
	it.skipIf(!existsSync(MD))('shapes the thin report', () => {
		const text = readFileSync(MD, 'utf8');
		const result = parseFileText('abyssus_save_report_1.md', text);
		expect(result.ok).toBe(true);
		const p = result.profile!;
		expect(p.runs.length).toBe(10);
		expect(p.souls).toBe(31);
		expect(p.coins.find((c) => c.key === 'Lobby')?.found.length).toBe(8);
		expect(p.warnings.some((w) => w.includes('Profile1.sav'))).toBe(true);
	});
});
