import { describe, expect, it } from 'vitest';
import { isRunWin, runResultLabel } from './run-outcome';

describe('run outcome', () => {
	it('treats a successful flag or no killer as a completed run', () => {
		expect(isRunWin(false, null)).toBe(true);
		expect(isRunWin(true, 'Golemancer')).toBe(true);
		expect(isRunWin(false, 'Golemancer')).toBe(false);
		expect(isRunWin(0x10, null)).toBe(true);
	});

	it('labels survived runs separately from deaths', () => {
		expect(runResultLabel({ win: true, killedBy: null })).toBe('SURVIVED');
		expect(runResultLabel({ win: true, killedBy: 'Golemancer' })).toBe('WIN');
		expect(runResultLabel({ win: false, killedBy: 'Golemancer' })).toBe('LOSS');
	});
});
