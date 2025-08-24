<script lang="ts">
	import { onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-date-fns';
	import type { ChartConfiguration, TimeScaleOptions } from 'chart.js';

	export let pnlHistory: [number, string][] = [];
	export let timeframe: 'day' | 'week' | 'month' | 'allTime';

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	$: {
		if (canvas && pnlHistory && pnlHistory.length > 0) {
			const labels = pnlHistory.map((p) => p[0]);
			const data = pnlHistory.map((p) => parseFloat(p[1]));

			let timeUnit: 'hour' | 'day' | 'week' | 'month' = 'day';
			if (timeframe === 'day') timeUnit = 'hour';
			if (timeframe === 'week') timeUnit = 'day';
			if (timeframe === 'month') timeUnit = 'week';
			if (timeframe === 'allTime') timeUnit = 'month';

			if (chart) {
				chart.data.labels = labels;
				chart.data.datasets[0].data = data;
				if (chart.options.scales?.x) {
					(chart.options.scales.x as TimeScaleOptions).time.unit = timeUnit;
				}
				chart.update('none');
			} else {
				const config: ChartConfiguration = {
					type: 'line',
					data: {
						labels,
						datasets: [{
							label: 'Portfolio PnL',
							data,
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
								time: { unit: timeUnit },
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.1)' }
							},
							y: {
								ticks: {
									color: '#94a3b8',
									callback: (value: any) => `$${value.toLocaleString()}`
								},
								grid: { color: 'rgba(148, 163, 184, 0.1)' }
							}
						},
						plugins: { legend: { display: false } },
						interaction: { intersect: false, mode: 'index' }
					}
				};
				chart = new Chart(canvas, config);
			}
		}
	}

	onDestroy(() => {
		chart?.destroy();
	});
</script>

<div class="h-96">
	<canvas bind:this={canvas}></canvas>
</div>