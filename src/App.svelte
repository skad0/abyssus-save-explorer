<script lang="ts">
	import { parseFileBuffer } from '$lib/abyssus';
	import FeatureGallery from '$lib/abyssus/components/FeatureGallery.svelte';
	import RunDetail from '$lib/abyssus/components/RunDetail.svelte';
	import RunRow from '$lib/abyssus/components/RunRow.svelte';
	import StackBar from '$lib/abyssus/components/StackBar.svelte';
	import { fmtNum, fmtPct } from '$lib/abyssus/pretty';
	import { biomeWinRates, damageMixPercent, pairByKey, profileAcc } from '$lib/abyssus/stats';
	import type { ComboStats, RunRecord } from '$lib/abyssus/types';
	import { isTypingTarget } from '$lib/abyssus/viewer-keys';
	import {
		exportProfileJson,
		exportRunsCsv,
		resetViewer,
		viewerState,
		type PanelId
	} from '$lib/abyssus/viewer-state.svelte';

	const panels: { id: PanelId; label: string; key: string }[] = [
		{ id: 'profile', label: 'Profile', key: '1' },
		{ id: 'runs', label: 'Runs', key: '2' },
		{ id: 'enemies', label: 'Enemies', key: '3' },
		{ id: 'challenges', label: 'Challenges', key: '4' },
		{ id: 'coins', label: 'Coins', key: '5' },
		{ id: 'stats', label: 'Cross-stats', key: '6' },
		{ id: 'loadouts', label: 'Loadouts', key: '7' },
		{ id: 'collection', label: 'Collection', key: '8' }
	];

	let fileInput: HTMLInputElement | undefined = $state();
	let compareInput: HTMLInputElement | undefined = $state();
	let dragOver = $state(false);
	let compareDrag = $state(false);
	let comboKind = $state<ComboStats['kind']>('weapon-ability');
	let listScrollTop = $state(0);
	let actionMsg = $state('');
	const ROW_H = 56;
	const VIEW_H = 420;

	const profile = $derived(viewerState.profile);
	const other = $derived(viewerState.other);
	const mix = $derived(profile ? damageMixPercent(profile) : []);
	const otherMix = $derived(other ? damageMixPercent(other) : []);
	const biomeWr = $derived(profile ? biomeWinRates(profile) : []);
	const otherBiomeWr = $derived(other ? biomeWinRates(other) : []);
	const pairedWeapons = $derived(
		profile ? pairByKey(profile.weaponStats, other?.weaponStats ?? [], (w) => w.weapon) : []
	);
	const pairedAbilities = $derived(
		profile ? pairByKey(profile.abilityStats, other?.abilityStats ?? [], (a) => a.ability) : []
	);
	const pairedBlessings = $derived(
		profile ? pairByKey(profile.blessingFreq, other?.blessingFreq ?? [], (b) => b.god) : []
	);
	const pairedLoops = $derived(pairByKey(biomeWr, otherBiomeWr, (b) => b.biome));
	const comboRows = $derived(
		profile ? profile.comboStats.filter((c) => c.kind === comboKind) : []
	);

	const filteredRuns = $derived.by(() => {
		if (!profile) return [] as RunRecord[];
		let rows = profile.runs;
		const f = viewerState.filters;
		if (f.outcome === 'win') rows = rows.filter((r) => r.win);
		if (f.outcome === 'loss') rows = rows.filter((r) => !r.win);
		if (f.weapon !== 'all') rows = rows.filter((r) => r.weapon === f.weapon);
		if (f.ability !== 'all') rows = rows.filter((r) => (r.ability ?? 'None') === f.ability);
		if (f.biome === 'loop0') rows = rows.filter((r) => r.loop === 0);
		if (f.biome === 'loop1') rows = rows.filter((r) => r.loop >= 1);
		if (f.killer !== 'all') rows = rows.filter((r) => (r.killedBy ?? 'survived') === f.killer);
		const q = f.search.toLowerCase();
		if (q) {
			rows = rows.filter(
				(r) =>
					r.weapon.toLowerCase().includes(q) ||
					(r.ability ?? '').toLowerCase().includes(q) ||
					(r.killedBy ?? '').toLowerCase().includes(q) ||
					r.enemies.some((e) => e.name.toLowerCase().includes(q))
			);
		}
		const sort = viewerState.runSort;
		rows = [...rows].sort((a, b) => {
			switch (sort) {
				case 'dealt':
					return b.dealt - a.dealt;
				case 'kills':
					return b.kills - a.kills;
				case 'acc':
					return (b.acc ?? 0) - (a.acc ?? 0);
				case 'gold':
					return b.gold - a.gold;
				case 'index':
					return a.index - b.index;
				default: {
					const _n: never = sort;
					return _n;
				}
			}
		});
		return rows;
	});

	const windowedRuns = $derived.by(() => {
		const start = Math.max(0, Math.floor(listScrollTop / ROW_H) - 2);
		const visible = Math.ceil(VIEW_H / ROW_H) + 4;
		return { start, end: start + visible, rows: filteredRuns.slice(start, start + visible) };
	});

	const selectedRun = $derived(
		profile && viewerState.selectedRun != null
			? profile.runs.find((r) => r.index === viewerState.selectedRun) ?? null
			: null
	);

	const compareRun = $derived(
		profile && viewerState.compareRun != null
			? profile.runs.find((r) => r.index === viewerState.compareRun) ?? null
			: null
	);

	const otherRun = $derived(
		other && viewerState.otherSelectedRun != null
			? other.runs.find((r) => r.index === viewerState.otherSelectedRun) ?? null
			: null
	);

	const weapons = $derived(profile ? [...new Set(profile.runs.map((r) => r.weapon))].sort() : []);
	const abilities = $derived(
		profile ? [...new Set(profile.runs.map((r) => r.ability ?? 'None'))].sort() : []
	);
	const killers = $derived(
		profile ? [...new Set(profile.runs.map((r) => r.killedBy ?? 'survived'))].sort() : []
	);

	const enemyRows = $derived.by(() => {
		if (!profile) return [];
		let rows = Object.entries(profile.enemyTotals).map(([name, s]) => ({ name, ...s }));
		const q = viewerState.filters.search.toLowerCase();
		if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
		if (viewerState.enemyFaction !== 'all') {
			rows = rows.filter((r) => r.faction === viewerState.enemyFaction);
		}
		const key = viewerState.enemySort;
		rows.sort((a, b) => {
			if (key === 'name') return viewerState.enemyDir * a.name.localeCompare(b.name);
			const av = a[key] - b[key];
			return viewerState.enemyDir * (av === 0 ? 0 : av > 0 ? 1 : -1);
		});
		return rows;
	});

	const chalRows = $derived.by(() => {
		if (!profile) return [];
		let rows = profile.challenges;
		const q = viewerState.filters.search.toLowerCase();
		if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
		if (viewerState.chalFilter === 'started') rows = rows.filter((r) => r.count > 0);
		if (viewerState.chalFilter === 'untouched') rows = rows.filter((r) => r.count === 0);
		if (viewerState.chalFilter === 'complete') rows = rows.filter((r) => r.state === 'likely-complete');
		return rows;
	});

	const chalGroups = $derived.by(() => {
		const map = new Map<string, typeof chalRows>();
		for (const c of chalRows) {
			const list = map.get(c.family) ?? [];
			list.push(c);
			map.set(c.family, list);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	const collectionRows = $derived.by(() => {
		if (!profile) return [];
		let rows = profile.collection;
		if (viewerState.colCat !== 'all') rows = rows.filter((r) => r.category === viewerState.colCat);
		const q = viewerState.filters.search.toLowerCase();
		if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
		return rows;
	});

	const blessingGroups = $derived.by(() => {
		if (!profile) return [];
		const map = new Map<string, typeof profile.mutatorsFound>();
		for (const m of profile.mutatorsFound) {
			if (!m.god) continue;
			const list = map.get(m.god) ?? [];
			list.push(m);
			map.set(m.god, list);
		}
		return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	});

	async function loadFile(file: File, slot?: 'you' | 'them') {
		const into = slot ?? (viewerState.profile ? 'them' : 'you');
		const buf = await file.arrayBuffer();
		const result = parseFileBuffer(file.name, buf);
		if (!result.ok || !result.profile) {
			viewerState.error = result.error ?? 'Parse failed';
			if (into === 'you') viewerState.profile = result.profile;
			return;
		}
		viewerState.error = '';
		if (into === 'them') {
			viewerState.other = result.profile;
			viewerState.otherSelectedRun = result.profile.runs[0]?.index ?? null;
			viewerState.compareRun = null;
			viewerState.panel = 'runs';
			return;
		}
		viewerState.profile = result.profile;
		viewerState.other = null;
		viewerState.otherSelectedRun = null;
		viewerState.panel = 'runs';
		viewerState.selectedRun = result.profile.runs[0]?.index ?? null;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const f = e.dataTransfer?.files[0];
		if (f) loadFile(f, 'you');
	}

	function onWindowDragOver(e: DragEvent) {
		if (!viewerState.profile || !e.dataTransfer?.types.includes('Files')) return;
		e.preventDefault();
		compareDrag = true;
	}

	function onWindowDrop(e: DragEvent) {
		compareDrag = false;
		if (!viewerState.profile) return;
		const f = e.dataTransfer?.files[0];
		if (!f) return;
		e.preventDefault();
		loadFile(f, 'them');
	}

	function clearOther() {
		viewerState.other = null;
		viewerState.otherSelectedRun = null;
	}

	function setPanel(id: PanelId) {
		viewerState.panel = id;
	}

	function handleKey(e: KeyboardEvent) {
		if (!profile) return;
		if (isTypingTarget(e.target)) {
			if (e.key === 'Escape') {
				viewerState.searchOpen = false;
				(e.target as HTMLElement).blur();
			}
			return;
		}
		if (e.key === '/') {
			e.preventDefault();
			viewerState.searchOpen = true;
			return;
		}
		if (e.key === 'Escape') {
			viewerState.searchOpen = false;
			viewerState.compareRun = null;
			return;
		}
		if (viewerState.panel === 'runs') {
			if (e.key === 'j') {
				e.preventDefault();
				const idx = filteredRuns.findIndex((r) => r.index === viewerState.selectedRun);
				const next = filteredRuns[Math.min(filteredRuns.length - 1, idx + 1)];
				if (next) viewerState.selectedRun = next.index;
			}
			if (e.key === 'k') {
				e.preventDefault();
				const idx = filteredRuns.findIndex((r) => r.index === viewerState.selectedRun);
				const prev = filteredRuns[Math.max(0, idx - 1)];
				if (prev) viewerState.selectedRun = prev.index;
			}
			if (e.key === 'Enter' && e.shiftKey && viewerState.selectedRun != null && !viewerState.other) {
				e.preventDefault();
				viewerState.compareRun = viewerState.selectedRun;
			}
		}
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		const num = Number(e.key);
		if (num >= 1 && num <= panels.length) {
			e.preventDefault();
			setPanel(panels[num - 1].id);
		}
	}

	async function copyExport() {
		try {
			await navigator.clipboard.writeText(exportProfileJson());
			actionMsg = 'JSON copied';
		} catch {
			actionMsg = 'Clipboard blocked — use Export JSON';
		}
	}

	function downloadExport() {
		const blob = new Blob([exportProfileJson()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${profile?.slot || 'abyssus'}-export.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function downloadCsv() {
		const blob = new Blob([exportRunsCsv()], { type: 'text/csv' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${profile?.slot || 'abyssus'}-runs.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function openCombo(row: ComboStats) {
		if (row.kind === 'weapon-ability') {
			viewerState.filters.weapon = row.left;
			viewerState.filters.ability = row.right;
		} else if (row.kind === 'weapon-aspect') {
			viewerState.filters.weapon = row.left;
			viewerState.filters.ability = 'all';
		} else if (row.kind === 'ability-aspect') {
			viewerState.filters.weapon = 'all';
			viewerState.filters.ability = row.left;
		} else {
			const _n: never = row.kind;
			return _n;
		}
		viewerState.panel = 'runs';
	}

	function comboKindLabel(kind: ComboStats['kind']): string {
		switch (kind) {
			case 'weapon-ability':
				return 'Weapon × ability';
			case 'weapon-aspect':
				return 'Weapon × lead aspect';
			case 'ability-aspect':
				return 'Ability × lead aspect';
			default: {
				const _n: never = kind;
				return _n;
			}
		}
	}

	const wins = $derived(profile ? profile.runs.filter((r) => r.win).length : 0);
	const otherWins = $derived(other ? other.runs.filter((r) => r.win).length : 0);
	const acc = $derived(profile ? profileAcc(profile) : null);
	const otherAcc = $derived(other ? profileAcc(other) : null);
	const coinFound = $derived(profile ? profile.coins.reduce((a, c) => a + c.found.length, 0) : 0);
	const coinTotal = $derived(profile ? profile.coins.reduce((a, c) => a + c.total, 0) : 0);
	const otherCoinFound = $derived(other ? other.coins.reduce((a, c) => a + c.found.length, 0) : 0);
	const otherCoinTotal = $derived(other ? other.coins.reduce((a, c) => a + c.total, 0) : 0);
	const colCats = $derived(profile ? [...new Set(profile.collection.map((c) => c.category))].sort() : []);
	const enemyFactions = $derived(
		profile ? [...new Set(Object.values(profile.enemyTotals).map((e) => e.faction))].sort() : []
	);
</script>

<svelte:window
	onkeydown={handleKey}
	ondragover={onWindowDragOver}
	ondrop={onWindowDrop}
	ondragleave={() => (compareDrag = false)}
/>

<main class="max-w-6xl mx-auto px-3 py-4 pb-16">
	<header class="border-b border-[var(--contour)] pb-3 mb-3 flex flex-wrap justify-between gap-3">
		<div>
			<h1 class="text-xl font-serif tracking-tight">Dive Log</h1>
			<p class="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
				Abyssus save viewer · local parse only
			</p>
		</div>
			{#if profile}
			<div class="text-right text-xs font-mono text-[var(--muted)]">
				<div><span class="text-[var(--phosphor)]">{profile.slot || profile.fileName}</span></div>
				<div>{profile.engine ?? 'md'} · {profile.runs.length} runs · {profile.source}</div>
				{#if other}
					<div class="text-[var(--brass)] mt-1">{other.slot || other.fileName}</div>
					<div>{other.engine ?? 'md'} · {other.runs.length} runs · {other.source}</div>
				{/if}
			</div>
			{/if}
	</header>

	{#if !profile}
		<section
			class="border border-dashed border-[var(--contour)] p-10 text-center {dragOver
				? 'border-[var(--phosphor)] bg-[rgba(121,205,187,0.06)]'
				: ''}"
			ondragover={(e) => {
				e.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
			aria-label="Drop zone"
		>
			<h2 class="text-lg font-serif mb-2">Drop save or report</h2>
			<p class="text-[var(--muted)] text-sm max-w-md mx-auto mb-4">
				Accepts <code class="text-[var(--phosphor)]">Profile1.sav</code>,
				<code class="text-[var(--phosphor)]">abyssus_save_report.md</code>, or shaped JSON. Parsed in-browser — never uploaded.
			</p>
			<p class="text-xs text-[var(--muted)] font-mono mb-4">
				%LOCALAPPDATA%\Abyssus\Saved\SaveGames\Profile1.sav
			</p>
			<button
				type="button"
				class="font-mono text-xs uppercase tracking-wider bg-[var(--phosphor)] text-[#05141a] px-4 py-2"
				onclick={() => fileInput?.click()}
			>
				Choose file
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept=".sav,.md,.markdown,.json"
				class="hidden"
				onchange={(e) => {
					const f = (e.currentTarget as HTMLInputElement).files?.[0];
					if (f) loadFile(f);
				}}
			/>
			{#if viewerState.error}
				<div class="mt-4 text-[var(--coral)] text-sm border border-[var(--coral)] p-3 text-left max-w-lg mx-auto">
					{viewerState.error}
					<p class="text-xs text-[var(--muted)] mt-2">
						Use Profile1.sav — not GameSettings.sav or SAVE_GAME_SESSION_SLOT.sav.
					</p>
				</div>
			{/if}
		</section>
		<FeatureGallery />
	{:else}
		<div class="flex flex-wrap gap-2 items-center mb-3">
			<nav class="flex flex-wrap gap-1" aria-label="Panels">
				{#each panels as p}
					<button
						type="button"
						class="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-[var(--contour)] {viewerState.panel ===
						p.id
							? 'text-[var(--phosphor)] border-[var(--phosphor)]'
							: 'text-[var(--muted)]'}"
						aria-current={viewerState.panel === p.id ? 'page' : undefined}
						onclick={() => setPanel(p.id)}
					>
						{p.key} {p.label}
					</button>
				{/each}
			</nav>
			<div class="ml-auto flex gap-2">
				{#if viewerState.searchOpen}
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="search"
						placeholder="Filter…"
						class="font-mono text-xs bg-[rgba(8,24,31,0.8)] border border-[var(--contour)] px-2 py-1 min-w-40"
						bind:value={viewerState.filters.search}
						autofocus
					/>
				{/if}
				<button type="button" class="btn-ghost" onclick={() => (viewerState.searchOpen = !viewerState.searchOpen)}>Search</button>
				<button type="button" class="btn-ghost" onclick={copyExport}>Copy JSON</button>
				<button type="button" class="btn-ghost" onclick={downloadExport}>Export JSON</button>
				<button type="button" class="btn-ghost" onclick={downloadCsv}>Runs CSV</button>
				<button type="button" class="btn-ghost" onclick={() => compareInput?.click()}>
					{other ? 'Replace compare file' : 'Compare file'}
				</button>
				{#if other}
					<button type="button" class="btn-ghost" onclick={clearOther}>Clear compare</button>
				{/if}
				<button type="button" class="btn-ghost" onclick={resetViewer}>New file</button>
				<input
					bind:this={compareInput}
					type="file"
					accept=".sav,.md,.markdown,.json"
					class="hidden"
					onchange={(e) => {
						const f = (e.currentTarget as HTMLInputElement).files?.[0];
						if (f) loadFile(f, 'them');
						e.currentTarget.value = '';
					}}
				/>
			</div>
		</div>
		{#if actionMsg}
			<p class="text-[10px] font-mono text-[var(--phosphor)] mb-2">{actionMsg}</p>
		{/if}
		{#if viewerState.error}
			<p class="text-xs text-[var(--coral)] border border-[var(--coral)] p-2 mb-2">{viewerState.error}</p>
		{/if}
		{#if compareDrag}
			<p class="text-[10px] font-mono text-[var(--brass)] mb-2">Drop to compare against this profile</p>
		{/if}

		<aside class="text-[10px] font-mono text-[var(--muted)] mb-3 border border-[var(--contour)] px-2 py-1">
			<span class="text-[var(--phosphor)]">Keys:</span> 1–8 panels · j/k runs ·
			{other ? 'compare file owns the right pane' : 'Shift+Enter or Compare'}
			· / search · Esc close · drop another .sav to compare
		</aside>

		{#if profile.warnings.length}
			<ul class="text-xs text-[var(--brass)] border-l-2 border-[var(--brass)] pl-2 mb-3 space-y-1">
				{#each profile.warnings as w}
					<li>{w}</li>
				{/each}
			</ul>
		{/if}
		{#if other?.warnings.length}
			<ul class="text-xs text-[var(--brass)] border-l-2 border-[var(--brass)] pl-2 mb-3 space-y-1">
				{#each other.warnings as w}
					<li>Compare: {w}</li>
				{/each}
			</ul>
		{/if}

		{#if viewerState.panel === 'profile'}
			<p class="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
				Profile grain · lifetime + account
				{#if other}<span class="text-[var(--brass)]"> · phosphor you · brass them</span>{/if}
			</p>
			<div class="grid md:grid-cols-2 gap-3">
				<section class="panel">
					<h3 class="panel-title">Account</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span class="label">Souls</span>
							<div class="val">{fmtNum(profile.souls)}</div>
							{#if other}<div class="val them">{fmtNum(other.souls)}</div>{/if}
						</div>
						<div>
							<span class="label">Diff points</span>
							<div class="val">{profile.diffPoints}</div>
							{#if other}<div class="val them">{other.diffPoints}</div>{/if}
						</div>
						<div>
							<span class="label">Runs</span>
							<div class="val">{profile.runs.length}</div>
							<div class="text-[10px] text-[var(--muted)]">{wins} completed</div>
							{#if other}
								<div class="val them">{other.runs.length}</div>
								<div class="text-[10px] text-[var(--brass)]">{otherWins} completed</div>
							{/if}
						</div>
						<div>
							<span class="label">Fissures</span>
							<div class="val">{coinFound}/{coinTotal}</div>
							{#if other}<div class="val them">{otherCoinFound}/{otherCoinTotal}</div>{/if}
						</div>
					</div>
				</section>
				<section class="panel">
					<h3 class="panel-title">Lifetime combat</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span class="label">Kills</span>
							<div class="val">{fmtNum(profile.tot.kills)}</div>
							{#if other}<div class="val them">{fmtNum(other.tot.kills)}</div>{/if}
						</div>
						<div>
							<span class="label">Damage</span>
							<div class="val">{fmtNum(Math.round(profile.tot.dealt))}</div>
							{#if other}<div class="val them">{fmtNum(Math.round(other.tot.dealt))}</div>{/if}
						</div>
						<div>
							<span class="label">Taken</span>
							<div class="val text-[var(--coral)]">{fmtNum(Math.round(profile.tot.taken))}</div>
							{#if other}<div class="val them">{fmtNum(Math.round(other.tot.taken))}</div>{/if}
						</div>
						<div>
							<span class="label">Accuracy</span>
							<div class="val">{fmtPct(acc)}</div>
							{#if other}<div class="val them">{fmtPct(otherAcc)}</div>{/if}
						</div>
					</div>
				</section>
				<section class="panel">
					<h3 class="panel-title">Expedition map</h3>
					<div class="text-[10px] font-mono uppercase text-[var(--muted)] mb-1">Cleared</div>
					<div class="flex flex-wrap gap-1 mb-2">
						{#each profile.completedAreas as a}<span class="tag text-[var(--phosphor)]">{a}</span>{:else}<span class="text-[var(--muted)] text-xs">None</span>{/each}
					</div>
					<div class="text-[10px] font-mono uppercase text-[var(--muted)] mb-1">Seen</div>
					<div class="flex flex-wrap gap-1 mb-2">
						{#each profile.seenAreas as a}<span class="tag">{a}</span>{:else}<span class="text-[var(--muted)] text-xs">None</span>{/each}
					</div>
					<div class="text-[10px] font-mono uppercase text-[var(--muted)] mb-1">Boss variants</div>
					<div class="flex flex-wrap gap-1">
						{#each profile.bossVariants as a}<span class="tag">{a}</span>{:else}<span class="text-[var(--muted)] text-xs">None</span>{/each}
					</div>
				</section>
				<section class="panel">
					<h3 class="panel-title">Skill tree ({profile.skills.length})</h3>
					<div class="flex flex-wrap gap-1">
						{#each profile.skills as s}
							<span class="tag">{s}</span>
						{/each}
					</div>
					<h3 class="panel-title mt-3">Difficulty</h3>
					{#each profile.difficulty.filter((d) => d.pts > 0) as d}
						<span class="tag">{d.name} {d.pts}</span>
					{:else}
						<p class="text-xs text-[var(--muted)]">{profile.diffPoints} unspent</p>
					{/each}
				</section>
				{#if Object.keys(profile.unknownKeys).length}
					<section class="panel md:col-span-2">
						<h3 class="panel-title">Unknown save keys ({Object.keys(profile.unknownKeys).length})</h3>
						<pre class="text-[10px] font-mono overflow-auto max-h-32 text-[var(--muted)]">{JSON.stringify(profile.unknownKeys, null, 2)}</pre>
					</section>
				{/if}
			</div>
		{:else if viewerState.panel === 'runs'}
			<div class="flex flex-wrap gap-2 mb-2 text-xs font-mono">
				<select bind:value={viewerState.filters.outcome} class="ctl">
					<option value="all">All outcomes</option>
					<option value="win">Wins</option>
					<option value="loss">Losses</option>
				</select>
				<select bind:value={viewerState.filters.weapon} class="ctl">
					<option value="all">All weapons</option>
					{#each weapons as w}<option value={w}>{w}</option>{/each}
				</select>
				<select bind:value={viewerState.filters.ability} class="ctl">
					<option value="all">All abilities</option>
					{#each abilities as a}<option value={a}>{a}</option>{/each}
				</select>
				<select bind:value={viewerState.filters.biome} class="ctl">
					<option value="all">All loops</option>
					<option value="loop0">Loop 0</option>
					<option value="loop1">Loop 1+</option>
				</select>
				<select bind:value={viewerState.filters.killer} class="ctl">
					<option value="all">All endings</option>
					{#each killers as k}<option value={k}>{k}</option>{/each}
				</select>
				<select bind:value={viewerState.runSort} class="ctl">
					<option value="index">Sort #</option>
					<option value="dealt">Sort damage</option>
					<option value="kills">Sort kills</option>
					<option value="acc">Sort acc</option>
					<option value="gold">Sort gold</option>
				</select>
				<span class="text-[var(--muted)] self-center">{filteredRuns.length} runs</span>
				{#if other}
					<select
						class="ctl"
						value={viewerState.otherSelectedRun ?? ''}
						onchange={(e) => {
							const v = (e.currentTarget as HTMLSelectElement).value;
							viewerState.otherSelectedRun = v === '' ? null : Number(v);
						}}
					>
						<option value="">Their run…</option>
						{#each other.runs as r (r.index)}
							<option value={r.index}>{r.index + 1} · {r.weapon}{#if r.ability} / {r.ability}{/if}</option>
						{/each}
					</select>
				{:else}
					<button
						type="button"
						class="btn-ghost"
						disabled={selectedRun == null}
						onclick={() => {
							if (viewerState.selectedRun != null) viewerState.compareRun = viewerState.selectedRun;
						}}
					>
						Compare
					</button>
					<button
						type="button"
						class="btn-ghost"
						disabled={compareRun == null}
						onclick={() => (viewerState.compareRun = null)}
					>
						Clear compare
					</button>
				{/if}
			</div>
			<div class="grid md:grid-cols-[minmax(220px,1fr)_minmax(280px,1.2fr)] gap-3">
				<div
					class="border border-[var(--contour)] overflow-auto"
					style="height:{VIEW_H}px"
					onscroll={(e) => (listScrollTop = (e.currentTarget as HTMLDivElement).scrollTop)}
				>
					<div style="height:{filteredRuns.length * ROW_H}px; position:relative">
						<div style="position:absolute; top:{windowedRuns.start * ROW_H}px; left:0; right:0">
							{#each windowedRuns.rows as run (run.index)}
								<RunRow
									{run}
									selected={viewerState.selectedRun === run.index}
									onselect={() => (viewerState.selectedRun = run.index)}
								/>
							{/each}
						</div>
					</div>
				</div>
				<div class="border border-[var(--contour)] p-3 overflow-auto" style="max-height:{VIEW_H}px">
					{#if selectedRun}
						<RunDetail run={selectedRun} {profile} />
					{:else}
						<p class="text-[var(--muted)] text-sm">Select a run (j/k)</p>
					{/if}
					{#if other}
						<hr class="border-[var(--contour)] my-3" />
						<h4 class="text-xs font-mono uppercase text-[var(--brass)] mb-2">
							{other.slot || other.fileName}
							{#if otherRun} · run {otherRun.index + 1}{/if}
						</h4>
						{#if otherRun}
							<RunDetail run={otherRun} profile={other} />
						{:else}
							<p class="text-[var(--muted)] text-sm">Pick one of their runs</p>
						{/if}
					{:else if compareRun}
						{#if compareRun.index === selectedRun?.index}
							<p class="text-xs font-mono text-[var(--brass)] mt-3">
								Pinned run {compareRun.index + 1} — j/k or click another run to compare
							</p>
						{:else}
							<hr class="border-[var(--contour)] my-3" />
							<h4 class="text-xs font-mono uppercase text-[var(--brass)] mb-2">Compare run {compareRun.index + 1}</h4>
							<RunDetail run={compareRun} {profile} />
						{/if}
					{/if}
				</div>
			</div>
		{:else if viewerState.panel === 'enemies'}
			<div class="flex flex-wrap gap-2 mb-2">
				<select bind:value={viewerState.enemyFaction} class="ctl">
					<option value="all">All factions</option>
					{#each enemyFactions as f}<option value={f}>{f}</option>{/each}
				</select>
			</div>
			<div class="border border-[var(--contour)] overflow-auto max-h-[520px]">
				<table class="w-full text-xs">
					<thead>
						<tr class="text-[var(--muted)] font-mono uppercase text-[10px]">
							<th class="p-2 cursor-pointer" onclick={() => (viewerState.enemySort = 'name')}>Enemy</th>
							<th class="p-2">Faction</th>
							<th class="p-2 text-right cursor-pointer" onclick={() => (viewerState.enemySort = 'kills')}>Kills</th>
							<th class="p-2 text-right cursor-pointer" onclick={() => (viewerState.enemySort = 'runs')}>Runs</th>
							<th class="p-2 text-right cursor-pointer" onclick={() => (viewerState.enemySort = 'best')}>Best</th>
						</tr>
					</thead>
					<tbody>
						{#each enemyRows as e}
							<tr
								class="border-t border-[var(--contour)] hover:bg-[rgba(28,72,89,0.25)] cursor-pointer"
								onclick={() => {
									viewerState.filters.search = e.name;
									viewerState.searchOpen = true;
									viewerState.panel = 'runs';
								}}
							>
								<td class="p-2">{e.name}</td>
								<td class="p-2 text-[var(--muted)]">{e.faction}</td>
								<td class="p-2 text-right font-mono tabular-nums">{fmtNum(e.kills)}</td>
								<td class="p-2 text-right font-mono tabular-nums">{e.runs || '—'}</td>
								<td class="p-2 text-right font-mono tabular-nums">{e.best || '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if viewerState.panel === 'challenges'}
			<div class="flex gap-2 mb-2">
				{#each ['all', 'started', 'untouched', 'complete'] as f}
					<button
						type="button"
						class="chip {viewerState.chalFilter === f ? 'on' : ''}"
						onclick={() => (viewerState.chalFilter = f as typeof viewerState.chalFilter)}
					>
						{f}
					</button>
				{/each}
			</div>
			<p class="text-[10px] text-[var(--muted)] mb-2">
				Counters come from the save. Targets exist only for binary unlocks/wins/bosses — Kill Challenge 913 is a logged count, not an unfinished bar.
			</p>
			<div class="space-y-3 max-h-[520px] overflow-auto">
				{#each chalGroups as [family, rows]}
					<section>
						<h3 class="panel-title">{family}</h3>
						{#each rows as c}
							<div class="panel py-2 px-3 mb-1">
								<div class="flex justify-between gap-2 text-sm">
									<span>{c.name}</span>
									<span class="font-mono text-[var(--phosphor)]">{fmtNum(c.count)}{c.target ? ` / ${fmtNum(c.target)}` : ''}</span>
								</div>
								<div class="text-[10px] text-[var(--muted)] font-mono">
									{c.state}{c.remaining != null ? ` · ${fmtNum(c.remaining)} left` : ''}{c.runHits ? ` · ${c.runHits} runs` : ''}
								</div>
								{#if c.pct != null}
									<div class="bar mt-1"><i style="width:{c.pct}%"></i></div>
								{/if}
							</div>
						{/each}
					</section>
				{/each}
			</div>
		{:else if viewerState.panel === 'coins'}
			<div class="grid md:grid-cols-2 gap-2">
				{#each profile.coins as c}
					<section class="panel">
						<h3 class="panel-title">{c.label} <span class="text-[var(--muted)] font-normal">({c.found.length}/{c.total})</span></h3>
						<div class="text-[10px] text-[var(--muted)] mb-2">Wardrobe: {c.wardrobe} · {c.remaining} remaining</div>
						<div class="flex flex-wrap gap-1 mb-2">
							{#each c.found as n}
								<span class="tag text-[var(--phosphor)]">#{n}</span>
							{/each}
						</div>
						{#if c.missing.length}
							<div class="text-[10px] text-[var(--coral)]">Missing: {c.missing.map((n) => `#${n}`).join(', ')}</div>
						{/if}
					</section>
				{/each}
			</div>
		{:else if viewerState.panel === 'stats'}
			<div class="grid md:grid-cols-2 gap-3">
				<section class="panel">
					<h3 class="panel-title">Damage mix (lifetime)</h3>
					<StackBar slices={mix} width={320} />
					<ul class="mt-2 text-xs font-mono space-y-0.5">
						{#each mix as s}
							<li class="flex justify-between"><span>{s.label}</span><span>{s.pct.toFixed(1)}%</span></li>
						{/each}
					</ul>
					{#if other}
						<p class="text-[10px] font-mono uppercase text-[var(--brass)] mt-3 mb-1">{other.slot || other.fileName}</p>
						<StackBar slices={otherMix} width={320} />
						<ul class="mt-2 text-xs font-mono space-y-0.5">
							{#each otherMix as s}
								<li class="flex justify-between text-[var(--brass)]"><span>{s.label}</span><span>{s.pct.toFixed(1)}%</span></li>
							{/each}
						</ul>
					{/if}
				</section>
				<section class="panel">
					<h3 class="panel-title">Weapon table</h3>
					<table class="w-full text-xs">
						<thead>
							<tr class="text-[var(--muted)]">
								<th class="text-left p-1">Weapon</th>
								<th class="p-1">Runs</th>
								<th class="p-1">WR</th>
								<th class="p-1">Avg dmg</th>
								{#if other}
									<th class="p-1 text-[var(--brass)]">Them</th>
									<th class="p-1 text-[var(--brass)]">WR</th>
									<th class="p-1 text-[var(--brass)]">Avg</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each pairedWeapons as row (row.key)}
								<tr class="border-t border-[var(--contour)]">
									<td class="p-1">{row.key}</td>
									<td class="p-1 text-center font-mono">{row.you?.runs ?? '—'}</td>
									<td class="p-1 text-center font-mono">{row.you ? fmtPct(row.you.winRate, 0) : '—'}</td>
									<td class="p-1 text-right font-mono">{row.you ? fmtNum(Math.round(row.you.avgDealt)) : '—'}</td>
									{#if other}
										<td class="p-1 text-center font-mono text-[var(--brass)]">{row.them?.runs ?? '—'}</td>
										<td class="p-1 text-center font-mono text-[var(--brass)]">{row.them ? fmtPct(row.them.winRate, 0) : '—'}</td>
										<td class="p-1 text-right font-mono text-[var(--brass)]">{row.them ? fmtNum(Math.round(row.them.avgDealt)) : '—'}</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
				<section class="panel">
					<h3 class="panel-title">Ability table</h3>
					<table class="w-full text-xs">
						<thead>
							<tr class="text-[var(--muted)]">
								<th class="text-left p-1">Ability</th>
								<th class="p-1">Runs</th>
								<th class="p-1">WR</th>
								<th class="p-1">Avg dmg</th>
								{#if other}
									<th class="p-1 text-[var(--brass)]">Them</th>
									<th class="p-1 text-[var(--brass)]">WR</th>
									<th class="p-1 text-[var(--brass)]">Avg</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each pairedAbilities as row (row.key)}
								<tr class="border-t border-[var(--contour)]">
									<td class="p-1">{row.key}</td>
									<td class="p-1 text-center font-mono">{row.you?.runs ?? '—'}</td>
									<td class="p-1 text-center font-mono">{row.you ? fmtPct(row.you.winRate, 0) : '—'}</td>
									<td class="p-1 text-right font-mono">{row.you ? fmtNum(Math.round(row.you.avgDealt)) : '—'}</td>
									{#if other}
										<td class="p-1 text-center font-mono text-[var(--brass)]">{row.them?.runs ?? '—'}</td>
										<td class="p-1 text-center font-mono text-[var(--brass)]">{row.them ? fmtPct(row.them.winRate, 0) : '—'}</td>
										<td class="p-1 text-right font-mono text-[var(--brass)]">{row.them ? fmtNum(Math.round(row.them.avgDealt)) : '—'}</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
					<h3 class="panel-title mt-3">Blessing frequency</h3>
					{#each pairedBlessings as row (row.key)}
						<div class="flex justify-between text-xs py-0.5 font-mono gap-2">
							<span>{row.key}</span>
							<span>
								{row.you ? `${row.you.runs} runs · ${fmtNum(row.you.damage)} dmg` : '—'}
								{#if other}
									<span class="text-[var(--brass)]">
										· {row.them ? `${row.them.runs} / ${fmtNum(row.them.damage)}` : '—'}
									</span>
								{/if}
							</span>
						</div>
					{/each}
					<h3 class="panel-title mt-3">Loop win rate</h3>
					{#each pairedLoops as row (row.key)}
						<div class="flex justify-between text-xs py-0.5 font-mono gap-2">
							<span>{row.key}</span>
							<span>
								{row.you ? `${fmtPct(row.you.rate, 0)} (${row.you.wins}/${row.you.runs})` : '—'}
								{#if other}
									<span class="text-[var(--brass)]">
										· {row.them ? `${fmtPct(row.them.rate, 0)} (${row.them.wins}/${row.them.runs})` : '—'}
									</span>
								{/if}
							</span>
						</div>
					{/each}
				</section>
				<section class="panel md:col-span-2">
					<h3 class="panel-title">Combo efficiency</h3>
					<p class="text-[11px] text-[var(--muted)] mb-2">
						Your runs, not a tier list. DPS is damage/time. Survival is dealt/taken. vs avg is against this profile’s mean run damage.
						Wiki notes are baked in (wiki.gg + community aspect guide) — nothing is uploaded.
					</p>
					<div class="flex flex-wrap gap-1 mb-2">
						{#each (['weapon-ability', 'weapon-aspect', 'ability-aspect'] as const) as kind (kind)}
							<button
								type="button"
								class="chip {comboKind === kind ? 'on' : ''}"
								aria-pressed={comboKind === kind}
								onclick={() => (comboKind = kind)}
							>
								{comboKindLabel(kind)}
							</button>
						{/each}
					</div>
					<div class="overflow-auto max-h-[280px]">
						<table class="w-full text-xs">
							<thead>
								<tr class="text-[var(--muted)]">
									<th class="text-left p-1">{comboKind === 'ability-aspect' ? 'Ability' : 'Weapon'}</th>
									<th class="text-left p-1">{comboKind === 'weapon-ability' ? 'Ability' : 'Lead aspect'}</th>
									<th class="p-1">Runs</th>
									<th class="p-1">WR</th>
									<th class="p-1">Avg dmg</th>
									<th class="p-1">DPS</th>
									<th class="p-1">vs avg</th>
									<th class="text-left p-1">Notes</th>
								</tr>
							</thead>
							<tbody>
								{#each comboRows as row (row.kind + row.left + row.right)}
									<tr
										class="border-t border-[var(--contour)] cursor-pointer hover:bg-[rgba(28,72,89,.28)]"
										onclick={() => openCombo(row)}
									>
										<td class="p-1">{row.left}</td>
										<td class="p-1">{row.right}</td>
										<td class="p-1 text-center font-mono">{row.runs}</td>
										<td class="p-1 text-center font-mono">{fmtPct(row.winRate, 0)}</td>
										<td class="p-1 text-right font-mono">{fmtNum(Math.round(row.avgDealt))}</td>
										<td class="p-1 text-right font-mono">{row.avgDps == null ? '—' : fmtNum(Math.round(row.avgDps))}</td>
										<td class="p-1 text-right font-mono {row.vsBaselineDealt >= 1 ? 'text-[var(--phosphor)]' : 'text-[var(--coral)]'}">
											{row.vsBaselineDealt >= 1 ? '+' : ''}{((row.vsBaselineDealt - 1) * 100).toFixed(0)}%
										</td>
										<td class="p-1 text-[11px] text-[var(--muted)] max-w-[28ch] truncate" title={row.notes.join(' · ')}>
											{row.notes[0] ?? '—'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		{:else if viewerState.panel === 'loadouts'}
			<div class="grid md:grid-cols-2 gap-2">
				{#each profile.loadouts as l}
					<section class="panel {l.equipped ? 'ring-1 ring-[var(--phosphor)]' : ''}">
						<h3 class="panel-title">{l.name} {#if l.equipped}<span class="text-[var(--phosphor)]">equipped</span>{/if}</h3>
						<div class="text-xs space-y-1 font-mono">
							<div>Weapon: {l.weapon ?? '—'}</div>
							<div>Ability: {l.ability ?? '—'}</div>
							<div>Primary: {l.primaryMod ?? '—'}</div>
							<div>Secondary: {l.secondaryMod ?? '—'}</div>
							<div>Attachments: {l.attachment0 ?? '—'} / {l.attachment1 ?? '—'}</div>
							<div>Suit: {l.suit ?? '—'}</div>
							<div>Cosmetic: {l.cosmetic ?? '—'}</div>
						</div>
					</section>
				{:else}
					<p class="text-[var(--muted)] text-sm">No loadout presets in this file (markdown reports omit them).</p>
				{/each}
			</div>
			{#if profile.lastBossVariant.length}
				<section class="panel mt-3">
					<h3 class="panel-title">Last boss variant by area</h3>
					{#each profile.lastBossVariant as b}
						<div class="text-xs font-mono py-0.5">{b.area}: {b.variant}</div>
					{/each}
				</section>
			{/if}
		{:else if viewerState.panel === 'collection'}
			<div class="flex flex-wrap gap-2 mb-2">
				<select bind:value={viewerState.colCat} class="ctl">
					<option value="all">All categories</option>
					{#each colCats as c}<option value={c}>{c}</option>{/each}
				</select>
				<span class="text-[10px] font-mono text-[var(--muted)] self-center">
					{profile.collection.filter((c) => c.state === 'unlocked').length} unlocked ·
					{profile.collection.filter((c) => c.state === 'discovered').length} seen ·
					{profile.collection.filter((c) => c.state === 'unknown').length} missing from catalog
				</span>
			</div>
			<div class="border border-[var(--contour)] overflow-auto max-h-[280px] mb-3">
				<table class="w-full text-xs">
					<thead>
						<tr class="text-[var(--muted)] font-mono uppercase text-[10px]">
							<th class="p-2 text-left">Item</th>
							<th class="p-2 text-left">Category</th>
							<th class="p-2 text-left">State</th>
						</tr>
					</thead>
					<tbody>
						{#each collectionRows as item}
							<tr class="border-t border-[var(--contour)]">
								<td class="p-2">{item.name}</td>
								<td class="p-2 text-[var(--muted)]">{item.category}</td>
								<td class="p-2 font-mono {item.state === 'unlocked' ? 'text-[var(--phosphor)]' : item.state === 'unknown' ? 'text-[var(--coral)]' : 'text-[var(--brass)]'}">{item.state}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<section class="panel mb-3">
				<h3 class="panel-title">Cosmetics ({profile.cosmetics.length})</h3>
				<div class="flex flex-wrap gap-1">
					{#each profile.cosmetics as c}<span class="tag">{c}</span>{:else}<span class="text-[var(--muted)] text-xs">None in CosmeticPAs</span>{/each}
				</div>
			</section>
			<section class="panel">
				<h3 class="panel-title">Blessings seen, by god</h3>
				{#each blessingGroups as [god, items]}
					<div class="mb-2">
						<div class="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">{god}</div>
						<div class="flex flex-wrap gap-1">
							{#each items as m}
								<span class="tag">{m.name}</span>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-xs text-[var(--muted)]">No god-tagged mutators in this file.</p>
				{/each}
			</section>
		{/if}
	{/if}
</main>

<style>
	.panel {
		background: rgba(15, 43, 54, 0.72);
		border: 1px solid var(--contour);
		padding: 12px;
	}
	.panel-title {
		font-size: 11px;
		font-family: ui-monospace, monospace;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
		margin-bottom: 8px;
	}
	.label {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		text-transform: uppercase;
		color: var(--muted);
	}
	.val {
		font-family: ui-monospace, monospace;
		font-size: 1.25rem;
		color: var(--phosphor);
	}
	.val.them {
		font-size: 1rem;
		color: var(--brass);
	}
	.tag {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		border: 1px solid var(--contour);
		padding: 2px 6px;
	}
	.btn-ghost {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		text-transform: uppercase;
		border: 1px solid var(--contour);
		color: var(--phosphor);
		padding: 4px 8px;
	}
	.btn-ghost:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.ctl {
		background: rgba(8, 24, 31, 0.75);
		border: 1px solid var(--contour);
		color: var(--cream);
		padding: 4px 8px;
	}
	.chip {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		border: 1px solid var(--contour);
		padding: 4px 8px;
		text-transform: uppercase;
		color: var(--muted);
	}
	.chip.on {
		border-color: var(--phosphor);
		color: var(--phosphor);
	}
	.bar {
		height: 6px;
		background: rgba(28, 72, 89, 0.65);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		background: var(--phosphor);
	}
</style>
