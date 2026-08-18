import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFileBuffer, parseFileText, parseGVAS } from './index';

const SAV = 'C:/Users/mrska/AppData/Local/Abyssus/Saved/SaveGames/Profile1.sav';
const MD = 'C:/Users/mrska/Downloads/abyssus_save_report_1.md';

describe('live Profile1.sav', () => {
	it.skipIf(!existsSync(SAV))('shapes the live save', () => {
		const bytes = readFileSync(SAV);
		const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
		const result = parseFileBuffer('Profile1.sav', copy);
		expect(result.ok).toBe(true);
		const p = result.profile!;
		expect(p.runs.length).toBeGreaterThanOrEqual(10);
		expect(p.loadouts.length).toBeGreaterThanOrEqual(6);
		expect(p.coins).toHaveLength(6);
		const lobby = p.coins.find((c) => c.key === 'Lobby');
		expect(lobby?.found.length).toBe(8);
		expect(lobby?.remaining).toBe(0);
		const sub = p.coins.find((c) => c.key === 'Submarine');
		expect(sub?.found).toContain(5);
		expect(sub?.found).toContain(14);
		expect(sub?.missing).toContain(15);
		expect(sub?.total).toBe(15);
		const yard = p.coins.find((c) => c.key === 'Boatyard');
		expect(yard?.total).toBe(15);
		expect(p.runs.some((r) => r.win)).toBe(true);
		expect(p.runs.filter((r) => r.killedBy == null).every((r) => r.win)).toBe(true);
		const parsed = parseGVAS(copy);
		const save = parsed.props.SaveGameData as Record<string, unknown>;
		expect(save.bTutorialDone).toBe(true);
		const rawRuns = save.RunStats as { RunSuccesful?: boolean; EnemyKilledBy?: string }[];
		expect(rawRuns.some((r) => r.RunSuccesful)).toBe(true);
		expect(p.cosmetics.length).toBeGreaterThan(0);
		expect(p.weaponStats.length).toBeGreaterThan(0);
		expect(p.comboStats.some((c) => c.kind === 'weapon-ability')).toBe(true);
		expect(p.srcTotals.some((s) => s.group === 'Blessing')).toBe(true);
		const kill = p.challenges.find((c) => c.key === 'KillChallenge');
		expect(kill?.state).not.toBe('untouched');
		expect(kill?.target).toBeNull();
		expect(p.runs[1]?.coop.length).toBe(2);
		expect(p.runs[0]?.coop.length).toBe(1);
		expect(new Set(p.runs[1]?.coop.map((c) => c.player)).size).toBe(2);
		expect(p.runs[1]?.coop.some((c) => c.player.includes('GhostRider'))).toBe(true);
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
