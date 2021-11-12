<script>
  export let truncate = true;
</script>

<div class="title font-bold text-xl" class:truncate>
  <slot />
</div>

<style>
  div {
    color: #2F2F2F;
  }
</style>