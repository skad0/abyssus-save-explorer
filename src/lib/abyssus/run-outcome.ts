export function isRunWin(runSuccessful: unknown, killedBy: string | null): boolean {
	return Boolean(runSuccessful) || killedBy == null;
}

export function runResultLabel(run: { win: boolean; killedBy: string | null }): 'WIN' | 'SURVIVED' | 'LOSS' {
	if (!run.win) return 'LOSS';
	return run.killedBy == null ? 'SURVIVED' : 'WIN';
}
