<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="min-h-screen flex flex-col">
  <nav class="bg-slate-800 text-white p-4 flex gap-4">
    <a href="/">Positions</a>
    <a href="/chart">PnL Chart</a>
  </nav>
  <main class="flex-1">
    {@render children()}
  </main>
</div>
