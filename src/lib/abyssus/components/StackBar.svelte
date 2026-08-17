<script lang="ts">
	import { damageMixPercent } from '$lib/abyssus/stats';

	interface Props {
		slices: ReturnType<typeof damageMixPercent>;
		width?: number;
		height?: number;
	}

	let { slices, width = 280, height = 14 }: Props = $props();

	const total = $derived(slices.reduce((a, s) => a + s.pct, 0) || 1);
</script>

<svg {width} {height} role="img" aria-label="Damage composition bar">
	{#each slices as s, i (s.label + i)}
		{@const x = slices.slice(0, i).reduce((a, c) => a + (c.pct / total) * width, 0)}
		{@const w = Math.max(1, (s.pct / total) * width)}
		<rect {x} y="0" width={w} height={height} fill={s.color}>
			<title>{s.label}: {s.pct.toFixed(1)}%</title>
		</rect>
	{/each}
</svg>
