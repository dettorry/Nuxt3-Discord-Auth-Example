<script setup lang="ts">
  import { computed } from 'vue';
  import { Line } from 'vue-chartjs';
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
  } from 'chart.js';
  import type { ChartOptions } from 'chart.js';

  ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale);

  const props = withDefaults(defineProps<{
    prices: number[];
    labels: string[];
    period?: '1J' | '1W' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';
    maxPoints?: number; // cap points for performance/clarity
  }>(), {
    maxPoints: 1000,
    period: '1M',
  });

  function downsampleAverage(values: number[], labels: string[], maxPoints: number) {
    const len = Math.min(values.length, labels.length);
    if (len <= maxPoints) {
      return { values: values.slice(), labels: labels.slice() };
    }

    const bucketSize = Math.ceil(len / maxPoints);
    const outValues: number[] = [];
    const outLabels: string[] = [];

    for (let start = 0; start < len; start += bucketSize) {
      const end = Math.min(len, start + bucketSize);
      if (end <= start) {
        break;
      }
      let sum = 0;
      let count = 0;
      for (let i = start; i < end; i += 1) {
        const v = values[i];
        if (v != null && Number.isFinite(v)) {
          sum += v;
          count += 1;
        }
      }
      // average of bucket; fallback to last value if no valid number
      const avg = count > 0 ? sum / count : values[end - 1] ?? values[start];
      // pick middle label from bucket window
      const mid = Math.floor((start + end - 1) / 2);
      outValues.push(avg);
      outLabels.push(labels[mid]);
    }

    // If we produced more than maxPoints due to rounding, trim from the start
    if (outValues.length > maxPoints) {
      const excess = outValues.length - maxPoints;
      return {
        values: outValues.slice(excess),
        labels: outLabels.slice(excess),
      };
    }
    return { values: outValues, labels: outLabels };
  }

  const reduced = computed(() => downsampleAverage(props.prices, props.labels, props.maxPoints));

  const chartData = computed(() => ({
    labels: reduced.value.labels,
    datasets: [
      {
        label: 'Prix',
        data: reduced.value.values,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        tension: 0.35, // a bit smoother visually
        fill: true,
        spanGaps: true,
        pointRadius: 0,
        pointHoverRadius: 3,
      },
    ],
  }));

  function formatTick(iso: string, period: string): string {
    const d = new Date(iso);
    const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', opts).format(d);
    switch (period) {
      case '1J':
        return fmt({ hour: '2-digit', minute: '2-digit' });
      case '1W':
        return fmt({ day: '2-digit' });
      case '1M':
        return fmt({ day: '2-digit', month: 'short' });
      case '6M':
        return fmt({ month: 'short' });
      case 'YTD':
        return fmt({ month: 'short' });
      case '1Y':
      case '5Y':
      case 'ALL':
        return fmt({ month: 'short', year: '2-digit' });
      default:
        return fmt({ day: '2-digit', month: 'short' });
    }
  }

  function formatTooltipTitle(iso: string, period: string): string {
    const d = new Date(iso);
    const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', opts).format(d);
    switch (period) {
      case '1J':
        return fmt({
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      case '1W':
      case '1M':
        return fmt({ day: '2-digit', month: 'short' });
      case '6M':
        return fmt({ day: '2-digit', month: 'short', year: 'numeric' });
      case 'YTD':
      case '1Y':
      case '5Y':
      case 'ALL':
        return fmt({ month: 'short', year: 'numeric' });
      default:
        return fmt({ day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  const chartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        intersect: false,
        callbacks: {
          title: (items) => {
            if (!items || items.length === 0) {
              return '';
            }
            const idx = items[0].dataIndex;
            const iso = reduced.value.labels[idx];
            return formatTooltipTitle(iso, props.period);
          },
        },
      },
    },
    animation: false as const,
    interaction: { intersect: false, mode: 'nearest' },
    elements: { point: { radius: 0 } },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 6,
          callback: (_val, index) => {
            const idx = Number(index);
            const iso = reduced.value.labels[idx];
            return iso ? formatTick(iso, props.period) : '';
          },
        },
      },
      y: {
        ticks: {
          maxTicksLimit: 5,
        },
      },
    },
  }));
</script>

<template>
  <Line :data="chartData" :options="chartOptions" />
</template>
