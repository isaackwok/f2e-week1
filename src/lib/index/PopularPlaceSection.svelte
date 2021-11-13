<script>
	import ImageCard from '$lib/ImageCard.svelte';
	import ImageCardContainer from '$lib/ImageCardContainer.svelte';
	import ExploreMore from '../ExploreMore.svelte';
	import Header from '../Header.svelte';

	export let items = [];

	$: top4Items = items.slice(0, 4);
</script>

<section class="w-full">
	<div class="flex justify-between items-center mb-4">
		<Header>熱門打卡景點</Header>
		<ExploreMore href="/place" color="orange">查看更多景點</ExploreMore>
	</div>
	<ImageCardContainer>
		{#each top4Items as place}
			<ImageCard
				href={`/place/${place.id}`}
				src={place.src}
				title={place.name}
				location={place.city}
			/>
		{/each}
	</ImageCardContainer>
</section>
