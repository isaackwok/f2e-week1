<script>
	import EventCard from '$lib/EventCard.svelte';
	import ExporeMore from '../ExporeMore.svelte';
	import Header from '../Header.svelte';

	export let items = [];
</script>

<section>
	<div class="flex w-full justify-between items-center mb-4">
		<Header>近期活動</Header>
		<ExporeMore href="/place" color="orange">查看更多活動</ExporeMore>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		{#each items as event}
			<EventCard
				src={event.src}
				date={event.date}
				title={event.name}
				location={event.city}
        href={`/event/${event.id}`}
			/>
		{/each}
	</div>
</section>
