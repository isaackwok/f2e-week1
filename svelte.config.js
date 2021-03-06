import { windi } from 'svelte-windicss-preprocess';
import sveltePreprocess from 'svelte-preprocess';
// import adapter from '@sveltejs/adapter-netlify';
import vercel from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */

const config = {
	preprocess: [sveltePreprocess(), windi({})],
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
    adapter: vercel()
	}
};

export default config;
