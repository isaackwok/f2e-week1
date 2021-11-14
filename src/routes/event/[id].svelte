<script context="module">
	import axios from 'axios';
  import dayjs from 'dayjs';

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
		description: event.Description,
    details: [
      {key: '活動時間', value: `${dayjs(event.StartTime).locale('Asia/Taipei').format('YYYY/MM/DD hh:mm')} - ${dayjs(event.EndTime).format('YYYY/MM/DD hh:mm')}`},
      {key: '聯絡電話', value: event.Phone},
      {key: '主辦單位', value: event.Organizer},
      {key: '活動地點', value: event.Address, href: `https://www.google.com/maps/search/${event.Address}`},
      {key: '官方網站', value: event.WebsiteUrl, href: event.WebsiteUrl},
      {key: '活動費用', value: event.Charge},
      {key: '注意事項', value: event.Remarks},
    ],
    address: event.Address
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
