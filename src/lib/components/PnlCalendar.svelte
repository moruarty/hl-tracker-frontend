<script lang="ts">
	// Props: entries are [{ day: Date, pnl: number }]
	export let entries: Array<{ day: Date; pnl: number }> = [];

	// --- Helpers ---
	const DAY_MS = 86_400_000;

	// Epoch-day (UTC) integer from Date
	const toEpochDay = (d: Date) => Math.floor(d.getTime() / DAY_MS);

	// Monday-based week start (UTC)
	function startOfWeekMonUTC(d: Date) {
		const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
		const day = date.getUTCDay(); // 0..6 (Sun..Sat)
		const diff = (day + 6) % 7; // 0 for Mon, 1 for Tue, ..., 6 for Sun
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}

	// Start of day (UTC)
	function startOfDayUTC(d: Date) {
		return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
	}

	// Build a map day->pnl and track extrema
	const byDay = new Map<number, number>();
	let maxPos = 0;
	let maxNeg = 0; // most negative (absolute) value

	for (const e of entries) {
		const k = toEpochDay(startOfDayUTC(e.day));
		byDay.set(k, (byDay.get(k) ?? 0) + e.pnl); // if multiple entries per day, sum
	}
	for (const v of byDay.values()) {
		if (v > 0) maxPos = Math.max(maxPos, v);
		else if (v < 0) maxNeg = Math.max(maxNeg, -v);
	}

	// Choose range: show the last 53 weeks ending at max day we have (or today)
	const lastDay = byDay.size ? Math.max(...byDay.keys()) : toEpochDay(startOfDayUTC(new Date()));
	const lastDate = new Date(lastDay * DAY_MS);
	const rangeEnd = startOfWeekMonUTC(lastDate); // end week aligned to Monday
	const weeks = 53;

	// Start = (end - (weeks-1) weeks)
	const rangeStart = new Date(rangeEnd.getTime() - (weeks - 1) * 7 * DAY_MS);

	// Build grid data: columns = weeks, rows = 7 (Mon..Sun)
	type Cell = { date: Date; pnl?: number; epochDay: number };
	const grid: Cell[][] = []; // [col][row]

	for (let w = 0; w < weeks; w++) {
		const col: Cell[] = [];
		for (let r = 0; r < 7; r++) {
			const d = new Date(rangeStart.getTime() + (w * 7 + r) * DAY_MS);
			const day = toEpochDay(d);
			const pnl = byDay.get(day);
			col.push({ date: d, pnl, epochDay: day });
		}
		grid.push(col);
	}

	// Month labels: label the first column whose first row is the 1st of a month
	const monthLabels: { col: number; label: string }[] = [];
	for (let c = 0; c < grid.length; c++) {
		const d = grid[c][0].date;
		if (d.getUTCDate() === 1) {
			monthLabels.push({ col: c, label: d.toLocaleString(undefined, { month: 'short' }) });
		}
	}

	// Color scaling: intensity ~ sqrt(|v| / maxAbs) for better dynamic range
	function cellColor(v: number | undefined): string {
		if (v == null || v === 0) return 'rgba(148,163,184,0.15)'; // neutral gray-ish
		if (v > 0) {
			if (maxPos <= 0) return 'rgba(22,163,74,0.15)';
			const t = Math.sqrt(Math.min(1, v / maxPos));
			// base emerald-ish (tailwind emerald-500) with alpha scaled
			return `rgba(16, 185, 129, ${0.2 + 0.5 * t})`;
		} else {
			if (maxNeg <= 0) return 'rgba(220,38,38,0.15)';
			const t = Math.sqrt(Math.min(1, -v / maxNeg));
			// base rose-ish (tailwind rose-500) with alpha scaled
			return `rgba(244, 63, 94, ${0.2 + 0.5 * t})`;
		}
	}

	function tooltip(e: Cell): string {
		const y = e.date.getUTCFullYear();
		const m = String(e.date.getUTCMonth() + 1).padStart(2, '0');
		const d = String(e.date.getUTCDate()).padStart(2, '0');
		const iso = `${y}-${m}-${d}`;
		const pnl = e.pnl ?? 0;
		const sign = pnl >= 0 ? '+' : '';
		return `${iso}\nPnL: ${sign}${pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
	}
</script>

<!-- Container -->
<div class="w-full overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 p-4">
	<div class="mb-2 text-sm text-slate-300">PnL Calendar</div>

	<!-- Month header row -->
	<div class="relative mb-1 ml-8">
		<div
			class="grid"
			style={`grid-template-columns: 1.5rem repeat(${grid.length}, 0.85rem); gap: 0.2rem;`}
		>
			<div></div>
			{#each Array(grid.length) as _, col}
				<div class="text-[10px] text-slate-400">
					{#if monthLabels.find((m) => m.col === col)}
						{monthLabels.find((m) => m.col === col)?.label}
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Weekday labels + heatmap -->
	<div
		class="grid"
		style={`grid-template-columns: 1.5rem repeat(${grid.length}, 0.85rem); gap: 0.2rem;`}
	>
		<!-- Weekday labels (Mon, Wed, Fri to save space) -->
		<div class="flex flex-col items-end gap-1">
			{#each Array(7) as _, r}
				<div class="h-3.5 text-[10px] text-slate-400">
					{#if r === 0}Mon{/if}
					{#if r === 2}Wed{/if}
					{#if r === 4}Fri{/if}
				</div>
			{/each}
		</div>

		<!-- Columns (weeks) -->
		{#each grid as col}
			<div class="flex flex-col gap-1">
				{#each col as cell}
					<div
						class="h-3.5 w-3.5 rounded-[3px]"
						style={`background:${cellColor(cell.pnl)}`}
						title={tooltip(cell)}
					></div>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Legend -->
	<div class="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
		<span>Less</span>
		<div class="h-3 w-3 rounded-[3px]" style="background: rgba(148,163,184,0.15)"></div>
		<div class="h-3 w-3 rounded-[3px]" style="background: rgba(16, 185, 129, 0.25)"></div>
		<div class="h-3 w-3 rounded-[3px]" style="background: rgba(16, 185, 129, 0.55)"></div>
		<span class="mr-2 ml-2">Profit</span>
		<div class="h-3 w-3 rounded-[3px]" style="background: rgba(244, 63, 94, 0.25)"></div>
		<div class="h-3 w-3 rounded-[3px]" style="background: rgba(244, 63, 94, 0.55)"></div>
		<span>Loss</span>
	</div>
</div>
