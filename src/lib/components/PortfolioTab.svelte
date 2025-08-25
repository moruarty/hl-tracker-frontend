<script lang="ts">
  import PnlChart from './PnlChart.svelte';

  export let portfolioData: any = {};
  export let lastUpdated = 0;

  let activeTimeframe: 'day' | 'week' | 'month' | 'allTime' = 'day';
  let activeAssetType: 'combined' | 'perp' = 'combined';

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

{#key `${lastUpdated}-${activeAssetType}-${activeTimeframe}-${selectedPnlHistory.length}`}
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
        <button on:click={() => activeTimeframe = 'day'} class:bg-sky-600={activeTimeframe === 'day'} class="px-4 py-1 rounded transition-colors text-white">24H</button>
        <button on:click={() => activeTimeframe = 'week'} class:bg-sky-600={activeTimeframe === 'week'} class="px-4 py-1 rounded transition-colors text-white">1W</button>
        <button on:click={() => activeTimeframe = 'month'} class:bg-sky-600={activeTimeframe === 'month'} class="px-4 py-1 rounded transition-colors text-white">1M</button>
        <button on:click={() => activeTimeframe = 'allTime'} class:bg-sky-600={activeTimeframe === 'allTime'} class="px-4 py-1 rounded transition-colors text-white">All</button>
      </div>
      <div class="flex gap-2 p-1 bg-gray-900/70 rounded-md">
        <button on:click={() => activeAssetType = 'combined'} class:bg-sky-600={activeAssetType === 'combined'} class="px-4 py-1 rounded transition-colors text-white">Combined</button>
        <button on:click={() => activeAssetType = 'perp'} class:bg-sky-600={activeAssetType === 'perp'} class="px-4 py-1 rounded transition-colors text-white">Perps Only</button>
      </div>
    </div>

    <div class="w-full">
      <PnlChart
        pnlHistory={selectedPnlHistory}
        timeframe={activeTimeframe}
        {lastUpdated}
      />
    </div>
  </div>
{/key}

<style>
  /* no additional styles */
</style>
