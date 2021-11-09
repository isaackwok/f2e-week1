<script>
</script>

<button class="block px-4 py-2 rounded text-center cursor-pointer" on:click>
	<slot />
</button>

<style lang="scss">
	button {
		background: #7f977b;
		color: white;
		&:hover {
			background: #6e7d60;
		}
	}
</style>
