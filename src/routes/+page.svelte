<script lang="ts">
	import { onDestroy } from 'svelte';

	let positions: any[] = [];
	let markPrices: Record<string, string> = {};
	let isLoading = false;
	let error: string | null = null;
	let userAddress = '';

	// --- Auto-refresh variables ---
	let refreshIntervalId: any = null; 
	const refreshDelay = 5000; // 5 seconds

	// This function now fetches BOTH positions and mark prices
	// and includes the auto-refresh timer logic.
	async function getPositions(isRefresh = false) {
		// Only show loading state on initial, manual search
		if (!isRefresh) {
			isLoading = true;
		}
		error = null;
		
		// Stop any previous timer before starting a new one
		if (refreshIntervalId) {
			clearInterval(refreshIntervalId);
		}

		try {
			// Set up both API calls
			const positionsPromise = fetch(`http://127.0.0.1:3000/positions/${userAddress}`);
			const markPricesPromise = fetch(`http://127.0.0.1:3000/mark-prices`);
			
			// Run them in parallel for performance
			const [positionsResponse, markPricesResponse] = await Promise.all([
				positionsPromise,
				markPricesPromise,
			]);

			if (!positionsResponse.ok) {
				const errorData = await positionsResponse.json();
				throw new Error(errorData.error || `Positions API failed`);
			}
			if (!markPricesResponse.ok) {
				const errorData = await markPricesResponse.json();
				throw new Error(errorData.error || `Mark Prices API failed`);
			}
			
			// Get the JSON from both successful responses
			positions = await positionsResponse.json();
			markPrices = await markPricesResponse.json();

			// After success, start a new timer that calls this function again
			refreshIntervalId = setInterval(() => getPositions(true), refreshDelay);

		} catch (e: any) {
			error = e.message;
			positions = [];
		} finally {
			if (!isRefresh) {
				isLoading = false;
			}
		}
	}
	
	// Clean up the timer when the user navigates away
	onDestroy(() => {
		if (refreshIntervalId) {
			clearInterval(refreshIntervalId);
		}
	});
</script>

<main class="max-w-screen-2xl mx-auto p-8">
	<h1 class="text-4xl font-bold mb-6 text-center">Hyperliquid Performance Tracker</h1>
	
	<form class="flex items-center gap-2 mb-8 max-w-3xl mx-auto" on:submit|preventDefault={() => getPositions(false)}>
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
		<div class="w-4/5 mx-auto">
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
				<tbody class="text-lg">
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
	{/if}
</main>