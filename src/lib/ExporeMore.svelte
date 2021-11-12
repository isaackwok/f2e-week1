<script>
	export let href, color;
</script>

<a {href} class="font-light {color}">
	<slot /> <i class="fas fa-chevron-right" />
</a>

<style>
	a.orange {
		color: #ff725e;
	}
  a.green {
    color: #7F977B;
  }
</style>
