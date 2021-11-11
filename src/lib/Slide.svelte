<script>
	import { Slidy } from 'svelte-slidy';

	export let items = [];
	let index;
	let init = false;
	$: init && (index = 0);

	$: console.log(items);
	$: options = {
		slides: items, // new name "slides" for arr yours slides elements in 2.0
		wrap: {
			id: 'slidy', // customize this instance Slidy by #id
			width: '100%',
			height: '50%',
			padding: '0',
			align: 'middle',
			alignmargin: 50
		},
		slide: {
			gap: 50,
			class: '', // classname for styling slide
			width: '50%',
			height: '100%',
			backimg: true, // if true image on background slidewrap & slot for content empty
			imgsrckey: 'src', // prop for ypurs image src key
			objectfit: 'cover', // new in 2.3.0
			overflow: 'hidden' // new in 2.4.1
		},
		controls: {
			dots: true,
			dotsnum: true,
			dotsarrow: true,
			dotspure: false, // dotnav like realy dots :)
			arrows: true,
			keys: true, // nav by arrow keys
			drag: true, // nav by mousedrag
			wheel: true // nav by mousewheel (shift + wheel) or swipe on touch/trackpads
		},
		options: {
			axis: 'x', // new in 2.2.0 axis direction
			loop: false, // new in 2.3.0 loop/no options
			duration: 550 // duration slides animation
		}
	};
</script>

<Slidy {...options} bind:index bind:init />
