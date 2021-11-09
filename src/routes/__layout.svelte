<script>
	import Navbar from '$lib/Navbar.svelte';
</script>

<Navbar />

<main class="container flex flex-col items-center p-4 m-auto">
	<slot />
</main>

<style windi:preflights:global windi:safelist:global>
</style>
