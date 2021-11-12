<script context="module">
	import axios from 'axios';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ page, fetch, session, stuff }) {
		const id = page.params.id;
		const result = await axios.get('/Restaurant', {
				params: {
					$filter: `ID eq '${id}'`
				}
			})

		if (result.status === 200) {
			return {
				props: {
					restaurant: result.data.pop()
				}
			};
		}

		return {
			status: result.status,
			error: new Error(`Could not load ${id}`)
		};
	}
</script>

<script>
import DetailPage from "$lib/DetailPage.svelte";

	export let restaurant;
</script>

<DetailPage />