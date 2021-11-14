<script context="module">
	import axios from 'axios';
	import dayjs from 'dayjs';
	import tz from 'dayjs/plugin/timezone.js';
	import utc from 'dayjs/plugin/utc.js';
	import getAuthorizationHeader from '../api/getAuthHeader';

	axios.defaults.baseURL = 'https://ptx.transportdata.tw/MOTC/v2/Tourism';
	axios.interceptors.request.use((config) => {
		config.headers = getAuthorizationHeader();
		return config;
	});
	dayjs.extend(utc);
	dayjs.extend(tz);
	dayjs.tz.setDefault('Asia/Taipei');
</script>

<script>
	import Navbar from '$lib/Navbar.svelte';
	import Footer from '$lib/Footer.svelte';
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
