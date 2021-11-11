<script>
	import LocationMarker from './LocationMarker.svelte';
	import Title from './Title.svelte';

	export let src, title, location, href;
</script>

<a class="flex flex-col h-60 w-65" {href}>
	<div class="h-50 w-65 mb-2 rounded-xl overflow-hidden z-10">
		<img {src} alt="" class="h-50 w-65 rounded-xl" />
	</div>
	<Title>{title}</Title>
	<LocationMarker>{location}</LocationMarker>
</a>

<style lang="scss">
	a:hover {
		& > div > img {
			@apply transition-transform transform duration-500 ease-in-out scale-120;
		}
	}
</style>
