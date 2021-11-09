<script>
</script>

<button on:click>
	<slot />
</button>

<style lang="scss">
	button {
		background: #7f977b;
		color: white;
		@apply block py-2 px-4 rounded text-center cursor-pointer;

		&:hover {
			background: #6e7d60;
		}
	}
</style>
