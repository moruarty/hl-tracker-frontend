<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Props: entries = [{ day: Date; pnl: number }], target month & year (UTC)
	export let entries: Array<{ day: Date; pnl: number }> = [];
	export let month: number; // 1..12
	export let year: number;

	const DAY_MS = 86_400_000;

	// --- Helpers ---
	const toEpochDay = (d: Date) => Math.floor(d.getTime() / DAY_MS);
	const sodUTC = (d: Date) =>
		new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

	function startOfWeekMonUTC(d: Date) {
		const date = sodUTC(d);
		const day = date.getUTCDay(); // 0..6 (Sun..Sat)
		const diff = (day + 6) % 7; // 0 for Mon, 6 for Sun
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}
	function endOfWeekSunUTC(d: Date) {
		const date = sodUTC(d);
		const day = date.getUTCDay();
		const add = (7 - day) % 7;
		date.setUTCDate(date.getUTCDate() + add);
		return date;
	}

	const WEEKDAY_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function ordinal(n: number) {
		const s = ['th', 'st', 'nd', 'rd'],
			v = n % 100;
		return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
	}

	function formatMoneyFull(n?: number) {
		if (n == null) return '';
		const sign = n >= 0 ? '' : '-';
		const abs = Math.abs(n);
		// Only go to “m” when it’s really huge
		if (abs >= 1_000_000_000)
			return `${sign}$${(abs / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}m`;
		return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
	}

	function colorFor(v: number | undefined, maxPos: number, maxNeg: number): string {
		if (v == null || v === 0) return 'rgba(148,163,184,0.20)'; // neutral
		if (v > 0) {
			if (maxPos <= 0) return 'rgba(16,185,129,0.25)';
			const t = Math.sqrt(Math.min(1, v / maxPos));
			return `rgba(16,185,129,${0.25 + 0.55 * t})`;
		} else {
			if (maxNeg <= 0) return 'rgba(244,63,94,0.25)';
			const t = Math.sqrt(Math.min(1, -v / maxNeg));
			return `rgba(244,63,94,${0.25 + 0.55 * t})`;
		}
	}

	function tooltip(date: Date, pnl?: number): string {
		const y = date.getUTCFullYear();
		const m = String(date.getUTCMonth() + 1).padStart(2, '0');
		const d = String(date.getUTCDate()).padStart(2, '0');
		const iso = `${y}-${m}-${d}`;
		const v = pnl ?? 0;
		const sign = v >= 0 ? '+' : '';
		return `${iso}\nPnL: ${sign}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
	}

	// ---------- REACTIVE DERIVED STATE ----------
	// Month window
	$: firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
	$: lastOfMonth = new Date(Date.UTC(year, month, 0));

	// Week-aligned bounds
	$: gridStart = startOfWeekMonUTC(firstOfMonth);
	$: gridEnd = endOfWeekSunUTC(lastOfMonth);

	// Map daily pnl for quick lookup (UTC day key)
	$: byDay = (() => {
		const map = new Map<number, number>();
		for (const e of entries) {
			const key = toEpochDay(sodUTC(e.day));
			map.set(key, (map.get(key) ?? 0) + e.pnl);
		}
		return map;
	})();

	// Extrema within the target month (for color scaling)
	$: ({ maxPos, maxNeg } = (() => {
		let _maxPos = 0,
			_maxNeg = 0;
		for (let t = firstOfMonth.getTime(); t <= lastOfMonth.getTime(); t += DAY_MS) {
			const k = Math.floor(t / DAY_MS);
			const v = byDay.get(k);
			if (v != null) {
				if (v > 0) _maxPos = Math.max(_maxPos, v);
				else if (v < 0) _maxNeg = Math.max(_maxNeg, -v);
			}
		}
		return { maxPos: _maxPos, maxNeg: _maxNeg };
	})());

	// Build grid as rows=weeks, cols=days (Mon..Sun)
	type Cell = { date: Date; inMonth: boolean; pnl?: number };
	$: rows = (() => {
		const out: Cell[][] = [];
		for (
			let weekStart = gridStart.getTime();
			weekStart <= gridEnd.getTime();
			weekStart += 7 * DAY_MS
		) {
			const row: Cell[] = [];
			for (let d = 0; d < 7; d++) {
				const date = new Date(weekStart + d * DAY_MS);
				const key = Math.floor(date.getTime() / DAY_MS);
				const pnl = byDay.get(key);
				row.push({
					date,
					inMonth: date.getUTCMonth() === month - 1 && date.getUTCFullYear() === year,
					pnl
				});
			}
			out.push(row);
		}
		return out;
	})();

	// ---------- RESPONSIVE CELL SIZING (keeps your layout) ----------
	let measureEl: HTMLDivElement | null = null;
	let ro: ResizeObserver | null = null;
	let contentWidth = 0;

	// tweakables
	const GAP = 8; // gap between day columns
	const MIN_W = 120;
	const MAX_W = 220;
	const ASPECT = 120 / 190; // your original 120h / 190w ≈ 0.6316
	const MIN_H = 90;
	const MAX_H = 160;

	// compute width from container
	$: weeksCols = 7; // always 7 day columns
	$: totalGaps = GAP * (weeksCols - 1);
	$: cellW = Math.max(MIN_W, Math.min(MAX_W, Math.floor((contentWidth - totalGaps) / weeksCols)));
	$: cellH = Math.max(MIN_H, Math.min(MAX_H, Math.round(cellW * ASPECT)));

	onMount(() => {
		if (!measureEl) return;
		ro = new ResizeObserver(() => {
			// subtract a hair to avoid rounding wrap issues
			contentWidth = Math.floor(measureEl!.clientWidth) - 1;
		});
		ro.observe(measureEl);
		// init
		contentWidth = Math.floor(measureEl.clientWidth) - 1;
	});
	onDestroy(() => ro?.disconnect());
</script>

<div class="w-full overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 p-4">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="text-lg font-semibold text-white">
			{firstOfMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
		</div>
		<div class="text-xs text-slate-400">Green = profit, Red = loss (intensity by magnitude)</div>
	</div>

	<!-- A measuring row to compute available width -->
	<div bind:this={measureEl} class="w-full"></div>

	<!-- Column headers: Mon .. Sun (no weekday inside cells) -->
	<div class="mb-2 grid" style={`grid-template-columns: repeat(7, ${cellW}px); gap: ${GAP}px;`}>
		{#each WEEKDAY_MON_FIRST as name}
			<div class="px-2 text-sm font-medium text-slate-300">
				{name}
			</div>
		{/each}
	</div>

	<!-- Weeks as rows, days as columns -->
	<div class="flex flex-col gap-2">
		{#each rows as week}
			<div class="grid" style={`grid-template-columns: repeat(7, ${cellW}px); gap: ${GAP}px;`}>
				{#each week as cell}
					<div
						class="rounded-md border border-slate-900/80"
						style={`width:${cellW}px;height:${cellH}px;background:${cell.inMonth ? colorFor(cell.pnl, maxPos, maxNeg) : 'rgba(2,6,23,0.35)'};`}
						title={tooltip(cell.date, cell.pnl)}
					>
						<!-- top-right date only -->
						<div class="flex items-start justify-between px-2 pt-2 text-xs">
							<span class="text-slate-300">
								{WEEKDAY_MON_FIRST[cell.date.getUTCDay() === 0 ? 6 : cell.date.getUTCDay() - 1]}
							</span>
							<span class="text-slate-200">{ordinal(cell.date.getUTCDate())}</span>
						</div>

						<!-- PnL centered -->
						<div class="flex h-[calc(100%-1.5rem)] items-center justify-center px-2 pb-2">
							{#if cell.inMonth}
								<span class="text-lg font-semibold text-white select-none">
									{formatMoneyFull(cell.pnl)}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>
