<script>
	import HeroSection from '$lib/index/HeroSection.svelte';
	import { onMount } from 'svelte';
	import axios from 'axios';
	import FeatureSection from '$lib/index/FeatureSection.svelte';
import RecentEventSection from '$lib/index/RecentEventSection.svelte';

	let places;

	$: featureSpots =
		places &&
		places.map((place, i) => ({
			id: place.ID,
			label: `${place.Address.slice(0, 3)} | ${place.Name}`,
      href: `/place/${place.ID}`,
			src: place.Picture?.PictureUrl1 || null
		}));

	onMount(async () => {
		const results = await axios.get('/ScenicSpot',{
      params: {
        $top: 6,
        $select: 'ID,Address,Picture,Name',
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
  <RecentEventSection />
</div>
