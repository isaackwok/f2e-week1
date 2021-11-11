<script>
	import Carousel from '$lib/Carousel.svelte';
  export let items = [];
</script>

<section class="flex justify-center w-full">
	<div class="w-full h-60 sm:h-md">
		<Carousel {items} />
	</div>
</section>
