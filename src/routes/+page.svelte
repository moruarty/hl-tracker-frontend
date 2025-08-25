<script lang="ts">
  import { onDestroy } from 'svelte';
  import PositionsTable from './PositionsTable.svelte';
  import { fetchPositions } from '$lib/api';

  let positions: any[] = [];
  let markPrices: Record<string, string> = {};
  let isLoading = false;
  let error: string | null = null;
  let userAddress = '';

  let refreshIntervalId: any = null;
  const refreshDelay = 5000;

  async function loadPositions(isRefresh = false) {
    if (!isRefresh) {
      isLoading = true;
    }
    error = null;

    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }

    try {
      const result = await fetchPositions(userAddress);
      positions = result.positions;
      markPrices = result.markPrices;
      refreshIntervalId = setInterval(() => loadPositions(true), refreshDelay);
    } catch (e: any) {
      error = e.message;
      positions = [];
    } finally {
      if (!isRefresh) {
        isLoading = false;
      }
    }
  }

  onDestroy(() => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }
  });
</script>

<main class="max-w-screen-2xl mx-auto p-8">
  <h1 class="text-4xl font-bold mb-6 text-center">Hyperliquid Performance Tracker</h1>

  <form class="flex items-center gap-2 mb-8 max-w-3xl mx-auto" on:submit|preventDefault={() => loadPositions(false)}>
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
      Search
    </button>
  </form>

  {#if isLoading}
    <p class="text-lg text-slate-400 text-center">Loading position data...</p>
  {:else if error}
    <p class="text-lg text-red-500 text-center">Error: {error}</p>
  {:else if positions.length > 0}
    <PositionsTable {positions} {markPrices} />
  {/if}
</main>
