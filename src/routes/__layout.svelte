<script>
	import Navbar from '$lib/Navbar.svelte';
	import Footer from '$lib/Footer.svelte';
</script>

<Navbar />

<main class="container flex flex-col items-center p-4 m-auto">
	<slot />
</main>

<Footer />

<style windi:preflights:global windi:safelist:global>
</style>
