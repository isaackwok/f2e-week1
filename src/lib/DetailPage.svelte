<script>
	import Carousel from './Carousel.svelte';
	import ExporeMore from './ExporeMore.svelte';
	import Hashtag from './Hashtag.svelte';
	import Header from './Header.svelte';
	import ImageCard from './ImageCard.svelte';
	import ImageCardContainer from './ImageCardContainer.svelte';
	import Title from './Title.svelte';

	export let item;
	export let more = [];
	export let moreHeader = 'More';
	export let moreText = 'More';
	export let category;
	export let categoryZh;
</script>

<!-- Images -->
<section class="flex justify-center w-full mb-4">
	<div class="w-full h-60 sm:h-md">
		<Carousel items={item.images} />
	</div>
</section>

<!-- Information -->
<section class="flex flex-col gap-4 font-light mb-4">
	<Header>{item.title}</Header>
	<div>
		{#each item.tags as tag}
			<Hashtag>{tag}</Hashtag>
		{/each}
	</div>
	<div>
		<Title>{categoryZh}介紹：</Title>
		<p class="text-lg leading-relaxed">{item.description}</p>
	</div>
</section>

<!-- More (Nearby) -->
{#if more.length > 0}
	<section class="w-full">
		<div class="flex justify-between items-center mb-4">
			<Header>{moreHeader}</Header>
			<ExporeMore href="/{category}" color="orange">{moreText}</ExporeMore>
		</div>
		<ImageCardContainer>
			{#each more as recommendation}
				<ImageCard {...recommendation} />
			{/each}
		</ImageCardContainer>
	</section>
{/if}
