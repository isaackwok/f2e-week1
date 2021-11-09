<script>
	import Select from 'svelte-select';

	export let items = [];
	export let value = null;
</script>

<div class="themed-svelte-select">
	<Select isClearable={false} {items} {value} showIndicator on:select />
</div>

<style lang="scss">
	.themed-svelte-select {
		--itemColor: #2f2f2f;
		--indicatorColor: #737373;
		--borderFocusColor: #6e7d60;
    --itemIsActiveBG: var(--borderFocusColor);
    --indicatorTop: 8px;
    --itemHoverBG:  #6e7d6028;
    --padding: 1rem 8rem 1rem 1rem;
    color: var(--borderFocusColor);
	}
</style>
