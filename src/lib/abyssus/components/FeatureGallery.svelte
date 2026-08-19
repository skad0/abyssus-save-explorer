<script lang="ts">
	const shots = [
		{
			src: '/steam/03-profile-compare.png',
			title: 'You vs them',
			blurb: 'Drop a second save. Profile numbers stack phosphor (you) over brass (them).'
		},
		{
			src: '/steam/04-stats-compare.png',
			title: 'Cross-stats',
			blurb: 'Weapon and ability tables grow Them columns. Damage mix sits side by side.'
		},
		{
			src: '/steam/02-runs-compare.png',
			title: 'Party this dive',
			blurb: 'Co-op partners, damage share, loadout. Pin one of their dives next to yours.'
		},
		{
			src: '/steam/05-fissures.png',
			title: 'Fissures',
			blurb: 'Hidden coins found vs missing, by biome.'
		}
	] as const;
</script>

<section class="mt-8" aria-label="Features">
	<h2 class="text-lg font-serif mb-1">What you get</h2>
	<p class="text-[var(--muted)] text-sm mb-4 max-w-xl">
		Run history, party splits, collection, and a second-save compare. Parsed in the browser — nothing
		is uploaded.
	</p>
	<div class="grid md:grid-cols-2 gap-4">
		{#each shots as shot (shot.src)}
			<figure class="shot">
				<img src={shot.src} alt={shot.title} />
				<figcaption>
					<h3>{shot.title}</h3>
					<p>{shot.blurb}</p>
				</figcaption>
			</figure>
		{/each}
	</div>
</section>

<style>
	.shot {
		margin: 0;
		border: 1px solid var(--contour);
		background: rgba(15, 43, 54, 0.72);
		overflow: hidden;
	}
	.shot img {
		display: block;
		width: 100%;
		height: auto;
		border-bottom: 1px solid var(--contour);
	}
	figcaption {
		padding: 12px;
	}
	figcaption h3 {
		font-size: 11px;
		font-family: ui-monospace, monospace;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--phosphor);
		margin: 0 0 4px;
	}
	figcaption p {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
</style>
