<script lang="ts">
  import { onDestroy } from 'svelte';
  import PnlChart from '$lib/components/PnlChart.svelte';

  // State for UI & Data
  let positions: any[] = [];
  let markPrices: Record<string, string> = {};
  let portfolioData: any = {};
  let lastUpdated = 0;
  let isLoading = false;
  let error: string | null = null;
  let userAddress = '';
  let activeTab: 'positions' | 'portfolio' = 'positions';

  let activeTimeframe: 'day' | 'week' | 'month' | 'allTime' = 'day';
  let activeAssetType: 'combined' | 'perp' = 'combined';

  let autoRefreshEnabled = true;
  let refreshIntervalId: any = null;
  const refreshDelay = 5000;

  // Abort any in-flight fetches when switching tabs / reloading
  let inFlightController: AbortController | null = null;

  async function handleSearch() {
    if (!userAddress) return;

    isLoading = true;
    error = null;
    activeTab = 'positions'; // default landing tab

    positions = [];
    portfolioData = {};

    await refreshData(false);
    isLoading = false;
  }

  // Only fetch what's needed for the active tab; cancel old requests
  async function refreshData(isRefresh = true) {
    if (!userAddress) return;

    // Stop previous interval if this is a manual refresh (tab switch / search)
    if (!isRefresh && refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }

    // Cancel any in-flight requests from the previous tab/state
    if (inFlightController) inFlightController.abort();
    inFlightController = new AbortController();
    const { signal } = inFlightController;

    // Snapshot the tab at call time; ignore results if tab changes mid-flight
    const tabAtStart = activeTab;

    try {
      if (tabAtStart === 'portfolio') {
        const res = await fetch(`http://127.0.0.1:3000/portfolio/${userAddress}`, { signal });
        if (!res.ok) throw new Error('Portfolio request failed.');
        const data = await res.json();
        if (activeTab !== tabAtStart) return; // tab changed; ignore results
        portfolioData = data;
        lastUpdated = Date.now();
      } else {
        const [resPos, resMarks] = await Promise.all([
          fetch(`http://127.0.0.1:3000/positions/${userAddress}`, { signal }),
          fetch(`http://127.0.0.1:3000/mark-prices`, { signal })
        ]);
        if (!resPos.ok || !resMarks.ok) throw new Error('An API request failed.');
        const [posData, marksData] = await Promise.all([resPos.json(), resMarks.json()]);
        if (activeTab !== tabAtStart) return; // tab changed; ignore results
        positions = posData;
        markPrices = marksData;
      }

      error = null;
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // expected on tab switch
      error = e?.message ?? 'Unknown error';
      if (tabAtStart === 'portfolio') {
        portfolioData = {};
      } else {
        positions = [];
        markPrices = {};
      }
    } finally {
      // Clear controller once this cycle finishes
      inFlightController = null;
    }

    startAutoRefresh();

    // nudge reactivity (harmless)
    positions = positions;
    markPrices = markPrices;
    portfolioData = portfolioData;
  }

  function startAutoRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    if (autoRefreshEnabled && userAddress) {
      refreshIntervalId = setInterval(() => refreshData(true), refreshDelay);
    }
  }

  async function handleTabChange(tab: 'positions' | 'portfolio') {
    activeTab = tab;

    // Cancel any in-flight fetch from previous tab and stop its timer now
    if (inFlightController) inFlightController.abort();
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }

    isLoading = true;
    await refreshData(false);
    isLoading = false;

    startAutoRefresh();
  }

  function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    if (!autoRefreshEnabled && refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    } else if (autoRefreshEnabled && userAddress) {
      refreshData(true);
    }
  }

  onDestroy(() => {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    if (inFlightController) inFlightController.abort();
  });

  // --- Helpers / derived data ---
  function getHistory(
    field: 'pnlHistory' | 'accountValueHistory',
    data: any,
    type: 'combined' | 'perp',
    tf: 'day' | 'week' | 'month' | 'allTime'
  ) {
    if (!data || Object.keys(data).length === 0) return [];
    const key = type === 'perp'
      ? `perp${tf.charAt(0).toUpperCase() + tf.slice(1)}`
      : tf;
    return data[key]?.[field] || [];
  }

  let selectedPnlHistory: [number, string][] = [];
  let selectedAccountValueHistory: [number, string][] = [];

  $: {
    portfolioData;
    activeAssetType;
    activeTimeframe;

    selectedPnlHistory = [
      ...getHistory('pnlHistory', portfolioData, activeAssetType, activeTimeframe)
    ];
    selectedAccountValueHistory = [
      ...getHistory('accountValueHistory', portfolioData, activeAssetType, activeTimeframe)
    ];
  }

  $: portfolioStats = (() => {
    if (!selectedAccountValueHistory || selectedAccountValueHistory.length < 2) {
      return { currentValue: 0, change: 0, percentChange: 0 };
    }
    const startValue = parseFloat(selectedAccountValueHistory[0][1]);
    const currentValue = parseFloat(
      selectedAccountValueHistory[selectedAccountValueHistory.length - 1][1]
    );
    const change = currentValue - startValue;
    const percentChange = startValue !== 0 ? (change / startValue) * 100 : 0;
    return { currentValue, change, percentChange };
  })();
</script>

<!-- Full-width page; fix search width; unify content width so table & chart match -->
<main class="w-full px-6 py-8">
  <!-- Header -->
  <div class="w-full flex justify-center mb-4">
    <h1 class="text-4xl font-bold text-center">Hyperliquid Performance Tracker</h1>
  </div>

  <!-- Search row (fixed width, consistent on both tabs) -->
  <div class="w-full flex justify-center">
    <form class="flex items-center gap-2 w-[560px] max-w-full mb-6" on:submit|preventDefault={handleSearch}>
      <input
        class="flex-1 bg-sky-100 border border-slate-700 rounded-md px-4 py-2 text-lg focus:ring-2 focus:ring-sky-500 outline-none text-gray-900"
        type="text"
        placeholder="Enter EVM address..."
        bind:value={userAddress}
      />
      <button
        class="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md px-6 py-2 text-lg shrink-0"
        type="submit"
      >Search</button>
    </form>
  </div>

  <!-- Auto-refresh toggle (same fixed width as search) -->
  <div class="w-full flex justify-center mb-8">
    <div class="flex items-center justify-center gap-2 text-slate-600 w-[560px] max-w-full">
      <label for="autoRefreshToggle">Auto-Refresh</label>
      <button
        id="autoRefreshToggle"
        on:click={toggleAutoRefresh}
        class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
        class:bg-sky-600={autoRefreshEnabled}
        class:bg-gray-600={!autoRefreshEnabled}
        aria-label="Toggle Auto-Refresh"
      >
        <span
          class="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"
          class:translate-x-6={autoRefreshEnabled}
          class:translate-x-1={!autoRefreshEnabled}
        ></span>
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="w-full flex justify-center mb-8">
    <div class="flex justify-center gap-6">
      <button
        on:click={() => handleTabChange('positions')}
        class="px-6 py-3 text-lg transition-colors border-b-2"
        class:border-sky-500={activeTab === 'positions'}
        class:border-transparent={activeTab !== 'positions'}
        class:text-black={activeTab === 'positions'}
        class:text-gray-400={activeTab !== 'positions'}
      >Positions</button>
      <button
        on:click={() => handleTabChange('portfolio')}
        class="px-6 py-3 text-lg transition-colors border-b-2"
        class:border-sky-500={activeTab === 'portfolio'}
        class:border-transparent={activeTab !== 'portfolio'}
        class:text-black={activeTab === 'portfolio'}
        class:text-gray-400={activeTab !== 'portfolio'}
      >Portfolio</button>
    </div>
  </div>

  <!-- Unified content width for table & chart -->
  <div class="w-full max-w-[1400px] mx-auto">
    {#if isLoading}
      <p class="text-lg text-gray-500 text-center">Loading data...</p>
    {:else if error}
      <p class="text-lg text-red-500 text-center">Error: {error}</p>
    {:else if userAddress}
      {#if activeTab === 'positions'}
        {#if positions.length > 0}
          <div class="w-full">
            <table class="w-full text-left whitespace-nowrap">
              <thead class="text-slate-500 uppercase text-sm border-b border-slate-200">
                <tr>
                  <th class="p-4">Coin</th>
                  <th class="p-4">Size</th>
                  <th class="p-4">Position Value</th>
                  <th class="p-4">Entry Price</th>
                  <th class="p-4">Mark Price</th>
                  <th class="p-4">Liq. Price</th>
                  <th class="p-4">Margin</th>
                  <th class="p-4">PnL (ROE %)</th>
                  <th class="p-4">Funding</th>
                  <th class="p-4">TP/SL</th>
                </tr>
              </thead>
              <tbody class="text-lg text-gray-800">
                {#each positions as pos}
                  {@const p = pos.position}
                  {@const isLong = parseFloat(p.szi) >= 0}
                  {@const fundingDisplay = parseFloat(p.cumFunding.sinceOpen) * -1}
                  <tr class="border-b border-slate-100">
                    <td class="p-4">
                      <div class="font-semibold" class:text-green-600={isLong} class:text-red-600={!isLong}>
                        {p.coin} {p.leverage.value}x
                      </div>
                    </td>
                    <td class="p-4">{Math.abs(parseFloat(p.szi)).toFixed(4)}</td>
                    <td class="p-4">${parseFloat(p.positionValue).toLocaleString()}</td>
                    <td class="p-4">${parseFloat(p.entryPx).toFixed(2)}</td>
                    <td class="p-4 font-mono">
                      ${markPrices[p.coin] ? parseFloat(markPrices[p.coin]).toFixed(2) : 'N/A'}
                    </td>
                    <td class="p-4">${parseFloat(p.liquidationPx).toFixed(2)}</td>
                    <td class="p-4">${parseFloat(p.marginUsed).toFixed(2)} ({p.leverage.type})</td>
                    <td class="p-4 font-mono" class:text-green-600={parseFloat(p.unrealizedPnl) >= 0} class:text-red-600={parseFloat(p.unrealizedPnl) < 0}>
                      ${parseFloat(p.unrealizedPnl).toFixed(2)}
                      <span class="text-sm text-slate-500">({(parseFloat(p.returnOnEquity) * 100).toFixed(2)}%)</span>
                    </td>
                    <td class="p-4 font-mono" class:text-green-600={fundingDisplay >= 0} class:text-red-600={fundingDisplay < 0}>
                      ${fundingDisplay.toFixed(4)}
                    </td>
                    <td class="p-4 text-slate-500">N/A</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-lg text-slate-500 text-center">No open positions found.</p>
        {/if}
      {/if}

      {#if activeTab === 'portfolio'}
        {#key `${userAddress}-${activeAssetType}-${activeTimeframe}-${selectedPnlHistory.length}`}
          <div class="w-full bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="mb-6">
              <h3 class="text-gray-300 text-lg">Account Value</h3>
              <p class="text-4xl font-bold text-white">
                ${portfolioStats.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p class="text-lg font-semibold" class:text-green-400={portfolioStats.change >= 0} class:text-red-400={portfolioStats.change < 0}>
                {portfolioStats.change >= 0 ? '+' : ''}${portfolioStats.change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                ({portfolioStats.percentChange.toFixed(2)}%)
                <span class="text-gray-400 text-base font-normal"> {activeTimeframe}</span>
              </p>
            </div>

            <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
              <div class="flex gap-2 p-1 bg-gray-900/70 rounded-md">
                <button on:click={() => activeTimeframe = 'day'}    class:bg-sky-600={activeTimeframe === 'day'}    class="px-4 py-1 rounded transition-colors text-white">24H</button>
                <button on:click={() => activeTimeframe = 'week'}   class:bg-sky-600={activeTimeframe === 'week'}   class="px-4 py-1 rounded transition-colors text-white">1W</button>
                <button on:click={() => activeTimeframe = 'month'}  class:bg-sky-600={activeTimeframe === 'month'}  class="px-4 py-1 rounded transition-colors text-white">1M</button>
                <button on:click={() => activeTimeframe = 'allTime'} class:bg-sky-600={activeTimeframe === 'allTime'} class="px-4 py-1 rounded transition-colors text-white">All</button>
              </div>
              <div class="flex gap-2 p-1 bg-gray-900/70 rounded-md">
                <button on:click={() => activeAssetType = 'combined'} class:bg-sky-600={activeAssetType === 'combined'} class="px-4 py-1 rounded transition-colors text-white">Combined</button>
                <button on:click={() => activeAssetType = 'perp'}     class:bg-sky-600={activeAssetType === 'perp'}     class="px-4 py-1 rounded transition-colors text-white">Perps Only</button>
              </div>
            </div>

            <!-- Chart fills container (which matches table width) -->
            <div class="w-full">
              <PnlChart
                pnlHistory={selectedPnlHistory}
                timeframe={activeTimeframe}
                lastUpdated={lastUpdated}
              />
            </div>
          </div>
        {/key}
      {/if}
    {/if}
  </div>
</main>
