<script>
	import ImageCard from '$lib/ImageCard.svelte';
	import ExporeMore from '../ExporeMore.svelte';
	import Header from '../Header.svelte';

	export let items = [];

	$: top4Items = items.slice(0, 4);
</script>

<section>
	<div class="flex w-full justify-between items-center mb-4">
		<Header>熱門打卡景點</Header>
		<ExporeMore href="/place">查看更多景點</ExporeMore>
	</div>
	<div class="flex justify-between">
		{#each top4Items as place}
			<ImageCard
				href={`/place/${place.id}`}
				src={place.src}
				title={place.name}
				location={place.city}
			/>
		{/each}
	</div>
</section>
