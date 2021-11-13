<script>
	import { toggle_class } from 'svelte/internal';
	import Carousel from './Carousel.svelte';
	import ExploreMore from './ExploreMore.svelte';
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
<section class="flex flex-col gap-4 w-full font-light mb-4">
	<Header>{item.title}</Header>
	<div class="flex gap-2">
		{#each item.tags as tag}
			<Hashtag>{tag}</Hashtag>
		{/each}
	</div>
	{#if item.description}
		<div>
			<Title>{categoryZh}介紹：</Title>
			<p class="text-lg leading-relaxed text-justify">{item.description}</p>
		</div>
	{/if}
</section>

<!-- Details -->
<section class="grid grid-cols-1 sm:grid-cols-2 bg-gray-100 sm:bg-transparent w-screen sm:w-full p-4 mb-4">
  asd
</section>
  
<!-- More (Nearby) -->
{#if more.length > 0}
	<section class="w-full">
		<div class="flex justify-between items-center mb-4">
			<Header>{moreHeader}</Header>
			<ExploreMore href="/{category}" color="orange">{moreText}</ExploreMore>
		</div>
		<ImageCardContainer>
			{#each more as recommendation}
				<ImageCard {...recommendation} />
			{/each}
		</ImageCardContainer>
	</section>
{/if}
