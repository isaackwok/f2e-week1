<script>
	export let href;
</script>

<a {href} class="font-light">
	<slot /> <i class="fas fa-chevron-right" />
</a>

<style>
	a {
		color: #ff725e;
	}
</style>
