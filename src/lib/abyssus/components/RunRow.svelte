<script lang="ts">
	import type { RunRecord } from '$lib/abyssus/types';
	import { fmtNum, fmtPct } from '$lib/abyssus/pretty';

	interface Props {
		run: RunRecord;
		selected?: boolean;
		onselect?: () => void;
	}

	let { run, selected = false, onselect }: Props = $props();
</script>

<button
	type="button"
	class="run-row w-full text-left px-3 py-2 border-b border-[var(--contour)] hover:bg-[rgba(28,72,89,0.35)] focus:outline focus:outline-2 focus:outline-[var(--phosphor)] {selected
		? 'bg-[rgba(28,72,89,0.45)] border-l-2 border-l-[var(--phosphor)]'
		: ''}"
	onclick={onselect}
>
	<div class="grid grid-cols-[2rem_1fr_auto] gap-2 items-center">
		<span class="font-serif text-lg text-[var(--muted)] tabular-nums">{run.index + 1}</span>
		<div class="min-w-0">
			<div class="truncate">
				<span class={run.win ? 'text-[var(--phosphor)]' : 'text-[var(--coral)]'}>
					{run.win ? 'WIN' : 'LOSS'}
				</span>
				· {run.weapon}
				{#if run.ability}<span class="text-[var(--muted)]"> / {run.ability}</span>{/if}
			</div>
			<div class="text-[11px] text-[var(--muted)] font-mono truncate">
				L{run.loop} · {run.killedBy ?? 'survived'} · {fmtPct(run.acc, 0)} acc
			</div>
		</div>
		<div class="text-right font-mono text-xs tabular-nums shrink-0">
			<div class="text-[var(--phosphor)]">{fmtNum(Math.round(run.dealt))}</div>
			<div class="text-[var(--coral)]">{fmtNum(run.kills)} k</div>
		</div>
	</div>
</button>
