import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const savPath = process.argv[2] ?? 'C:\\Users\\mrska\\AppData\\Local\\Abyssus\\Saved\\SaveGames\\Profile1.sav';
const mdPath = process.argv[3] ?? 'C:\\Users\\mrska\\Downloads\\abyssus_save_report_1.md';
const tmpJson = path.join(root, '_verify_tmp.json');

const dump = spawnSync(process.execPath, [path.join(root, 'docs/_tmp_gvas_dump.mjs'), savPath, tmpJson], {
	encoding: 'utf8'
});
if (dump.status !== 0) {
	console.error(dump.stderr || dump.stdout);
	process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(tmpJson, 'utf8'));
const S = parsed.props?.SaveGameData ?? {};

let failed = 0;
const ok = (c, m) => (c ? console.log('OK:', m) : (console.error('FAIL:', m), failed++));

ok(String(parsed.engine).startsWith('5.6'), 'engine 5.6.x');
ok(Array.isArray(S.RunStats) && S.RunStats.length === 10, `10 runs (got ${S.RunStats?.length})`);
ok(Array.isArray(S.Loadouts) && S.Loadouts.length === 6, `6 loadouts (got ${S.Loadouts?.length})`);
ok(Array.isArray(S.CosmeticPAs) && S.CosmeticPAs.length > 0, 'CosmeticPAs present');
ok(Array.isArray(S.HiddenCoinsFoundMap) && S.HiddenCoinsFoundMap.length >= 16, 'hidden coins map');

if (fs.existsSync(mdPath)) {
	const md = fs.readFileSync(mdPath, 'utf8');
	ok(md.includes('## Per-Run Breakdown'), 'md runs section');
	ok(/31/.test(md) && md.includes('Soul Fragments'), 'md souls');
}

fs.unlinkSync(tmpJson);
console.log(failed ? `\n${failed} failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
