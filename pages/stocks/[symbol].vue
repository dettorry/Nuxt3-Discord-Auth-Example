<script setup lang="ts">
  /* eslint-disable import/extensions, import/no-unresolved, indent, object-curly-newline, curly, vue/singleline-html-element-content-newline */
  import { ref, watch, onMounted, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import StockChart from '~/components/StockChart.vue';

  const route = useRoute();
  const symbol = computed(() => String(route.params.symbol));
  type Period = '1J' | '1W' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

  const periods: { label: string; value: Period }[] = [
    { label: '1J', value: '1J' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '6M', value: '6M' },
    { label: 'YTD', value: 'YTD' },
    { label: '1Y', value: '1Y' },
    { label: '5Y', value: '5Y' },
    { label: 'ALL', value: 'ALL' },
  ];
  const selectedPeriod = ref<Period>('1M');
  const prices = ref<number[]>([]);
  const labels = ref<string[]>([]);
  const loading = ref(false);
  const errorMsg = ref<string | null>(null);
  const quote = ref<any | null>(null);

  function formatPrice(n: number | null | undefined) {
    if (n == null) return '-';
    return `$${Number(n).toFixed(2)}`;
  }
  function formatNumber(n: number | null | undefined) {
    if (n == null) return '-';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  async function fetchHistory() {
    loading.value = true;
    errorMsg.value = null;
    try {
      const quoteReq = useFetch(`/api/stocks/quote?symbol=${symbol.value}`);
      const { data, error } = await useFetch(`/api/stocks/history?symbol=${symbol.value}&range=${selectedPeriod.value}`);
      if (error.value) {
        throw new Error(error.value.message);
      }
      prices.value = data.value?.prices ?? [];
      labels.value = data.value?.labels ?? [];
      const q = await quoteReq;
      if (!q.error.value) {
        quote.value = q.data.value;
      }
    } catch (e: any) {
      errorMsg.value = e?.message ?? 'Erreur lors de la récupération du graphique.';
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchHistory);
  watch(() => selectedPeriod.value, fetchHistory);
  watch(() => route.params.symbol, fetchHistory);
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center gap-6">
    <!-- Header: Name, Price, Change -->
    <div v-if="quote" class="w-full max-w-xl flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ quote.longName || quote.shortName || symbol }}
        </h1>
        <div class="text-xs text-gray-500">{{ quote.symbol }} · {{ quote.currency }}</div>
      </div>
      <div class="text-right">
        <div class="text-3xl font-bold text-gray-900">{{ formatPrice(quote.price) }}</div>
        <div :class="[ 'text-sm', (quote.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' ]">
          {{ quote.change?.toFixed(2) ?? '-' }} ({{ quote.changePercent != null ? quote.changePercent.toFixed(2) : '-' }}%)
        </div>
      </div>
    </div>

    <!-- Period selector -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="period in periods"
        :key="period.value"
        :class="[
          'px-3 py-1 rounded-full border text-sm font-medium transition',
          selectedPeriod === period.value
            ? 'bg-green-500 text-white border-green-500'
            : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
        ]"
        @click="selectedPeriod = period.value"
      >
        {{ period.label }}
      </button>
    </div>
    <div class="w-full max-w-xl">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <span class="text-gray-600">Chargement du graphique...</span>
      </div>
      <div v-else-if="errorMsg" class="text-red-600 text-center py-4">
        {{ errorMsg }}
      </div>
      <StockChart v-else :prices="prices" :labels="labels" :period="selectedPeriod" />

      <!-- Stats Grid -->
      <div v-if="quote" class="mt-6 rounded-md border border-gray-100 bg-white p-4 shadow-sm">
        <div class="grid grid-cols-2 gap-3 text-sm text-gray-700 md:grid-cols-3">
          <div class="flex justify-between"><span>Clôture préc.</span><span class="font-medium">{{ formatPrice(quote.previousClose) }}</span></div>
          <div class="flex justify-between"><span>Ouverture</span><span class="font-medium">{{ formatPrice(quote.open) }}</span></div>
          <div class="flex justify-between"><span>Range jour</span><span class="font-medium">{{ formatPrice(quote.dayLow) }} - {{ formatPrice(quote.dayHigh) }}</span></div>
          <div class="flex justify-between"><span>Volume</span><span class="font-medium">{{ formatNumber(quote.volume) }}</span></div>
          <div class="flex justify-between"><span>Vol. moyen</span><span class="font-medium">{{ formatNumber(quote.averageVolume) }}</span></div>
          <div class="flex justify-between"><span>Cap. boursière</span><span class="font-medium">{{ formatNumber(quote.marketCap) }}</span></div>
          <div class="flex justify-between"><span>52 sem. bas/haut</span><span class="font-medium">{{ formatPrice(quote.fiftyTwoWeekLow) }} - {{ formatPrice(quote.fiftyTwoWeekHigh) }}</span></div>
          <div class="flex justify-between"><span>PER</span><span class="font-medium">{{ quote.peRatio ?? '-' }}</span></div>
          <div class="flex justify-between"><span>EPS (TTM)</span><span class="font-medium">{{ quote.epsTrailing ?? '-' }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>
