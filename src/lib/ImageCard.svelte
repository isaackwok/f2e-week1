<script>
	import LocationMarker from './LocationMarker.svelte';
	import Title from './Title.svelte';

	export let src, title, location, href;
</script>

<a sveltekit:prefetch class="flex flex-col w-65" {href}>
	<div class="min-h-50 min-w-65 mb-2 rounded-xl overflow-hidden z-10">
		<img src={src || '/picture-holder.png'} alt="" class="h-50 w-65 rounded-xl" />
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
