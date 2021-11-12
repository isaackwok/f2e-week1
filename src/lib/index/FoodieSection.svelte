<script>
	import ImageCard from '$lib/ImageCard.svelte';
	import ImageCardContainer from '$lib/ImageCardContainer.svelte';
	import ExporeMore from '../ExporeMore.svelte';
	import Header from '../Header.svelte';

	export let items = [];
</script>

<section>
	<div class="flex justify-between items-center mb-4">
		<Header>一再回訪美食</Header>
		<ExporeMore href="/food">查看更多美食</ExporeMore>
	</div>
	<ImageCardContainer>
		{#each items as place}
			<ImageCard
				href={`/place/${place.id}`}
				src={place.src}
				title={place.name}
				location={place.city}
			/>
		{/each}
	</ImageCardContainer>
</section>
