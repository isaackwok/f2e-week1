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

<div class="flex flex-col">
	<Dropdown {items} {value} on:select={handleSelect} />
	<SearchBar bind:value={query} placeholder="想找有趣的？請輸入關鍵字" />
	<Button bind:value={query} placeholder="想找有趣的？請輸入關鍵字"><i class="fas fa-search mr-2"></i>搜 尋</Button>
</div>
