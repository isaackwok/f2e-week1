<script>
	import EventCard from './EventCard.svelte';
	import ExporeMore from './ExporeMore.svelte';
	import Header from './Header.svelte';
	import ImageCard from './ImageCard.svelte';
	import ImageCardContainer from './ImageCardContainer.svelte';

	export let item = {};
	export let more = [];
</script>

<!-- More Section -->
<section class="w-full">
	<div class="flex justify-between items-center mb-4">
		<Header>熱門打卡景點</Header>
		<ExporeMore href="/place" color="orange">查看更多景點</ExporeMore>
	</div>
	<ImageCardContainer>
		{#each more as recommendation}
			<ImageCard
				href={`/place/${recommendation.id}`}
				src={recommendation.src}
				title={recommendation.name}
				location={recommendation.city}
			/>
		{/each}
	</ImageCardContainer>
</section>
