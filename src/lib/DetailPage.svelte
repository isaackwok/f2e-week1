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

<!-- Details & Map -->
<section
	class="grid grid-cols-1 sm:grid-cols-2 bg-gray-100 sm:bg-transparent w-screen sm:w-full p-4 sm:p-0 mb-4 rounded-xl gap-4"
>
	<!-- Details -->
	<div class="flex flex-col w-full sm:bg-gray-100 sm:p-4 rounded-xl gap-4 place-self-start">
		{#each item.details as { key, value, href }}
			{#if value}
				<div class="flex items-start gap-2 overflow-hidden">
					<span class="font-bold whitespace-nowrap">{key}: </span>
					{#if href}
						<a {href} class="url font-light" target="_blank">{value}</a>
					{:else}
						<span class="font-light">{value}</span>
					{/if}
				</div>
			{/if}
		{/each}
	</div>

  <!-- Google Map -->
	<div class="w-full overflow-hidden rounded-xl">
    <a href={`https://www.google.com/maps/search/${item.address}`} target="_blank">
      <img
			src={`https://maps.googleapis.com/maps/api/staticmap?center=${item.address}&zoom=17&size=540x250&scale=2&markers=color:red|${item.address}&key=AIzaSyBH6yrrrzTxMJidGPfgtjSzSJVqpGdG9pA`}
			alt=""
			class="object-cover object-center h-full w-full"
      />
    </a>
	</div>
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

<style>
	.url {
		color: #6e7d60;
		text-decoration: underline;
	}
</style>
