<script lang="ts">
  export let positions: any[] = [];
  export let markPrices: Record<string, string> = {};

  // Adaptive number formatting
  // - >= 1  → show with 1 decimal (e.g., 123456.0, 123456.1)
  // - < 1   → up to 12 decimals, trimmed (e.g., 0.0003456)
  function formatPrice(raw: number | string | undefined | null): string {
    if (raw === undefined || raw === null || raw === '') return 'N/A';
    const n = typeof raw === 'number' ? raw : parseFloat(raw);
    if (!Number.isFinite(n)) return 'N/A';
    if (n === 0) return '0.0';

    const abs = Math.abs(n);

    if (abs >= 1) {
      return n.toFixed(1); // no commas, fixed 1 decimal
    }

    const maxDp = 8;
    const fixed = n.toFixed(maxDp);
    const trimmed = fixed
      .replace(/(\.\d*?[1-9])0+$/, '$1') // trim trailing zeros
      .replace(/\.0+$/, '.0');           // keep ".0" if needed

    return trimmed;
  }
</script>

{#if positions.length > 0}
  <div class="w-full">
    <table class="w-full text-left whitespace-nowrap">
      <thead class="border-b border-slate-200 text-sm text-slate-500 uppercase">
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
                {p.coin}
                {p.leverage.value}x
              </div>
            </td>
            <td class="p-4">{Math.abs(parseFloat(p.szi)).toFixed(4)}</td>
            <td class="p-4">${formatPrice(p.positionValue)}</td>
            <td class="p-4">${formatPrice(p.entryPx)}</td>
            <td class="p-4 font-mono">
              {markPrices[p.coin] ? formatPrice(markPrices[p.coin]) : 'N/A'}
            </td>
            <td class="p-4">${formatPrice(p.liquidationPx)}</td>
            <td class="p-4">
              ${formatPrice(p.marginUsed)} ({p.leverage.type})
            </td>
            <td
              class="p-4 font-mono"
              class:text-green-600={parseFloat(p.unrealizedPnl) >= 0}
              class:text-red-600={parseFloat(p.unrealizedPnl) < 0}
            >
              ${formatPrice(p.unrealizedPnl)}
              <span class="text-sm text-slate-500">
                ({(parseFloat(p.returnOnEquity) * 100).toFixed(5)}%)
              </span>
            </td>
            <td
              class="p-4 font-mono"
              class:text-green-600={fundingDisplay >= 0}
              class:text-red-600={fundingDisplay < 0}
            >
              ${fundingDisplay.toFixed(4)}
            </td>
            <td class="p-4 text-slate-500">N/A</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="text-center text-lg text-slate-500">No open positions found.</p>
{/if}
