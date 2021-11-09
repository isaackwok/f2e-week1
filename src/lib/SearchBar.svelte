<script>
	export let placeholder = '搜尋 ...';
  export let value = '';
</script>

<input bind:value type="text" class="px-4 py-2 rounded border outline-none" {placeholder} />

<style lang="scss">
	input {
		background: #f9f9f9;
		color: #2f2f2f;

		&:focus {
      border: 1px solid #6e7d60;
		}
	}
</style>
