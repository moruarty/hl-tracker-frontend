<script lang="ts">
  import type { CalendarStats } from '$lib/types/analytics';
  import PnlCalendarMonth from '$lib/components/PnlCalendarMonth.svelte';

  export let calendarData: CalendarStats | null = null;

  const dayToDate = (dayNum: string | number) => new Date(Number(dayNum) * 86_400_000);

  // Build entries from API map
  $: entries =
    calendarData
      ? Object.entries(calendarData.daily_pnl || {}).map(([k, v]) => ({
          day: dayToDate(k),
          pnl: v
        }))
      : [];

  // Default month/year: use latest entry if present, else current
  function latestEntryDate(): Date {
    if (!entries.length) return new Date();
    return entries.reduce((a, b) => (a.day > b.day ? a : b)).day;
  }
  $: defaultBase = latestEntryDate();
  $: selMonth = (defaultBase.getUTCMonth() + 1); // 1..12
  $: selYear  = defaultBase.getUTCFullYear();

  // Month/year options based on entries (fallback to current year & +/-1 around it)
  $: monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  $: yearsFromData = (() => {
    const set = new Set<number>();
    for (const e of entries) set.add(e.day.getUTCFullYear());
    if (set.size === 0) {
      const y = new Date().getUTCFullYear();
      set.add(y - 1); set.add(y); set.add(y + 1);
    }
    return Array.from(set).sort((a,b)=>a-b);
  })();

  // Stats cards (unchanged)
  const MULTIPLIER = 1;
  function fmtDuration(totalMs: number) {
    const ms = Math.max(0, Math.round(totalMs));
    const s  = Math.floor(ms / 1000);
    const d  = Math.floor(s / 86400);
    const h  = Math.floor((s % 86400) / 3600);
    const m  = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
  $: avgAllMs  = (calendarData?.avg_hold_time ?? 0) * MULTIPLIER;
  $: avgWinMs  = (calendarData?.avg_hold_time_profit ?? 0) * MULTIPLIER;
  $: avgLossMs = (calendarData?.avg_hold_time_loss ?? 0) * MULTIPLIER;
  $: longShortRatio = calendarData?.long_short_ratio ?? 0;
  $: winLongPct  = (calendarData?.win_rate_long ?? 0) * 100;
  $: winShortPct = (calendarData?.win_rate_short ?? 0) * 100;
  $: totalDays = calendarData ? Object.keys(calendarData.daily_pnl || {}).length : 0;
  $: profitableDays = calendarData ? Object.values(calendarData.daily_pnl || {}).filter(v => v > 0).length : 0;
  $: greenPct = totalDays ? (profitableDays / totalDays) * 100 : 0;
</script>

<!-- Stats grid (unchanged) -->
<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Average hold time</div>
    <div class="mt-1 text-2xl font-semibold text-white">{fmtDuration(avgAllMs)}</div>
  </div>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Avg hold (winning trades)</div>
    <div class="mt-1 text-2xl font-semibold text-emerald-400">{fmtDuration(avgWinMs)}</div>
  </div>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Avg hold (losing trades)</div>
    <div class="mt-1 text-2xl font-semibold text-rose-400">{fmtDuration(avgLossMs)}</div>
  </div>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Long / Short Ratio</div>
    <div class="mt-1 text-2xl font-semibold text-white">
      {longShortRatio.toFixed(2)} <span class="text-slate-400 text-base">L/S</span>
    </div>
    <div class="mt-1 text-slate-400 text-sm">(add counts when API provides them)</div>
  </div>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Win rate (Long)</div>
    <div class="mt-1 text-2xl font-semibold text-emerald-400">{winLongPct.toFixed(1)}%</div>
  </div>
  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Win rate (Short)</div>
    <div class="mt-1 text-2xl font-semibold text-emerald-400">{winShortPct.toFixed(1)}%</div>
  </div>

  <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
    <div class="text-slate-400 text-sm">Daily PnL summary</div>
    <div class="mt-1 text-lg text-white">
      {profitableDays}/{totalDays} profitable days
      <span class="text-slate-400">({greenPct.toFixed(1)}%)</span>
    </div>
  </div>
    <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div class="text-slate-400 text-sm">Avg hold (Long)</div>
      <div class="mt-1 text-lg font-semibold text-emerald-400">
        {fmtDuration(calendarData?.avg_hold_time_long ?? 0)}
      </div>
    </div>
    <div class="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div class="text-slate-400 text-sm">Avg hold (Short)</div>
      <div class="mt-1 text-lg font-semibold text-rose-400">
          {fmtDuration(calendarData?.avg_hold_time_short ?? 0)}
      </div>
    </div>
</div>

<!-- Controls -->
<div class="mt-6 mb-2 flex flex-wrap items-center gap-3">
  <label for="month-select" class="text-sm text-slate-400">Month</label>
  <select id="month-select" bind:value={selMonth} class="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white">
    {#each monthOptions as m}
      <option value={m.value}>{m.label}</option>
    {/each}
  </select>

  <label for="year-select" class="ml-4 text-sm text-slate-400">Year</label>
  <select id="year-select" bind:value={selYear} class="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white">
    {#each yearsFromData as y}
      <option value={y}>{y}</option>
    {/each}
  </select>
</div>

<!-- Month calendar -->
<div>
  <PnlCalendarMonth {entries} month={+selMonth} year={+selYear} />
</div>
