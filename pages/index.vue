<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  const { loggedIn } = useAuth();
  const stocks = ref<any[]>([]);
  const loading = ref(false);
  const errorMsg = ref<string | null>(null);

  // Redirect to login if not authenticated
  if (!loggedIn) {
    await navigateTo('/auth/login');
  }

  async function fetchStocks() {
    if (!loggedIn) {
      return;
    }

    loading.value = true;
    errorMsg.value = null;
    stocks.value = [];

    try {
      const { data, error } = await useFetch<{ stocks: any[] }>('/api/stocks', {
        method: 'get',
        cache: 'no-cache',
      });

      if (error.value) {
        const msg = (error.value as any)?.message ?? 'Failed to fetch stock data';
        throw new Error(msg);
      }

      stocks.value = data.value?.stocks ?? [];
    } catch (e: any) {
      errorMsg.value = e?.message ?? 'Erreur lors de la récupération des données boursières.';
    } finally {
      loading.value = false;
    }
  }

  function formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
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
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Marchés Boursiers
      </h1>
      <p class="text-gray-600">
        Suivez les performances des principales actions en temps réel
      </p>
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
      <div
        v-for="stock in stocks"
        :key="stock.symbol"
        class="card hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ stock.symbol }}
          </h3>
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
            <span class="text-2xl font-bold text-gray-900">
              {{ formatPrice(stock.price) }}
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

          <div class="pt-3 border-t border-gray-100">
            <div class="flex justify-between text-sm text-gray-600">
              <span>Volume</span>
              <span class="font-medium">{{ formatVolume(stock.volume) }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600 mt-1">
              <span>Clôture précédente</span>
              <span class="font-medium">{{ formatPrice(stock.previousClose) }}</span>
            </div>
          </div>
        </div>
      </div>
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

    <!-- Refresh Button -->
    <div v-if="stocks.length > 0" class="mt-8 text-center">
      <button
        :disabled="loading"
        class="btn-secondary"
        @click="fetchStocks"
      >
        <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualiser les données
      </button>
    </div>
  </div>
</template>

<style scoped>
  .card:hover {
    transform: translateY(-2px);
  }
</style>
