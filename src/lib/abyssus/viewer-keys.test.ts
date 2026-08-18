import { describe, expect, it } from 'vitest';
import { isTypingTarget } from './viewer-keys';

describe('viewer keybinds', () => {
	it('ignores keys while typing in inputs, textareas, and selects', () => {
		expect(isTypingTarget(null)).toBe(false);
		const input = { tagName: 'INPUT', isContentEditable: false };
		const select = { tagName: 'SELECT', isContentEditable: false };
		const button = { tagName: 'BUTTON', isContentEditable: false };
		const area = { tagName: 'TEXTAREA', isContentEditable: false };
		expect(isTypingTarget(input)).toBe(true);
		expect(isTypingTarget(select)).toBe(true);
		expect(isTypingTarget(area)).toBe(true);
		expect(isTypingTarget(button)).toBe(false);
	});
});
