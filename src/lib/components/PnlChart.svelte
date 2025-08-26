<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-date-fns';
	import type { ChartConfiguration, TimeScaleOptions } from 'chart.js';

	export let pnlHistory: [number, string][] = [];
	export let timeframe: 'day' | 'week' | 'month' | 'allTime';
	export let lastUpdated = 0;

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function unitFor(tf: typeof timeframe): 'hour' | 'day' | 'week' | 'month' {
		if (tf === 'day') return 'hour';
		if (tf === 'week') return 'day';
		if (tf === 'month') return 'week';
		return 'month';
	}

	type Point = { x: number; y: number };

	// Insert an exact y=0 point when consecutive points change sign
	function insertZeroCrossings(points: Point[]): Point[] {
		if (points.length < 2) return points.slice();
		const out: Point[] = [points[0]];
		for (let i = 1; i < points.length; i++) {
			const a = out[out.length - 1];
			const b = points[i];
			if (a.y === 0 || b.y === 0) {
				out.push(b);
				continue;
			}
			const aPos = a.y > 0,
				bPos = b.y > 0;
			if (aPos !== bPos) {
				const dy = b.y - a.y;
				if (dy !== 0) {
					const t = -a.y / dy; // a.y + t*dy = 0
					const x0 = a.x + t * (b.x - a.x);
					out.push({ x: x0, y: 0 });
				}
			}
			out.push(b);
		}
		return out;
	}

	onMount(() => {
		if (!canvas) return;

		const config: ChartConfiguration<'line', Point[]> = {
			type: 'line',
			data: {
				datasets: [
					// —— Red area under 0 ——
					{
						label: 'PnL area (-)',
						data: [],
						parsing: { xAxisKey: 'x', yAxisKey: 'y' },
						borderWidth: 1,
						pointRadius: 0,
						tension: 0.1,
						fill: 'origin',
						backgroundColor: 'rgba(220, 38, 38, 0.15)',
						order: 1
					},
					// —— Green area above 0 ——
					{
						label: 'PnL area (+)',
						data: [],
						parsing: { xAxisKey: 'x', yAxisKey: 'y' },
						borderWidth: 1,
						pointRadius: 0,
						tension: 0.1,
						fill: 'origin',
						backgroundColor: 'rgba(22, 163, 74, 0.15)',
						order: 2
					},
					// —— Main multi-color line ——
					{
						label: 'PnL',
						data: [],
						parsing: { xAxisKey: 'x', yAxisKey: 'y' },
						segment: {
							borderColor(ctx) {
								const y0 = ctx.p0?.parsed?.y;
								const y1 = ctx.p1?.parsed?.y;
								if (y0 == null || y1 == null) return '#0ea5e9';
								// thanks to zero-insertion, segments never straddle zero
								const sign = (y0 !== 0 ? y0 : y1) >= 0 ? 1 : -1;
								return sign >= 0 ? '#16a34a' : '#dc2626';
							}
						},
						borderWidth: 2,
						tension: 0.1,
						pointRadius: 0,
						fill: false,
						order: 3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				normalized: true,
				elements: { point: { radius: 0, hitRadius: 0, hoverRadius: 0 } },
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
						grid: {
							color: (ctx) =>
								ctx.tick?.value === 0 ? 'rgba(148,163,184,0.9)' : 'rgba(148,163,184,0.1)',
							lineWidth: (ctx) => (ctx.tick?.value === 0 ? 2 : 1)
						}
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: { mode: 'nearest', intersect: false }
				},
				interaction: { mode: 'nearest', intersect: false }
			}
		};

		chart = new Chart(canvas, config);
		applyData(true);
	});

	function applyData(first = false) {
		if (!chart) return;

		// Base points (sorted) and zero-crossing insertion
		const base: Point[] = pnlHistory
			.map(([ts, v]) => ({ x: Number(ts), y: Number(v) }))
			.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
			.sort((a, b) => a.x - b.x);

		const points = insertZeroCrossings(base);

		// Areas: clamp to 0 instead of using nulls
		const greenArea = points.map((p) => ({ x: p.x, y: Math.max(0, p.y) }));
		const redArea = points.map((p) => ({ x: p.x, y: Math.min(0, p.y) }));

		// Assign datasets (order: red fill, green fill, line)
		chart.data.datasets[0].data = redArea;
		chart.data.datasets[1].data = greenArea;
		chart.data.datasets[2].data = points;

		// Keep 0 visible
		const minY = points.reduce((m, p) => Math.min(m, p.y), Infinity);
		const maxY = points.reduce((m, p) => Math.max(m, p.y), -Infinity);
		const y = chart.options.scales?.y as any;
		if (y) {
			y.suggestedMin = Math.min(minY, 0);
			y.suggestedMax = Math.max(maxY, 0);
		}

		// Update timeframe unit
		const x = chart.options.scales?.x as TimeScaleOptions | undefined;
		if (x?.time) x.time.unit = unitFor(timeframe);

		chart.update(first ? undefined : 'none');
	}

	$: (pnlHistory, timeframe, lastUpdated, applyData());

	onDestroy(() => {
		chart?.destroy();
		chart = null;
	});
</script>

<div class="h-[28rem] w-full md:h-[34rem]">
	<canvas bind:this={canvas}></canvas>
</div>
