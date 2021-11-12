<script context="module">
	import axios from 'axios';

	export async function load({ page }) {
		const id = page.params.id;
		const result = await axios.get('/Restaurant', {
			params: {
				$filter: `ID eq '${id}'`
			}
		});

		const restaurant = result.data.pop();

		const nearby = await axios
			.get('/Restaurant', {
				params: {
					$top: 4,
					$filter: `ID ne '${id}'`,
					$spatialFilter: `nearby(${restaurant.Position?.PositionLat}, ${restaurant.Position?.PositionLon}, 5000)`
				}
			})
			.then((res) => res.data);

		if (result.status === 200) {
			return {
				props: {
					restaurant,
					nearby
				}
			};
		}

		return {
			status: result.status,
			error: new Error(`Could not load ${id}`)
		};
	}
</script>

<script>
	import DetailPage from '$lib/DetailPage.svelte';

	export let restaurant;
	export let nearby = [];

	const category = 'food';
	const categoryZh = '美食';

	$: city = restaurant.Address.slice(0, 3);

	$: item = {
		images: [
			{ src: restaurant.Picture?.PictureUrl1},
			{ src: restaurant.Picture?.PictureUrl2},
			{ src: restaurant.Picture?.PictureUrl3}
		].filter((item) => !!item.src),
		title: restaurant.Name,
		tags: [restaurant.Class],
		description: restaurant.Description
	};

	$: more = nearby.map((item) => ({
		href: `/${category}/${item.ID}`,
		src: item.Picture?.PictureUrl1 || null,
		title: item.Name,
		location: item.Address.slice(0, 3)
	}));
</script>

<DetailPage
	{item}
	{category}
	{categoryZh}
	{more}
	moreHeader="還有這些不能錯過的{categoryZh}"
	moreText="查看更多{city}{categoryZh}"
/>
