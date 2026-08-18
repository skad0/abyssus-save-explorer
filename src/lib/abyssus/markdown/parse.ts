import { buildChallenge } from '../catalogs/challenges';
import { classifyEnemy, prettyEnemy } from '../catalogs/enemies';
import { COIN_CATALOG } from '../catalogs/coins';
import { computeCrossStats } from '../stats';
import { pretty } from '../pretty';
import type { AbyssusProfile, ParseSection, RunRecord, SectionId } from '../types';
import { emptyProfile } from '../types';
import type { CoinCatalogEntry } from '../catalogs/coins';

const SECTION_MAP: Record<string, SectionId> = {
	'profile summary': 'profile-summary',
	'lifetime totals': 'lifetime-totals',
	'lifetime totals (across all recorded runs)': 'lifetime-totals',
	'per-run breakdown': 'per-run-breakdown',
	'enemy kills': 'enemy-kills',
	'enemy kills (all runs combined)': 'enemy-kills',
	'notable challenge progress': 'challenge-progress',
	'challenge progress': 'challenge-progress',
	'hidden coins found': 'hidden-coins',
	'hidden coins': 'hidden-coins',
	loadouts: 'loadouts',
	'saved loadouts': 'loadouts',
	collection: 'collection',
	'unlocked items': 'collection',
	'skill tree': 'skill-tree',
	'skill tree nodes': 'skill-tree',
	'damage breakdown': 'damage-breakdown',
	'damage by source': 'damage-breakdown',
	'mutators & blessings': 'mutators-blessings',
	'mutators and blessings': 'mutators-blessings'
};

function parseBulletLine(line: string): { key: string; value: string } | null {
	const m = /^\*\*(.+?):\*\*\s*(.+)$/.exec(line.trim().replace(/^[-*]\s+/, ''));
	if (!m) return null;
	return { key: m[1].trim(), value: m[2].trim() };
}

function parseTable(lines: string[]): string[][] {
	const rows: string[][] = [];
	for (const line of lines) {
		if (!line.trim().startsWith('|')) continue;
		if (/^\|[-:\s|]+\|$/.test(line.trim())) continue;
		const cells = line
			.split('|')
			.slice(1, -1)
			.map((c) => c.trim());
		if (cells.length) rows.push(cells);
	}
	return rows;
}

function sectionIdFromTitle(title: string): SectionId | string {
	const norm = title.toLowerCase().replace(/\([^)]*\)/g, '').trim();
	return SECTION_MAP[norm] ?? norm.replace(/\s+/g, '-');
}

export interface MarkdownParseResult {
	sections: ParseSection[];
	meta: { source?: string; saved?: string; engine?: string };
}

export function parseMarkdownSections(text: string): MarkdownParseResult {
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	const sections: ParseSection[] = [];
	let i = 0;
	const meta: MarkdownParseResult['meta'] = {};

	if (lines[0]?.startsWith('# ')) {
		const header = [];
		while (i < lines.length && !lines[i].startsWith('## ')) {
			header.push(lines[i]);
			i++;
		}
		const gen = /Generated from `(.+?)`/.exec(header.join('\n'));
		const saved = /Last written \*\*(.+?)\*\*/.exec(header.join('\n'));
		const engine = /Unreal Engine ([\d.]+)/.exec(header.join('\n'));
		if (gen) meta.source = gen[1];
		if (saved) meta.saved = saved[1];
		if (engine) meta.engine = engine[1];
		sections.push({
			id: 'meta',
			title: header[0]?.replace(/^#\s*/, '') ?? 'Meta',
			raw: header.join('\n'),
			parsed: meta,
			warnings: []
		});
	}

	while (i < lines.length) {
		if (!lines[i].startsWith('## ')) {
			i++;
			continue;
		}
		const title = lines[i].replace(/^##\s*/, '').trim();
		i++;
		const body: string[] = [];
		while (i < lines.length && !lines[i].startsWith('## ')) {
			body.push(lines[i]);
			i++;
		}
		const raw = body.join('\n');
		const id = sectionIdFromTitle(title);
		const warnings: string[] = [];
		let parsed: unknown = raw;

		switch (id) {
			case 'profile-summary': {
				const bullets: Record<string, string> = {};
				for (const line of body) {
					const b = parseBulletLine(line);
					if (b) bullets[b.key] = b.value;
				}
				parsed = bullets;
				break;
			}
			case 'lifetime-totals': {
				const totals: Record<string, string> = {};
				for (const line of body) {
					const b = parseBulletLine(line);
					if (b) totals[b.key] = b.value;
				}
				parsed = totals;
				break;
			}
			case 'per-run-breakdown': {
				parsed = parseTable(body).slice(1).map((row) => ({
					index: Number(row[0]),
					loop: Number(row[1]),
					weapon: row[2],
					killedBy: row[3],
					dealt: Number(row[4]?.replace(/,/g, '')),
					taken: Number(row[5]?.replace(/,/g, '')),
					kills: Number(row[6]),
					gold: Number(row[7]),
					deaths: Number(row[8]),
					downed: Number(row[9]),
					accuracy: row[10]
				}));
				break;
			}
			case 'enemy-kills': {
				parsed = parseTable(body)
					.slice(1)
					.map((row) => ({ enemy: row[0], kills: Number(row[1]?.replace(/,/g, '')) }));
				break;
			}
			case 'challenge-progress': {
				parsed = parseTable(body)
					.slice(1)
					.map((row) => ({ challenge: row[0], progress: Number(row[1]?.replace(/,/g, '')) }));
				break;
			}
			case 'hidden-coins': {
				const coinLine = body.find((l) => l.includes('CoinChallenge_'));
				const ids = coinLine?.match(/CoinChallenge_[A-Za-z0-9_]+/g) ?? [];
				parsed = { count: ids.length, ids };
				break;
			}
			case 'loadouts':
			case 'collection':
			case 'skill-tree':
			case 'damage-breakdown':
			case 'mutators-blessings': {
				if (!body.some((l) => l.trim())) warnings.push('Section empty in this report.');
				parsed = { lines: body.filter((l) => l.trim()) };
				break;
			}
			default:
				warnings.push('Unknown section — stored as raw text.');
				parsed = { lines: body.filter((l) => l.trim()) };
		}

		sections.push({ id, title, raw, parsed, warnings });
	}

	return { sections, meta };
}

function numFrom(s: string | undefined): number {
	if (!s) return 0;
	const m = s.replace(/,/g, '').match(/[\d.]+/);
	return m ? Number(m[0]) : 0;
}

export function shapeMarkdown(text: string, fileName: string): AbyssusProfile {
	const { sections, meta } = parseMarkdownSections(text);
	const profile = emptyProfile(fileName, 'markdown');
	profile.sections = sections;
	profile.engine = meta.engine ?? null;
	profile.slot = meta.source?.replace(/\.sav$/, '') ?? '';

	const profileSec = sections.find((s) => s.id === 'profile-summary');
	const totalsSec = sections.find((s) => s.id === 'lifetime-totals');
	const runsSec = sections.find((s) => s.id === 'per-run-breakdown');
	const enemySec = sections.find((s) => s.id === 'enemy-kills');
	const chalSec = sections.find((s) => s.id === 'challenge-progress');
	const coinSec = sections.find((s) => s.id === 'hidden-coins');

	if (profileSec?.parsed && typeof profileSec.parsed === 'object') {
		const p = profileSec.parsed as Record<string, string>;
		profile.souls = numFrom(p['Soul Fragments (currency)'] ?? p['Soul Fragments']);
		profile.diffPoints = numFrom(p['Difficulty points available']);
		const loadouts = numFrom(p['Saved loadout presets']);
		if (loadouts) profile.warnings.push(`Report lists ${loadouts} loadout presets (not in markdown detail).`);
		const skillsMatch = Object.entries(p).find(([k]) => k.includes('Skill tree'));
		if (skillsMatch) {
			const list = skillsMatch[1].match(/:\s*(.+)$/)?.[1] ?? skillsMatch[1];
			profile.skills = list.split(',').map((s) => s.trim()).filter(Boolean);
		}
	}

	if (totalsSec?.parsed && typeof totalsSec.parsed === 'object') {
		const t = totalsSec.parsed as Record<string, string>;
		profile.tot.dealt = numFrom(t['Total damage dealt']);
		profile.tot.taken = numFrom(t['Total damage taken']);
		profile.tot.kills = numFrom(t['Total kills']);
		profile.tot.gold = numFrom(t['Total gold collected']);
		profile.tot.deaths = numFrom(t['Total deaths / times downed']?.split('/')[0]);
		profile.tot.downed = numFrom(t['Total deaths / times downed']?.split('/')[1]);
		const acc = /([\d.]+)%/.exec(t['Shot accuracy'] ?? '');
		if (acc) profile.warnings.push(`Markdown accuracy ${acc[1]}% — per-run only in .sav.`);
	}

	if (Array.isArray(runsSec?.parsed)) {
		profile.runs = (runsSec.parsed as Record<string, unknown>[]).map((r, i): RunRecord => {
			const accMatch = /([\d.]+)%/.exec(String(r.accuracy ?? ''));
			const acc = accMatch ? Number(accMatch[1]) : null;
			const killedBy = String(r.killedBy ?? '');
			const win = killedBy.includes('alive');
			return {
				index: i,
				win,
				loop: Number(r.loop ?? 0),
				infinite: false,
				player: '',
				weapon: pretty(String(r.weapon)) ?? String(r.weapon),
				weaponRaw: String(r.weapon),
				modPrimary: null,
				modSecondary: null,
				ability: null,
				killedBy: win ? null : pretty(killedBy),
				dealt: Number(r.dealt ?? 0),
				taken: Number(r.taken ?? 0),
				kills: Number(r.kills ?? 0),
				gold: Number(r.gold ?? 0),
				keys: 0,
				deaths: Number(r.deaths ?? 0),
				downed: Number(r.downed ?? 0),
				revives: 0,
				maxHP: 0,
				hits: 0,
				miss: 0,
				weak: 0,
				acc,
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
				coop: []
			};
		});
	}

	if (Array.isArray(enemySec?.parsed)) {
		for (const row of enemySec.parsed as { enemy: string; kills: number }[]) {
			const name = prettyEnemy(row.enemy);
			const { faction, role } = classifyEnemy(row.enemy, name);
			profile.enemyTotals[name] = {
				kills: row.kills,
				runs: 0,
				best: row.kills,
				faction,
				role
			};
		}
	}

	if (Array.isArray(chalSec?.parsed)) {
		profile.challenges = (chalSec.parsed as { challenge: string; progress: number }[]).map((c) =>
			buildChallenge(c.challenge, c.progress, pretty(c.challenge) ?? c.challenge)
		);
	}

	if (coinSec?.parsed && typeof coinSec.parsed === 'object') {
		const ids = (coinSec.parsed as { ids: string[] }).ids ?? [];
		const foundByArea: Record<string, number[]> = {};
		for (const id of ids) {
			const m = /^CoinChallenge_(.+)_(\d+)$/.exec(id);
			if (!m) continue;
			(foundByArea[m[1]] ??= []).push(parseInt(m[2], 10));
		}
		profile.coins = COIN_CATALOG.map((c: CoinCatalogEntry) => {
			const found = (foundByArea[c.key] ?? []).sort((a, b) => a - b);
			const missing: number[] = [];
			for (let n = 1; n <= c.total; n++) if (!found.includes(n)) missing.push(n);
			return {
				key: c.key,
				label: c.label,
				wardrobe: c.wardrobe,
				total: c.total,
				found,
				missing,
				remaining: c.total - found.length
			};
		});
	}

	profile.warnings.push('Markdown report lacks per-run breakdowns, loadouts, mutators, and damage mix — drop Profile1.sav for full data.');
	computeCrossStats(profile);
	return profile;
}
