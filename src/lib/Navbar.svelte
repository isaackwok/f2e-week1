<script>
	import Logo from '$lib/Logo.svelte';
	const links = [
		{ text: '探索景點', href: '/place' },
		{ text: '節慶活動', href: '/event' },
		{ text: '品嚐美食', href: '/food' }
	];
</script>

<nav class="p-4 border-b sticky top-0 bg-white z-60">
	<div class="container flex justify-center sm:justify-between mx-auto lg:max-w-4/6">
		<Logo />
		<div class="hidden sm:flex">
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
