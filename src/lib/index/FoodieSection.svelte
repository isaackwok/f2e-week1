<script>
	import ImageCard from '$lib/ImageCard.svelte';
	import ImageCardContainer from '$lib/ImageCardContainer.svelte';
	import ExploreMore from '../ExploreMore.svelte';
	import Header from '../Header.svelte';

	export let items = [];
</script>

<section class="w-full">
	<div class="flex justify-between items-center mb-4">
		<Header>一再回訪美食</Header>
		<ExploreMore href="/food" color="orange">查看更多美食</ExploreMore>
	</div>
	<ImageCardContainer>
		{#each items as place}
			<ImageCard
				href={`/food/${place.id}`}
				src={place.src}
				title={place.name}
				location={place.city}
			/>
		{/each}
	</ImageCardContainer>
</section>
