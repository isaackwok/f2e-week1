<script>
	import { slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	export let items = [];
	let currentIndex = 0;

	// $: console.log(currentIndex);

	const handleSlide = (n) => {
		const newIndex = currentIndex + n;
		if (newIndex >= items.length) currentIndex = 0;
		else if (newIndex < 0) currentIndex = items.length - 1;
		else currentIndex = newIndex;
	};
</script>

<div class="relative overflow-hidden w-full h-full rounded-xl">
	<!-- Slides -->
	{#each items as item, idx}
		{#if idx === currentIndex}
			<a href={item.href} transition:slide={{ easing: sineInOut }} class="relative flex w-full h-full rounded-xl">
				<p
					class="absolute self-center w-full text-center text-white text-shadow-xl text-xl sm:text-3xl"
				>
					{item.label}
				</p>
				<img
					class="object-cover object-center w-full h-full"
					src={item.src || '/picture-holder.png'}
					alt=""
				/>
			</a>
		{/if}
	{/each}

	<!-- Dots -->
	<div class="absolute right-4 bottom-2 flex">
		{#each items as item, idx}
			<div
				class:bg-opacity-40={idx !== currentIndex}
				class="m-1 bg-white shadow rounded-full h-2 w-2 sm:h-4 sm:w-4"
			/>
		{/each}
	</div>

	<!-- Indicators-->
	<div class="absolute flex items-center justify-between inset-y-0 left-0 px-4">
		<div class="indicator" on:click={() => handleSlide(-1)}>
			<i class="fas fa-chevron-left" />
		</div>
	</div>
	<div class="absolute flex items-center justify-between inset-y-0 right-0 px-4">
		<div class="indicator" on:click={() => handleSlide(1)}>
			<i class="fas fa-chevron-right" />
		</div>
	</div>
</div>

<style>
	.indicator {
		@apply flex items-center justify-center border-2 rounded-full text-white shadow-lg h-8 w-8 sm:h-12 sm:w-12 p-1 cursor-pointer;
	}
</style>
