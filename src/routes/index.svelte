<script>
	import HeroSection from '$lib/index/HeroSection.svelte';
	import { onMount } from 'svelte';
	import axios from 'axios';
	import FeatureSection from '$lib/index/FeatureSection.svelte';

	let places;

	$: featureSpots =
		places &&
		places.map((place, i) => ({
			id: i,
			label: `${place.Address.slice(0, 3)} | ${place.Name}`,
			src: place.Picture?.PictureUrl1 || null
		}));

	onMount(async () => {
		const results = await axios.get('/ScenicSpot',{
      params: {
        $top: 6,
        $format: 'JSON',
        $orderby: 'UpdateTime'
      }
    });
		places = results.data;
	});
</script>

<div class="grid grid-cols-1 gap-16">
	<HeroSection />
	<FeatureSection {featureSpots} />
</div>
