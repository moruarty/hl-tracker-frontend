<script lang="ts">
	import { onDestroy } from 'svelte';
	import PositionsTab from '$lib/components/PositionsTab.svelte';
	import PortfolioTab from '$lib/components/PortfolioTab.svelte';
	import AnalyticsTab from '$lib/components/AnalyticsTab.svelte';
	import type { CalendarStats } from '$lib/types/analytics';
	import { PUBLIC_API_BASE } from '$env/static/public';
	const API = PUBLIC_API_BASE.replace(/\/+$/, '');
	const url = (p: string) => `${API}${p}`;

	// State for UI & Data
	let positions: any[] = [];
	let markPrices: Record<string, string> = {};
	let portfolioData: any = {};
	let calendarData: CalendarStats | null = null;
	let lastUpdated = 0;
	let isLoading = false;
	let error: string | null = null;
	let userAddress = '';
	let activeTab: 'positions' | 'portfolio' | 'analytics' = 'positions';

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
		calendarData = null;

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
				const res = await fetch(url(`/portfolio/${userAddress}`), { signal });
				if (!res.ok) throw new Error('Portfolio request failed.');
				const data = await res.json();
				if (activeTab !== tabAtStart) return; // tab changed; ignore results
				portfolioData = data;
				lastUpdated = Date.now();
			} else if (tabAtStart === 'analytics') {
				const res = await fetch(url(`/calendar/${userAddress}`), { signal });
				if (!res.ok) throw new Error('Calendar request failed.');
				const data = await res.json();
				if (activeTab !== tabAtStart) return;
				calendarData = data;
				lastUpdated = Date.now();
			} else {
				const [resPos, resMarks] = await Promise.all([
					fetch(url(`/positions/${userAddress}`), { signal }),
					fetch(url(`/mark-prices`), { signal })
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
			} else if (tabAtStart === 'analytics') {
				calendarData = null;
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
		calendarData = calendarData;
	}

	function startAutoRefresh() {
		if (refreshIntervalId) clearInterval(refreshIntervalId);
		if (autoRefreshEnabled && userAddress) {
			refreshIntervalId = setInterval(() => refreshData(true), refreshDelay);
		}
	}

	async function handleTabChange(tab: 'positions' | 'portfolio' | 'analytics') {
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
</script>

<!-- Full-width page; fix search width; unify content width so table & chart match -->
<main class="w-full px-6 py-8">
	<!-- Header -->
	<div class="mb-4 flex w-full justify-center">
		<h1 class="text-center text-4xl font-bold">Hyperliquid Performance Tracker</h1>
	</div>

	<!-- Search row (fixed width, consistent on both tabs) -->
	<div class="flex w-full justify-center">
		<form
			class="mb-6 flex w-[560px] max-w-full items-center gap-2"
			on:submit|preventDefault={handleSearch}
		>
			<input
				class="flex-1 rounded-md border border-slate-700 bg-sky-100 px-4 py-2 text-lg text-gray-900 outline-none focus:ring-2 focus:ring-sky-500"
				type="text"
				placeholder="Enter EVM address..."
				bind:value={userAddress}
			/>
			<button
				class="shrink-0 rounded-md bg-sky-600 px-6 py-2 text-lg font-bold text-white hover:bg-sky-700"
				type="submit">Search</button
			>
		</form>
	</div>

	<!-- Auto-refresh toggle (same fixed width as search) -->
	<div class="mb-8 flex w-full justify-center">
		<div class="flex w-[560px] max-w-full items-center justify-center gap-2 text-slate-600">
			<label for="autoRefreshToggle">Auto-Refresh</label>
			<button
				id="autoRefreshToggle"
				on:click={toggleAutoRefresh}
				class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-sky-500 focus:outline-none"
				class:bg-sky-600={autoRefreshEnabled}
				class:bg-gray-600={!autoRefreshEnabled}
				aria-label="Toggle Auto-Refresh"
			>
				<span
					class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
					class:translate-x-6={autoRefreshEnabled}
					class:translate-x-1={!autoRefreshEnabled}
				></span>
			</button>
		</div>
	</div>

	<!-- Tabs -->
	<div class="mb-8 flex w-full justify-center">
		<div class="flex justify-center gap-6">
			<button
				on:click={() => handleTabChange('positions')}
				class="border-b-2 px-6 py-3 text-lg transition-colors"
				class:border-sky-500={activeTab === 'positions'}
				class:border-transparent={activeTab !== 'positions'}
				class:text-black={activeTab === 'positions'}
				class:text-gray-400={activeTab !== 'positions'}>Positions</button
			>
			<button
				on:click={() => handleTabChange('portfolio')}
				class="border-b-2 px-6 py-3 text-lg transition-colors"
				class:border-sky-500={activeTab === 'portfolio'}
				class:border-transparent={activeTab !== 'portfolio'}
				class:text-black={activeTab === 'portfolio'}
				class:text-gray-400={activeTab !== 'portfolio'}>Portfolio</button
			>
			<button
				on:click={() => handleTabChange('analytics')}
				class="border-b-2 px-6 py-3 text-lg transition-colors"
				class:border-sky-500={activeTab === 'analytics'}
				class:border-transparent={activeTab !== 'analytics'}
				class:text-black={activeTab === 'analytics'}
				class:text-gray-400={activeTab !== 'analytics'}>Analytics</button
			>
		</div>
	</div>

	<!-- Unified content width for table & chart -->
	<div class="mx-auto w-full max-w-[1400px]">
		{#if isLoading}
			<p class="text-center text-lg text-gray-500">Loading data...</p>
		{:else if error}
			<p class="text-center text-lg text-red-500">Error: {error}</p>
		{:else if userAddress}
			{#if activeTab === 'positions'}
				<PositionsTab {positions} {markPrices} />
			{/if}

			{#if activeTab === 'portfolio'}
				<PortfolioTab {portfolioData} {lastUpdated} />
			{/if}

			{#if activeTab === 'analytics'}
				<AnalyticsTab {calendarData} />
			{/if}
		{/if}
	</div>
</main>
