export type EnemyFaction = 'Golem' | 'Primal' | 'Trueborn' | 'Elite' | 'Boss' | 'Void' | 'Other';
export type EnemyRole = 'trash' | 'elite' | 'boss' | 'champion';

const NAME_FIX: Record<string, string> = {
	Golemancer: 'The Golemancer',
	TheGolemancer: 'The Golemancer',
	GeneralKrisu: "General Kri'su",
	'General Krisu': "General Kri'su",
	EliteGardenEnemy: 'Elite Overseer',
	HighpriestUnglu: "Highpriest Un'glu",
	Unglu: "Highpriest Un'glu",
	Toraka: "To'raka, King of the Abyss",
	GardensChieftain: 'Primal Chieftain',
	TruebornGolemancer: 'Trueborn Golemancer'
};

export function prettyEnemy(id: string): string {
	const leaf = id.split('/').pop()?.split('.')[0]?.replace(/_C$/, '').replace(/^BP_/, '') ?? id;
	if (NAME_FIX[leaf]) return NAME_FIX[leaf];
	if (NAME_FIX[id]) return NAME_FIX[id];
	const spaced = leaf.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
	return NAME_FIX[spaced] ?? spaced;
}

export function classifyEnemy(id: string, prettyName = prettyEnemy(id)): { faction: EnemyFaction; role: EnemyRole } {
	const s = `${id} ${prettyName}`;
	if (/Golemancer|GeneralKrisu|Kri'su|Toraka|To'raka|Unglu|Un'glu|King of the Abyss|Highpriest/i.test(s)) {
		return { faction: 'Boss', role: 'boss' };
	}
	if (/Chieftain/i.test(s)) return { faction: /Primal|Garden/i.test(s) ? 'Primal' : 'Boss', role: 'boss' };
	if (/Champion|Prototype/i.test(s)) {
		return { faction: /Trueborn/i.test(s) ? 'Trueborn' : 'Void', role: 'champion' };
	}
	if (/^Elite|\bElite /.test(prettyName) || /\/Elite|Elite_/.test(id)) return { faction: 'Elite', role: 'elite' };
	if (/Golem/i.test(s)) return { faction: 'Golem', role: 'trash' };
	if (/Primal/i.test(s)) return { faction: 'Primal', role: 'trash' };
	if (/Trueborn/i.test(s)) return { faction: 'Trueborn', role: 'trash' };
	return { faction: 'Other', role: 'trash' };
}
