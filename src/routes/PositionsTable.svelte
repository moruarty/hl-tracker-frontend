<script lang="ts">
  export let positions: any[] = [];
  export let markPrices: Record<string, string> = {};
</script>

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
