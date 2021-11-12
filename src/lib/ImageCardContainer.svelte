<div class="flex justify-start md:justify-between gap-4 overflow-x-scroll hide-scrollbar">
	<slot />
</div>

<style>
	.hide-scrollbar {
		/*FireFox*/
		scrollbar-width: none;
		/*IE10+*/
		-ms-overflow-style: -ms-autohiding-scrollbar;
	}
	.hide-scrollbar::-webkit-scrollbar {
		/*Chrome, Safari, Edge*/
		display: none;
	}
</style>
