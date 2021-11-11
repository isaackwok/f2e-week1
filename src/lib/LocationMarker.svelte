<script>
	import { add_flush_callback } from 'svelte/internal';
</script>

<div class="location-marker flex items-center leading-relaxed ">
	<img src="/map-marker.svg" alt="" class="mr-2" />
	<slot />
</div>

<style>
	div {
		color: #646464;
	}
</style>
