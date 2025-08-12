<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  const { loggedIn } = useAuth();
  type StockItem = {
    symbol: string;
    name?: string | null;
    currency?: string | null;
    price: number;
    change: number;
    changePercent: string; // 2 decimals as string
    volume: number;
    previousClose: number;
  };

  const stocks = ref<StockItem[]>([]);
  const loading = ref(false);
  const errorMsg = ref<string | null>(null);
  const search = ref('');
  const lastQuery = ref<string | null>(null);

  async function fetchStocks() {
    if (!loggedIn) {
      return;
    }

    loading.value = true;
    errorMsg.value = null;
    stocks.value = [];

    try {
      const { data, error } = await useFetch<{ stocks: StockItem[] }>(
        '/api/stocks',
        {
          method: 'get',
          cache: 'no-cache',
        },
      );

      if (error.value) {
        const msg = (error.value as any)?.message ?? 'Failed to fetch stock data';
        throw new Error(msg);
      }

      stocks.value = data.value?.stocks ?? [];
      lastQuery.value = null; // curated list mode
    } catch (e: any) {
      errorMsg.value = e?.message ?? 'Erreur lors de la récupération des données boursières.';
    } finally {
      loading.value = false;
    }
  }

  async function runSearch() {
    if (!loggedIn) {
      await navigateTo('/auth/login');
      return;
    }

    const q = search.value.trim();
    if (!q) {
      // Empty query -> curated list
      await fetchStocks();
      return;
    }

    loading.value = true;
    errorMsg.value = null;
    try {
      const searchData = await $fetch<{ results: Array<{ symbol: string }> }>(
        '/api/stocks/search',
        { params: { q } },
      );
      const symbols = (searchData?.results || []).map(r => r.symbol).filter(Boolean).slice(0, 20);
      lastQuery.value = q;
      if (symbols.length === 0) {
        stocks.value = [];
        return;
      }
      const quotesData = await $fetch<{ stocks: StockItem[] }>(
        '/api/stocks',
        { params: { symbols: symbols.join(',') } },
      );
      stocks.value = quotesData?.stocks ?? [];
    } catch (e: any) {
      errorMsg.value = e?.message || 'Recherche échouée';
    } finally {
      loading.value = false;
    }
  }

  function formatPrice(price: number, currency?: string | null): string {
    const cur = currency || 'USD';
    // Fallback to USD-like formatting if Intl fails
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(price);
    } catch {
      return `$${price.toFixed(2)}`;
    }
  }

  function formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  }

  function formatVolume(volume: number): string {
    let formattedVolume = volume.toString();
    if (volume >= 1000000) {
      formattedVolume = `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      formattedVolume = `${(volume / 1000).toFixed(1)}K`;
    }
    return formattedVolume;
  }

  // Fetch stocks on component mount
  onMounted(() => {
    if (loggedIn) {
      fetchStocks();
    }
  });

  // No client-side filtering; results are driven by runSearch/fetchStocks
</script>

<template>
  <div>
    <LoggedOut v-if="!loggedIn" />
    <div v-else class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Marchés Boursiers
      </h1>
      <p class="text-gray-600">
        Suivez les performances des principales actions en temps réel
      </p>
      <!-- Search + Refresh -->
      <div class="mt-4 max-w-2xl">
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div class="relative flex-1">
            <Icon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" icon="mdi:magnify" />
            <input
              v-model.trim="search"
              type="text"
              placeholder="Rechercher une action (symbole ou nom)"
              class="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-green-500 focus:border-green-500"
              @keyup.enter="runSearch"
            >
          </div>
          <button
            :disabled="loading"
            class="btn-secondary whitespace-nowrap"
            @click="runSearch"
          >
            <Icon class="w-4 h-4 mr-1 inline" icon="mdi:magnify" />
            Rechercher
          </button>
        </div>
      </div>
    </div>

    <div v-if="lastQuery" class="-mt-6 mb-4 text-sm text-gray-500">
      Résultats pour « {{ lastQuery }} »
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="flex items-center space-x-3">
        <Icon
          class="w-6 h-6 text-discord-500 animate-spin"
          icon="mdi:loading"
        />
        <span class="text-gray-600">Chargement des données boursières...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMsg" class="card">
      <div class="flex items-center space-x-3 text-red-600">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ errorMsg }}</span>
      </div>
      <button
        class="btn-primary mt-4"
        @click="fetchStocks"
      >
        Réessayer
      </button>
    </div>

    <!-- Stocks Grid -->
    <div v-else-if="stocks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <NuxtLink
        v-for="stock in stocks"
        :key="stock.symbol"
        :to="`/stocks/${stock.symbol}`"
        class="card hover:shadow-md transition-shadow duration-200 block"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ stock.symbol }}
              </h3>
              <span class="text-xs text-gray-500">{{ stock.currency || 'USD' }}</span>
            </div>
            <p v-if="stock.name" class="text-xs text-gray-500">
              {{ stock.name }}
            </p>
          </div>
          <div
            :class="[
              'px-2 py-1 rounded-full text-xs font-medium',
              stock.change >= 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            ]"
          >
            {{ formatChange(stock.change) }}
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-gray-900 flex items-center gap-1">
              <Icon class="w-[1.1em] h-[1.1em] text-green-500" icon="mdi:currency-usd" />
              {{ formatPrice(stock.price, stock.currency) }}
            </span>
            <span
              :class="[
                'text-sm font-medium',
                stock.change >= 0 ? 'text-green-600' : 'text-red-600'
              ]"
            >
              {{ stock.changePercent }}%
            </span>
          </div>

          <div class="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1">
                <Icon class="w-4 h-4 text-gray-400" icon="mdi:swap-vertical" />
                Volume
              </span>
              <span class="font-medium">{{ formatVolume(stock.volume) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1">
                <Icon class="w-4 h-4 text-gray-400" icon="mdi:chart-line" />
                Clôture préc.
              </span>
              <span class="font-medium">{{ formatPrice(stock.previousClose, stock.currency) }}</span>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty State -->
    <div v-else class="card text-center py-12">
      <Icon
        class="w-12 h-12 text-gray-400 mx-auto mb-4"
        icon="mdi:chart-line"
      />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Aucune donnée disponible
      </h3>
      <p class="text-gray-600 mb-4">
        Impossible de récupérer les données boursières pour le moment.
      </p>
      <button
        class="btn-primary"
        @click="fetchStocks"
      >
        Réessayer
      </button>
    </div>
  </div>
</template>

<style scoped>
  .card:hover {
    transform: translateY(-2px);
  }
</style>
