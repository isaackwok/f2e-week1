<script>
	const links = [
		{ text: '探索景點', href: '/place' },
		{ text: '節慶活動', href: '/event' },
		{ text: '品嚐美食', href: '/food' }
	];
</script>

<nav class="flex justify-center p-4 border-b">
	<div class="container flex justify-between">
		<a href="/">
			<img src="/logo-desktop.svg" alt="台灣走走．Tai Walk" />
		</a>
		<div class="flex">
			{#each links as link (link.text)}
				<a class="flex items-center mx-2" href={link.href}>
					<span>
						{link.text}
					</span>
				</a>
			{/each}
		</div>
	</div>
</nav>

<style lang="scss">
	a {
		color: #646464;

		&:hover {
			color: #7f977b;
		}
	}
</style>
