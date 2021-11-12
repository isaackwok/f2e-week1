<script>
	import LocationMarker from './LocationMarker.svelte';
	import Title from './Title.svelte';
	import ExporeMore from './ExporeMore.svelte';

	export let src, date, title, location, href;
</script>

<div class="flex">
	<div class="min-h-30 min-w-30 sm:min-h-40 sm:min-w-40 overflow-hidden sm:border rounded-l-xl">
		<img
			src={src || '/picture-holder.png'}
			alt={title}
			class="h-30 w-30 sm:h-40 sm:w-40 rounded-xl sm:rounded-r-none sm:rounded-l-xl object-cover object-center"
		/>
	</div>
	<div
		class="flex-1 flex flex-col justify-between sm:py-4 px-4 sm:px-8 w-full h-full sm:bg-gray-100 sm:border rounded-r-xl"
	>
		<div class="flex flex-col gap-2 whitespace-wrap">
			<p class="date font-light text-xs sm:text-base">{date}</p>
      <a {href}>
        <Title truncate={false}>{title}</Title>
      </a>
		</div>
		<div class="flex justify-between w-full text-xs sm:text-base">
			<LocationMarker>{location}</LocationMarker>
			<div class="hidden sm:block">
				<ExporeMore {href} color="green">詳細介紹</ExporeMore>
			</div>
		</div>
	</div>
</div>

<style>
	.date {
		color: #646464;
	}
</style>
