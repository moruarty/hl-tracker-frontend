<script lang="ts">
	import { onDestroy } from 'svelte';
	import PnlChart from '$lib/components/PnlChart.svelte';

	// State for UI & Data
	let positions: any[] = [];
	let markPrices: Record<string, string> = {};
	let portfolioData: any = {};
	let isLoading = false;
	let error: string | null = null;
	let userAddress = '';
	let activeTab: 'positions' | 'portfolio' = 'positions';
	
	let activeTimeframe: 'day' | 'week' | 'month' | 'allTime' = 'day';
	let activeAssetType: 'combined' | 'perp' = 'combined';

	let autoRefreshEnabled = true;
	let refreshIntervalId: any = null; 
	const refreshDelay = 5000;

	// --- UPDATED: Main function called by the Search button ---
	async function handleSearch() {
		if (!userAddress) return;
		
		isLoading = true;
		error = null;
		activeTab = 'positions'; // Default to positions tab on new search
		
		// Reset all data for the new user
		positions = [];
		portfolioData = {};

		await refreshData(false); // Fetch initial data
		isLoading = false;
	}

	// --- NEW: A smart refresh function that knows what to fetch ---
	async function refreshData(isRefresh = true) {
		if (!userAddress) return;
		if (refreshIntervalId) { clearInterval(refreshIntervalId); }

		try {
			// Always fetch positions and mark prices
			const positionsPromise = fetch(`http://127.0.0.1:3000/positions/${userAddress}`);
			const markPricesPromise = fetch(`http://127.0.0.1:3000/mark-prices`);
			
			// Conditionally fetch portfolio data only if the portfolio tab is active
			const promises = [positionsPromise, markPricesPromise];
			if (activeTab === 'portfolio') {
				promises.push(fetch(`http://127.0.0.1:3000/portfolio/${userAddress}`));
			}

			const responses = await Promise.all(promises);

			// Check all responses for errors
			for (const res of responses) {
				if (!res.ok) throw new Error('An API request failed.');
			}
			
			// Process successful responses
			positions = await responses[0].json();
			markPrices = await responses[1].json();
			if (responses.length === 3) {
				portfolioData = await responses[2].json();
			}

		} catch (e: any) {
			error = e.message;
			positions = [];
			portfolioData = {};
		}

		// After any fetch, re-evaluate and start the timer if enabled
		startAutoRefresh();
		// Manually trigger reactivity for Svelte
		positions = positions;
		markPrices = markPrices;
		portfolioData = portfolioData;
	}

	// --- NEW: A function to start the timer, calling our smart refresher ---
	function startAutoRefresh() {
		if (refreshIntervalId) clearInterval(refreshIntervalId);
		if (autoRefreshEnabled && userAddress) {
			refreshIntervalId = setInterval(() => refreshData(true), refreshDelay);
		}
	}

	// --- NEW: Handler for changing tabs ---
	async function handleTabChange(tab: 'positions' | 'portfolio') {
		activeTab = tab;
		// If we switch to portfolio and have no data, fetch it now.
		if (tab === 'portfolio' && Object.keys(portfolioData).length === 0) {
			isLoading = true;
			await refreshData(false);
			isLoading = false;
		}
		startAutoRefresh(); // Restart the refresh loop with the new tab context
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
		if (refreshIntervalId) { clearInterval(refreshIntervalId); }
	});

	// --- The computed properties below are the same as before ---
	function getHistory(field: 'pnlHistory' | 'accountValueHistory') {
		if (!portfolioData || Object.keys(portfolioData).length === 0) return [];
		const key = activeAssetType === 'perp' ? `perp${activeTimeframe.charAt(0).toUpperCase() + activeTimeframe.slice(1)}` : activeTimeframe;
		return portfolioData[key]?.[field] || [];
	}

	$: selectedPnlHistory = getHistory('pnlHistory');
	$: selectedAccountValueHistory = getHistory('accountValueHistory');
	$: portfolioStats = (() => {
		if (!selectedAccountValueHistory || selectedAccountValueHistory.length < 2) return { currentValue: 0, change: 0, percentChange: 0 };
		const startValue = parseFloat(selectedAccountValueHistory[0][1]);
		const currentValue = parseFloat(selectedAccountValueHistory[selectedAccountValueHistory.length - 1][1]);
		const change = currentValue - startValue;
		const percentChange = startValue !== 0 ? (change / startValue) * 100 : 0;
		return { currentValue, change, percentChange };
	})();
</script>

<main class="max-w-screen-2xl mx-auto p-8">
	<div class="max-w-3xl mx-auto">
		<h1 class="text-4xl font-bold mb-6 text-center">Hyperliquid Performance Tracker</h1>
		
		<form class="flex items-center gap-2 mb-4" on:submit|preventDefault={handleSearch}>
			<input class="w-full bg-sky-100 border border-slate-700 rounded-md px-4 py-2 text-lg focus:ring-2 focus:ring-sky-500 outline-none text-gray-900" type="text" placeholder="Enter EVM address..." bind:value={userAddress} />
			<button class="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md px-6 py-2 text-lg shrink-0" type="submit">Search</button>
		</form>

		<div class="flex items-center justify-center gap-2 mb-8 text-slate-400">
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
				/>
			</button>
		</div>
	</div>

	<div class="flex justify-center border-b border-gray-700 mb-8">
		<button on:click={() => handleTabChange('positions')} class="px-6 py-3 text-lg transition-colors" class:border-b-2={activeTab === 'positions'} class:border-sky-500={activeTab === 'positions'} class:text-white={activeTab === 'positions'} class:text-gray-400={activeTab !== 'positions'}>Positions</button>
		<button on:click={() => handleTabChange('portfolio')} class="px-6 py-3 text-lg transition-colors" class:border-b-2={activeTab === 'portfolio'} class:border-sky-500={activeTab === 'portfolio'} class:text-white={activeTab === 'portfolio'} class:text-gray-400={activeTab !== 'portfolio'}>Portfolio</button>
	</div>

	<div class="w-full">
		{#if isLoading}
			<p class="text-lg text-gray-400 text-center">Loading data...</p>
		{:else if error}
			<p class="text-lg text-red-500 text-center">Error: {error}</p>
		{:else if userAddress}
			{#if activeTab === 'positions'}
				{#if positions.length > 0}
					<div class="mx-auto">
						<table class="w-full text-left whitespace-nowrap">
							<thead class="text-slate-400 uppercase text-sm border-b border-slate-700">
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
									<tr class="border-b border-slate-800">
										<td class="p-4">
											<div class="font-semibold" class:text-green-400={isLong} class:text-red-400={!isLong}>
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
										<td class="p-4 font-mono" class:text-green-400={parseFloat(p.unrealizedPnl) >= 0} class:text-red-400={parseFloat(p.unrealizedPnl) < 0}>
											${parseFloat(p.unrealizedPnl).toFixed(2)} 
											<span class="text-sm text-slate-400">({(parseFloat(p.returnOnEquity) * 100).toFixed(2)}%)</span>
										</td>
										<td class="p-4 font-mono" class:text-green-400={fundingDisplay >= 0} class:text-red-400={fundingDisplay < 0}>
											${fundingDisplay.toFixed(4)}
										</td>
										<td class="p-4 text-slate-500">N/A</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-lg text-slate-400 text-center">No open positions found.</p>
				{/if}
			{/if}

			{#if activeTab === 'portfolio'}
				<div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
					
					<div class="mb-6">
						<h3 class="text-gray-400 text-lg">Account Value</h3>
						<p class="text-4xl font-bold">
							${portfolioStats.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
						</p>
						<p class="text-lg font-semibold" class:text-green-400={portfolioStats.change >= 0} class:text-red-400={portfolioStats.change < 0}>
							{portfolioStats.change >= 0 ? '+' : ''}${portfolioStats.change.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
							({portfolioStats.percentChange.toFixed(2)}%)
							<span class="text-gray-400 text-base font-normal"> {activeTimeframe}</span>
						</p>
					</div>
					<div class="flex flex-wrap justify-between items-center mb-4 gap-4">
						<div class="flex gap-2 p-1 bg-gray-900/70 rounded-md">
							<button on:click={() => activeTimeframe = 'day'} class:bg-sky-600={activeTimeframe === 'day'} class="px-4 py-1 rounded transition-colors">24H</button>
							<button on:click={() => activeTimeframe = 'week'} class:bg-sky-600={activeTimeframe === 'week'} class="px-4 py-1 rounded transition-colors">1W</button>
							<button on:click={() => activeTimeframe = 'month'} class:bg-sky-600={activeTimeframe === 'month'} class="px-4 py-1 rounded transition-colors">1M</button>
							<button on:click={() => activeTimeframe = 'allTime'} class:bg-sky-600={activeTimeframe === 'allTime'} class="px-4 py-1 rounded transition-colors">All</button>
						</div>
						<div class="flex gap-2 p-1 bg-gray-900/70 rounded-md">
							<button on:click={() => activeAssetType = 'combined'} class:bg-sky-600={activeAssetType === 'combined'} class="px-4 py-1 rounded transition-colors">Combined</button>
							<button on:click={() => activeAssetType = 'perp'} class:bg-sky-600={activeAssetType === 'perp'} class="px-4 py-1 rounded transition-colors">Perps Only</button>
						</div>
					</div>
					<PnlChart pnlHistory={selectedPnlHistory} timeframe={activeTimeframe} />
				</div>
			{/if}
		{/if}
	</div>
</main>