<script>
	import HeroSection from '$lib/index/HeroSection.svelte';
	import { onMount } from 'svelte';
	import axios from 'axios';
	import FeatureSection from '$lib/index/FeatureSection.svelte';
	import RecentEventSection from '$lib/index/RecentEventSection.svelte';
	import PopularPlaceSection from '$lib/index/PopularPlaceSection.svelte';
	import FoodieSection from '$lib/index/FoodieSection.svelte';

	let places, foods, events;

	$: featureSpots =
		places &&
		places.map((place) => ({
			id: place.ID,
			city: place.Address.slice(0, 3),
			name: place.Name,
			label: place.City || `${place.Address.slice(0, 3)} | ${place.Name}`,
			href: `/place/${place.ID}`,
			src: place.Picture?.PictureUrl1 || null
		}));

	$: foodie =
		foods &&
		foods.map((place) => ({
			id: place.ID,
			city: place.Address.slice(0, 3),
			name: place.Name,
			label: place.City || `${place.Address.slice(0, 3)} | ${place.Name}`,
			href: `/place/${place.ID}`,
			src: place.Picture?.PictureUrl1 || null
		}));

	$: recentEvents =
		events &&
		events.map((event) => ({
			id: event.ID,
			city: event.Address?.slice(0, 3) || event.Location?.slice(0, 3),
			name: event.Name,
      date: `${event.StartTime.split('T')[0]} - ${event.EndTime.split('T')[0]}`,
			label: event.City || event.Address?.slice(0, 3) || `${event.Location.slice(0, 3)} | ${event.Name}`,
			href: `/event/${event.ID}`,
			src: event.Picture?.PictureUrl1 || null
		}));

	onMount(() => {
		// 熱門景點
		axios
			.get('/ScenicSpot', {
				params: {
					$top: 6,
					$select: 'ID,Address,Picture,Name,City',
					$format: 'JSON',
					$orderby: 'UpdateTime'
				}
			})
			.then((res) => {
				places = res.data;
			});

		// 美食
		axios
			.get('/Restaurant', {
				params: {
					$top: 4,
					$select: 'ID,Address,Picture,Name',
					$format: 'JSON',
				}
			})
			.then((res) => {
				foods = res.data;
			});

		// 活動
		axios
			.get('/Activity', {
				params: {
					$top: 4,
					$select: 'ID,Address,Location,Picture,Name,StartTime,EndTime',
					$format: 'JSON',
				}
			})
			.then((res) => {
				events = res.data;
			});
	});
</script>

<div class="grid grid-cols-1 gap-16 w-full">
	<HeroSection />
	<FeatureSection items={featureSpots} />
	<RecentEventSection items={recentEvents}/>
	<PopularPlaceSection items={featureSpots} />
	<FoodieSection items={foodie} />
</div>
