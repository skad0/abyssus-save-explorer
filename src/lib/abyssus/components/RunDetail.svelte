<script lang="ts">
	import type { AbyssusProfile, RunRecord } from '$lib/abyssus/types';
	import { fmtDur, fmtNum, fmtPct, mutatorLabel } from '$lib/abyssus/pretty';
	import { damageMixPercent, runInsight } from '$lib/abyssus/stats';
	import StackBar from './StackBar.svelte';

	interface Props {
		run: RunRecord;
		profile: AbyssusProfile;
	}

	let { run, profile }: Props = $props();

	const mix = $derived(
		run.breakdown.length
			? damageMixPercent({ ...profile, srcTotals: run.breakdown })
			: []
	);

	const byCategory = $derived.by(() => {
		const map = new Map<(typeof run.mutators)[number]['category'], typeof run.mutators>();
		for (const m of run.mutators) {
			const list = map.get(m.category) ?? [];
			list.push(m);
			map.set(m.category, list);
		}
		return [...map.entries()];
	});

	const insight = $derived(runInsight(run, profile));
</script>

<div class="space-y-3 text-sm">
	<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
		<div><span class="label">Dealt</span><div class="val">{fmtNum(run.dealt)}</div></div>
		<div><span class="label">Taken</span><div class="val text-[var(--coral)]">{fmtNum(run.taken)}</div></div>
		<div><span class="label">Kills</span><div class="val">{fmtNum(run.kills)}</div></div>
		<div><span class="label">Accuracy</span><div class="val">{fmtPct(run.acc)}</div></div>
	</div>

	<section>
		<h4 class="sub-h">Run</h4>
		<div class="kv"><span>Duration</span><span>{fmtDur(run.time)}</span></div>
		<div class="kv"><span>Level / room</span><span>{run.level ?? '—'} / {run.room ?? '—'}</span></div>
		<div class="kv"><span>Loop</span><span>{run.loop}{run.infinite ? ' · infinite' : ''}</span></div>
		<div class="kv"><span>Ended by</span><span>{run.killedBy ?? 'survived'}</span></div>
	</section>

	<section>
		<h4 class="sub-h">Loadout (start of run)</h4>
		<div class="kv"><span>Weapon</span><span>{run.weapon}</span></div>
		<div class="kv"><span>Ability</span><span>{run.ability ?? '—'}</span></div>
		<div class="kv"><span>Primary mod</span><span>{run.modPrimary ?? '—'}</span></div>
		<div class="kv"><span>Secondary mod</span><span>{run.modSecondary ?? '—'}</span></div>
	</section>

	<section>
		<h4 class="sub-h">Combo efficiency</h4>
		<div class="kv"><span>DPS</span><span>{insight.dps == null ? '—' : fmtNum(Math.round(insight.dps))}/s{#if insight.dpsVsAvg} ({insight.dpsVsAvg >= 1 ? '+' : ''}{((insight.dpsVsAvg - 1) * 100).toFixed(0)}% vs your avg){/if}</span></div>
		<div class="kv"><span>Dealt / taken</span><span>{insight.survival.toFixed(1)}×</span></div>
		<div class="kv"><span>Blessing share</span><span>{insight.blessingPct.toFixed(0)}%</span></div>
		<div class="kv"><span>Ability share</span><span>{insight.abilityPct.toFixed(0)}%</span></div>
		{#if insight.comboRank}
			<div class="kv"><span>This pairing vs your other loadouts</span><span>#{insight.comboRank.place} of {insight.comboRank.of} by avg damage</span></div>
		{/if}
		{#if insight.weapon}
			<p class="lore"><b>{insight.weapon.name}.</b> {insight.weapon.blurb} {insight.weapon.mechanic}</p>
		{/if}
		{#if insight.ability}
			<p class="lore"><b>{insight.ability.wikiName}.</b> {insight.ability.blurb}</p>
		{/if}
		{#if insight.harpoonCombo}
			<p class="lore">Harpoon secondary scales with the combo-point bank (wiki: default cap 4). A low-DPS high-damage run can still be a full-bank spend.</p>
		{/if}
		{#each insight.aspects as a (a.god)}
			<p class="lore"><b>{a.wikiName} ({a.god}).</b> {a.mechanic}</p>
		{/each}
		{#if insight.synergies.length}
			<ul class="syn">
				{#each insight.synergies as s (s.id)}
					<li><b>{s.title}.</b> {s.why}</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if mix.length}
		<section>
			<h4 class="sub-h">Damage mix</h4>
			<StackBar slices={mix} width={320} />
			<ul class="mt-1 space-y-0.5 text-xs font-mono">
				{#each mix as s}
					<li class="flex justify-between"><span>{s.label}</span><span>{s.pct.toFixed(1)}%</span></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if byCategory.length}
		<section>
			<h4 class="sub-h">Blessings & mutators ({run.mutators.length})</h4>
			{#each byCategory as [cat, items]}
				<div class="mb-2">
					<div class="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1">{mutatorLabel(cat)}</div>
					<div class="flex flex-wrap gap-1">
						{#each items as m}
							<span class="tag">{m.name}{#if m.rank > 1} ×{m.rank}{/if}</span>
						{/each}
					</div>
				</div>
			{/each}
		</section>
	{/if}

	{#if run.nodes.length}
		<section>
			<h4 class="sub-h">Path ({run.nodes.length} nodes)</h4>
			<div class="flex flex-wrap gap-1">
				{#each run.nodes as n, i}
					<span class="tag">{i + 1}. {n}</span>
				{/each}
			</div>
		</section>
	{/if}

	{#if run.challenges.length}
		<section>
			<h4 class="sub-h">Challenges this run</h4>
			<div class="flex flex-wrap gap-1">
				{#each run.challenges as c}
					<span class="tag">{c}</span>
				{/each}
			</div>
		</section>
	{/if}

	{#if run.enemies.length}
		<section>
			<h4 class="sub-h">Kills this run</h4>
			<div class="flex flex-wrap gap-1">
				{#each run.enemies as e}
					<span class="tag">{e.name} {e.count}</span>
				{/each}
			</div>
		</section>
	{/if}

	{#if run.coop}
		<section>
			<h4 class="sub-h">Co-op partner</h4>
			<div class="kv"><span>{run.coop.player}</span><span>{fmtNum(run.coop.dealt)} dealt</span></div>
		</section>
	{/if}
</div>

<style>
	.label {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.val {
		font-family: ui-monospace, monospace;
		font-size: 1.1rem;
		color: var(--phosphor);
	}
	.sub-h {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--muted);
		border-bottom: 1px solid var(--contour);
		padding-bottom: 4px;
		margin-bottom: 6px;
	}
	.kv {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font-size: 12px;
		padding: 2px 0;
	}
	.kv span:last-child {
		font-family: ui-monospace, monospace;
		color: var(--cream);
	}
	.tag {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		border: 1px solid var(--contour);
		padding: 2px 6px;
	}
	.lore {
		font-size: 12px;
		color: #d9cba8;
		margin: 6px 0 0;
		line-height: 1.4;
	}
	.syn {
		margin: 8px 0 0;
		padding-left: 1.1em;
		font-size: 12px;
		color: var(--cream);
	}
</style>
