import type { AbyssusProfile } from '$lib/abyssus/types';

export type PanelId =
	| 'profile'
	| 'runs'
	| 'enemies'
	| 'challenges'
	| 'coins'
	| 'stats'
	| 'loadouts'
	| 'collection';

export interface ViewerFilters {
	character: string;
	biome: string;
	outcome: 'all' | 'win' | 'loss';
	weapon: string;
	ability: string;
	killer: string;
	search: string;
}

export const viewerState = $state({
	profile: null as AbyssusProfile | null,
	other: null as AbyssusProfile | null,
	error: '' as string,
	panel: 'profile' as PanelId,
	selectedRun: null as number | null,
	compareRun: null as number | null,
	otherSelectedRun: null as number | null,
	focusIndex: 0,
	searchOpen: false,
	filters: {
		character: 'all',
		biome: 'all',
		outcome: 'all',
		weapon: 'all',
		ability: 'all',
		killer: 'all',
		search: ''
	} as ViewerFilters,
	enemySort: 'kills' as 'name' | 'kills' | 'runs' | 'best',
	enemyDir: -1 as 1 | -1,
	enemyFaction: 'all' as string,
	chalFilter: 'all' as 'all' | 'started' | 'untouched' | 'complete',
	runSort: 'index' as 'index' | 'dealt' | 'kills' | 'acc' | 'gold',
	colCat: 'all' as string
});

export function resetViewer(): void {
	viewerState.profile = null;
	viewerState.other = null;
	viewerState.error = '';
	viewerState.panel = 'profile';
	viewerState.selectedRun = null;
	viewerState.compareRun = null;
	viewerState.otherSelectedRun = null;
	viewerState.focusIndex = 0;
	viewerState.searchOpen = false;
	viewerState.filters = {
		character: 'all',
		biome: 'all',
		outcome: 'all',
		weapon: 'all',
		ability: 'all',
		killer: 'all',
		search: ''
	};
}

export function exportProfileJson(): string {
	if (!viewerState.profile) return '{}';
	return JSON.stringify(viewerState.profile, null, 2);
}

export function exportRunsCsv(): string {
	const p = viewerState.profile;
	if (!p) return '';
	const cols = ['idx', 'win', 'loop', 'weapon', 'ability', 'killedBy', 'dealt', 'taken', 'kills', 'gold', 'acc'];
	const lines = [cols.join(',')];
	for (const r of p.runs) {
		lines.push(
			[
				r.index + 1,
				r.win ? 'win' : 'loss',
				r.loop,
				csv(r.weapon),
				csv(r.ability ?? ''),
				csv(r.killedBy ?? 'survived'),
				Math.round(r.dealt),
				Math.round(r.taken),
				r.kills,
				r.gold,
				r.acc == null ? '' : r.acc.toFixed(1)
			].join(',')
		);
	}
	return lines.join('\n');
}

function csv(s: string): string {
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
