<script>
	import Navbar from '$lib/Navbar.svelte';
	import Footer from '$lib/Footer.svelte';
	import axios from 'axios';
	import getAuthorizationHeader from '../api/getAuthHeader';

	axios.defaults.baseURL = 'https://ptx.transportdata.tw/MOTC/v2/Tourism';
	axios.interceptors.request.use((config) => {
		config.headers = getAuthorizationHeader();
		return config;
	});
</script>

<svelte:head>
	<script defer src="/font-awesome/all.js"></script>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<Navbar />

<main class="relative container flex flex-col items-center px-4 py-4 sm:py-16 mx-auto lg:max-w-4/6">
	<slot />
</main>

<Footer />

<style windi:preflights:global windi:safelist:global>
</style>
