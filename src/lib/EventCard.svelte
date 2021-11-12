<script>
	import LocationMarker from './LocationMarker.svelte';
	import Title from './Title.svelte';
	import ExporeMore from './ExporeMore.svelte';

	export let src, date, title, location, href;
</script>

<div class="flex">
	<div class="min-h-40 min-w-40 overflow-hidden border rounded-l-xl">
		<img src={src || '/picture-holder.png'} alt={title} class="h-40 w-40 rounded-l-xl object-cover object-center" />
	</div>
	<div class="flex-1 flex flex-col justify-between py-4 px-8 bg-gray-100 w-full h-full border rounded-r-xl">
    <div class="flex flex-col gap-2 whitespace-wrap">
      <p class="date font-light">{date}</p>
      <Title truncate={false}>{title}</Title>
    </div>
    <div class="flex justify-between w-full">
      <LocationMarker>{location}</LocationMarker>
      <ExporeMore {href} color="green">詳細介紹</ExporeMore>
    </div>
	</div>
</div>

<style>
	.date {
		color: #646464;
	}
</style>
