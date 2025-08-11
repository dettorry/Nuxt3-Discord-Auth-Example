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

  async function fetchHistory() {
    loading.value = true;
    errorMsg.value = null;
    try {
      const { data, error } = await useFetch(`/api/stocks/history?symbol=${symbol.value}&range=${selectedPeriod.value}`);
      if (error.value) {
        throw new Error(error.value.message);
      }
      prices.value = data.value?.prices ?? [];
      labels.value = data.value?.labels ?? [];
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
  <div class="h-full flex flex-col items-center justify-center gap-8">
    <h1 class="text-2xl font-bold mb-6">
      Action {{ symbol }}
    </h1>
    <div class="flex flex-wrap gap-2 mb-6">
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
    </div>
  </div>
</template>
