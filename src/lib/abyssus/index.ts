import { shapeGvas } from './gvas/shape';
import { parseGVAS } from './gvas/reader';
import { shapeMarkdown } from './markdown/parse';
import type { AbyssusProfile, ParseResult } from './types';

export function detectFileKind(fileName: string, textPreview?: string): 'gvas' | 'markdown' | 'json' | 'unknown' {
	const lower = fileName.toLowerCase();
	if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
	if (lower.endsWith('.json')) return 'json';
	if (lower.endsWith('.sav')) return 'gvas';
	if (textPreview?.startsWith('# Abyssus')) return 'markdown';
	return 'unknown';
}

export function parseFileBuffer(fileName: string, buffer: ArrayBuffer): ParseResult {
	const kind = detectFileKind(fileName);
	try {
		if (kind === 'gvas') {
			const parsed = parseGVAS(buffer);
			const profile = shapeGvas(parsed, fileName);
			if (profile.errors.length) {
				return { ok: false, profile, error: profile.errors[0] };
			}
			return { ok: true, profile };
		}
		const text = new TextDecoder('utf-8').decode(buffer);
		return parseFileText(fileName, text);
	} catch (e) {
		return { ok: false, profile: null, error: e instanceof Error ? e.message : String(e) };
	}
}

export function parseFileText(fileName: string, text: string): ParseResult {
	const kind = detectFileKind(fileName, text.slice(0, 40));
	try {
		if (kind === 'markdown' || text.startsWith('# Abyssus')) {
			return { ok: true, profile: shapeMarkdown(text, fileName) };
		}
		if (kind === 'json') {
			const data = JSON.parse(text) as AbyssusProfile;
			if (data.runs && Array.isArray(data.runs)) {
				return { ok: true, profile: { ...data, source: 'json', fileName } };
			}
			return { ok: false, profile: null, error: 'JSON is not a shaped Abyssus profile.' };
		}
		if (text.startsWith('GVAS') || fileName.toLowerCase().endsWith('.sav')) {
			const buf = new TextEncoder().encode(text).buffer;
			return parseFileBuffer(fileName, buf);
		}
		return {
			ok: false,
			profile: null,
			error: 'Unsupported file. Drop Profile1.sav or an abyssus_save_report.md file.'
		};
	} catch (e) {
		return { ok: false, profile: null, error: e instanceof Error ? e.message : String(e) };
	}
}

export { parseGVAS } from './gvas/reader';
export { shapeGvas } from './gvas/shape';
export { parseMarkdownSections, shapeMarkdown } from './markdown/parse';
export type { AbyssusProfile, ParseResult, RunRecord } from './types';
