<script>
	import Navbar from '$lib/Navbar.svelte';
	import Footer from '$lib/Footer.svelte';
</script>

<svelte:head>
  <script defer src="/font-awesome/all.js"></script>
</svelte:head>

<Navbar />

<main class="container flex flex-col items-center px-4 py-4 sm:py-16 m-auto">
	<slot />
</main>

<Footer />

<style windi:preflights:global windi:safelist:global>
</style>
