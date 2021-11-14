<script context="module">
	import axios from 'axios';

	export async function load({ page }) {
		const id = page.params.id;
		const result = await axios.get('/ScenicSpot', {
			params: {
				$filter: `ID eq '${id}'`
			}
		});

		const place = result.data.pop();

		const nearby = await axios
			.get('/ScenicSpot', {
				params: {
					$top: 4,
					$filter: `ID ne '${id}' and Picture/PictureUrl1 ne null`,
					$spatialFilter: `nearby(${place.Position?.PositionLat}, ${place.Position?.PositionLon}, 10000)`
				}
			})
			.then((res) => res.data);

		if (result.status === 200) {
			return {
				props: {
					place,
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

	export let place;
	export let nearby = [];

	const category = 'place';
	const categoryZh = '景點';

	$: city = place.Address.slice(0, 3);

	$: item = {
		images: [
			{ src: place.Picture?.PictureUrl1 },
			{ src: place.Picture?.PictureUrl2 },
			{ src: place.Picture?.PictureUrl3 }
		].filter((item) => !!item.src),
		title: place.Name,
		tags: [place.Class1, place.Class2, place.Class3].filter((item) => !!item),
		description: place.Description || '' + place.DescriptionDetail || '',
    details: [
      {key: '開放時間', value: place.OpenTime},
      {key: '服務電話', value: place.Phone},
      {key: '景點地址', value: place.Address, href: `https://www.google.com/maps/search/${place.Address}`},
      {key: '官方網站', value: place.WebsiteUrl},
      {key: '票價資訊', value: place.TicketInfo},
      {key: '注意事項', value: place.Remarks},
    ],
    address: place.Address
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
