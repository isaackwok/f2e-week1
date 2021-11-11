<script>
	import Carousel from '$lib/Carousel.svelte';
  export let featureSpots = [];
</script>

<section class="flex justify-center">
	<div class="w-5xl h-60 sm:h-md">
		<Carousel items={featureSpots} />
	</div>
</section>
