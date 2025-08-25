<script lang="ts">
  import { fetchPnl } from '$lib/api';

  let userAddress = '';
  let pnl: any[] = [];
  let isLoading = false;
  let error: string | null = null;

  async function loadPnl() {
    isLoading = true;
    error = null;
    try {
      pnl = await fetchPnl(userAddress);
    } catch (e: any) {
      error = e.message;
      pnl = [];
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="max-w-screen-2xl mx-auto p-8">
  <h1 class="text-4xl font-bold mb-6 text-center">PnL Chart</h1>

  <form class="flex items-center gap-2 mb-8 max-w-3xl mx-auto" on:submit|preventDefault={loadPnl}>
    <input
      class="w-full bg-sky-100 border border-slate-700 rounded-md px-4 py-2 text-lg focus:ring-2 focus:ring-sky-500 outline-none"
      type="text"
      placeholder="Enter EVM address..."
      bind:value={userAddress}
    />
    <button
      class="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md px-6 py-2 text-lg shrink-0"
      type="submit"
    >
      Load
    </button>
  </form>

  {#if isLoading}
    <p class="text-lg text-slate-400 text-center">Loading PnL data...</p>
  {:else if error}
    <p class="text-lg text-red-500 text-center">Error: {error}</p>
  {:else if pnl.length > 0}
    <pre class="bg-slate-900 text-slate-100 p-4 rounded-md overflow-auto">{JSON.stringify(pnl, null, 2)}</pre>
  {/if}
</main>
