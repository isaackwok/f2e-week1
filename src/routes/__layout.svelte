<script>
	import Navbar from '$lib/Navbar.svelte';
	import Footer from '$lib/Footer.svelte';
	import axios from 'axios';
	import jsSHA from 'jssha';

	const getAuthorizationHeader = function () {
		var AppID = '947333329b9a4c99adc478a8c12c3aa3';
		var AppKey = 'Fuzve_DoP8ReM3KD_-12cYjq8_8';

		var GMTString = new Date().toGMTString();
		var ShaObj = new jsSHA('SHA-1', 'TEXT');
		ShaObj.setHMACKey(AppKey, 'TEXT');
		ShaObj.update('x-date: ' + GMTString);
		var HMAC = ShaObj.getHMAC('B64');
		var Authorization = `hmac username="${AppID}", algorithm="hmac-sha1", headers="x-date", signature="${HMAC}"`;

		return { Authorization: Authorization, 'X-Date': GMTString };
	};

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

<main class="relative container flex flex-col items-center px-4 py-4 sm:py-16 mx-auto lg:max-w-3/5">
	<slot />
</main>

<Footer />

<style windi:preflights:global windi:safelist:global>
</style>
