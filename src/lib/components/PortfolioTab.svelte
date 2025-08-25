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
		const key = type === 'perp' ? `perp${tf.charAt(0).toUpperCase() + tf.slice(1)}` : tf;
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

	// 🔁 NEW: base stats use PNL for change, AV for base/current
	$: portfolioStats = (() => {
		if (!selectedAccountValueHistory?.length || !selectedPnlHistory?.length) {
			return { currentValue: 0, pnl: 0, percentChange: 0 };
		}
		const startAccount = parseFloat(selectedAccountValueHistory[0][1] ?? '0');
		const currentValue = parseFloat(
			selectedAccountValueHistory[selectedAccountValueHistory.length - 1][1] ?? '0'
		);
		const pnl = parseFloat(selectedPnlHistory[selectedPnlHistory.length - 1][1] ?? '0');

		const percentChange = startAccount !== 0 ? (pnl / startAccount) * 100 : 0;
		return { currentValue, pnl, percentChange };
	})();

	const fmtUSD = (n: number) =>
		n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
</script>

{#key `${lastUpdated}-${activeAssetType}-${activeTimeframe}-${selectedPnlHistory.length}`}
	<div class="w-full rounded-lg border border-slate-700 bg-slate-800 p-6">
		<div class="mb-6">
			<h3 class="text-lg text-gray-300">Account Value</h3>

			<!-- Big number stays account value -->
			<p class="text-4xl font-bold text-white">
				${fmtUSD(portfolioStats.currentValue)}
			</p>

			<!-- 🔁 This line now shows PNL (not account value delta) -->
			<p
				class="text-lg font-semibold"
				class:text-green-400={portfolioStats.pnl >= 0}
				class:text-red-400={portfolioStats.pnl < 0}
			>
				{portfolioStats.pnl >= 0 ? '+' : ''}${fmtUSD(portfolioStats.pnl)}
				({portfolioStats.percentChange.toFixed(2)}%)
				<span class="text-base font-normal text-gray-400"> {activeTimeframe}</span>
			</p>
		</div>

		<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
			<div class="flex gap-2 rounded-md bg-gray-900/70 p-1">
				<button
					on:click={() => (activeTimeframe = 'day')}
					class:bg-sky-600={activeTimeframe === 'day'}
					class="rounded px-4 py-1 text-white transition-colors">24H</button
				>
				<button
					on:click={() => (activeTimeframe = 'week')}
					class:bg-sky-600={activeTimeframe === 'week'}
					class="rounded px-4 py-1 text-white transition-colors">1W</button
				>
				<button
					on:click={() => (activeTimeframe = 'month')}
					class:bg-sky-600={activeTimeframe === 'month'}
					class="rounded px-4 py-1 text-white transition-colors">1M</button
				>
				<button
					on:click={() => (activeTimeframe = 'allTime')}
					class:bg-sky-600={activeTimeframe === 'allTime'}
					class="rounded px-4 py-1 text-white transition-colors">All</button
				>
			</div>
			<div class="flex gap-2 rounded-md bg-gray-900/70 p-1">
				<button
					on:click={() => (activeAssetType = 'combined')}
					class:bg-sky-600={activeAssetType === 'combined'}
					class="rounded px-4 py-1 text-white transition-colors">Combined</button
				>
				<button
					on:click={() => (activeAssetType = 'perp')}
					class:bg-sky-600={activeAssetType === 'perp'}
					class="rounded px-4 py-1 text-white transition-colors">Perps Only</button
				>
			</div>
		</div>

		<div class="w-full">
			<PnlChart pnlHistory={selectedPnlHistory} timeframe={activeTimeframe} {lastUpdated} />
		</div>
	</div>
{/key}
