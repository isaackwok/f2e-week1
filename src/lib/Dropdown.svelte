<script>
	import Select from 'svelte-select';

	export let items = [];
	export let value = null;
</script>

<div class="themed-svelte-select flex flex-col justify-end">
	<Select isClearable={false} {items} {value} showIndicator on:select />
</div>

<style lang="scss">
	.themed-svelte-select {
		--itemColor: #2f2f2f;
		--indicatorColor: #737373;
		--borderFocusColor: #6e7d60;
		--itemIsActiveBG: var(--borderFocusColor);
		--indicatorTop: 10px;
		--itemHoverBG: #6e7d6028;
		--padding: 1.5rem 1rem;
		color: var(--borderFocusColor);
	}
</style>
