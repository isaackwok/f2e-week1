<script context="module">
	import axios from 'axios';

	export async function load({ page }) {
		const id = page.params.id;
		const result = await axios.get('/Activity', {
			params: {
				$filter: `ID eq '${id}'`
			}
		});

		const event = result.data.pop();

		const nearby = await axios
			.get('/Activity', {
				params: {
					$top: 4,
					$filter: `ID ne '${id}' and Picture/PictureUrl1 ne null`,
					$spatialFilter: `nearby(${event.Position?.PositionLat}, ${event.Position?.PositionLon}, 10000)`
				}
			})
			.then((res) => res.data);

		if (result.status === 200) {
			return {
				props: {
					event,
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

	export let event;
	export let nearby = [];

	const category = 'event';
	const categoryZh = '活動';

	$: city = event.Address.slice(0, 3);

	$: item = {
		images: [
			{ src: event.Picture?.PictureUrl1 },
			{ src: event.Picture?.PictureUrl2 },
			{ src: event.Picture?.PictureUrl3 }
		].filter((item) => !!item.src),
		title: event.Name,
		tags: [event.Class1, event.Class2, event.Class3].filter((item) => !!item),
		description: event.Description
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
