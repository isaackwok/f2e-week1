<script>
	import Dropdown from '$lib/Dropdown.svelte';
	import SearchBar from '$lib/SearchBar.svelte';
	import Button from '$lib/Button.svelte';

	const items = [
		{ label: '探索景點', value: 'place' },
		{ label: '節慶活動', value: 'event' },
		{ label: '品嚐美食', value: 'food' }
	];
	const value = items[0];
	let query = '';

	const handleSelect = (e) => {
		console.log('selected:', e.detail);
		console.log('query:', query);
	};
</script>

<section class="flex flex-col justify-evenly sm:flex-row w-full justify-around">
	<div class="font-light">
		<div class="text-5xl leading-normal text-center sm:text-left">
			<p>探索<span class="slogan-highlight">台灣之美</span></p>
			<p>讓我們更親近這片土地</p>
		</div>
		<div class="intro text-lg">
			<img src="/map-pin.svg" alt="" class="inline" />
			台灣旅遊景點導覧 Taiwan Travel Guide
		</div>
	</div>

	<div class="grid gap-2 max-w-full sm:w-sm">
		<Dropdown {items} {value} on:select={handleSelect} />
		<SearchBar bind:value={query} placeholder="你想去哪裡？請輸入關鍵字" />
		<Button>
			<i class="fas fa-search" />
			搜尋
		</Button>
	</div>
</section>

<style>
	.slogan-highlight {
		border-bottom: 2px solid #e0da48;
	}
	.intro {
		color: #646464;
		font-family: Noto Sans TC;
	}
</style>
