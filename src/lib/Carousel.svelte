<script>
	import { slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	export let items = [];
	let currentIndex = 0;

	$: isFirstSlide = currentIndex === 0;
	$: isLastSlide = currentIndex === items.length - 1;
	// $: console.log(currentIndex);

	const handleSlide = (n) => {
		currentIndex += n;
	};
</script>

<div class="relative overflow-hidden w-full h-full rounded-xl">
	<!-- Slides -->
	{#each items as item, idx}
		{#if idx === currentIndex}
			<div transition:slide={{ easing: sineInOut }} class="relative flex w-full h-full">
				<p class="absolute self-center w-full text-center text-white text-shadow-xl text-3xl">
					{item.label}
				</p>
				<img
					class="object-cover object-center w-full h-full"
					src={item.src || '/picture-holder.png'}
					alt=""
				/>
			</div>
		{/if}
	{/each}

	<!-- Dots -->
	<div class="absolute right-4 bottom-2 flex">
		{#each items as item, idx}
			<div
				class:bg-opacity-40={idx !== currentIndex}
				class="m-1 bg-white shadow rounded-full h-4 w-4"
			/>
		{/each}
	</div>

	<!-- Indicators-->
	<div class="absolute flex items-center justify-between inset-0 px-4">
		<div class:invisible={isFirstSlide} class="indicator" on:click={() => handleSlide(-1)}>
			<i class="fas fa-chevron-left" />
		</div>
		<div class:invisible={isLastSlide} class="indicator" on:click={() => handleSlide(1)}>
			<i class="fas fa-chevron-right" />
		</div>
	</div>
</div>

<style>
	.indicator {
		@apply flex items-center justify-center text-2xl rounded-full text-white bg-black bg-opacity-40 h-12 w-12 p-1 cursor-pointer;
	}
</style>
