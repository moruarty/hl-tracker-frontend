<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import 'chartjs-adapter-date-fns';
  import type { ChartConfiguration, TimeScaleOptions } from 'chart.js';

  export let pnlHistory: [number, string][] = [];
  export let timeframe: 'day' | 'week' | 'month' | 'allTime';
  export let lastUpdated = 0;                 // <-- NEW

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function unitFor(tf: typeof timeframe): 'hour' | 'day' | 'week' | 'month' {
    if (tf === 'day') return 'hour';
    if (tf === 'week') return 'day';
    if (tf === 'month') return 'week';
    return 'month';
  }

  onMount(() => {
    if (!canvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Portfolio PnL',
          data: [],
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: 0
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: { unit: unitFor(timeframe) },
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          },
          y: {
            ticks: {
              color: '#94a3b8',
              callback: (v: unknown) => `$${Number(v).toLocaleString()}`
            },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          }
        },
        plugins: { legend: { display: false } },
        interaction: { intersect: false, mode: 'index' }
      }
    };

    chart = new Chart(canvas, config);
    applyData();
  });

  function applyData() {
    if (!chart) return;

    const labels = pnlHistory.map(([t]) => t);
    const data = pnlHistory.map(([, v]) => Number(v));

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;

    const x = chart.options.scales?.x as TimeScaleOptions | undefined;
    if (x?.time) x.time.unit = unitFor(timeframe);

    chart.update('none');
  }

  // Re-apply whenever inputs change OR the parent heartbeat ticks
  $: pnlHistory, timeframe, lastUpdated, applyData();   // <-- include lastUpdated

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<div class="h-96">
  <canvas bind:this={canvas}></canvas>
</div>
