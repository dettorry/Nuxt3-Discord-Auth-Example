<script setup lang="ts">
  /* eslint-disable import/extensions, import/no-unresolved, indent, object-curly-newline, curly, vue/singleline-html-element-content-newline */
  import { ref, watch, onMounted, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { Icon } from '@iconify/vue';
  import StockChart from '~/components/StockChart.vue';

  // Balance polling/refresh composable
  const { refresh: refreshUnbBalance, applyDelta, balance: dynBalance } = useUnbBalance();

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
  const qty = ref<number>(1);
  const txLoading = ref(false);
  const txMsg = ref<string | null>(null);
  const held = ref<number>(0);
  const activeTab = ref<'buy' | 'sell'>('buy');

  const unitPriceRounded = computed(() => Math.round(Number(quote.value?.price || 0)) || 0);
  const quantitySafe = computed(() => Math.max(1, Math.floor(qty.value)));
  const totalAmount = computed(() => quantitySafe.value * unitPriceRounded.value);
  const canBuy = computed(() => {
    const bank = Number((dynBalance as any)?.value?.bank ?? (dynBalance as any)?.bank ?? 0);
    return totalAmount.value > 0 && bank >= totalAmount.value;
  });
  const canSell = computed(() => held.value >= quantitySafe.value);

  // Local portfolio helpers (stored per user+guild if available in auth/config)
  type Lot = { symbol: string; quantity: number; unitPrice: number; ts: number };
  function portfolioKey() {
    // Optional user and guild for namespacing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth: any = (useAuth?.() as any) || {};
    const uid = auth?.user?.id || auth?.user?.value?.id || 'anon';
    const cfg = useRuntimeConfig?.();
    const gid = (cfg as any)?.GUILD_ID || 'defaultGuild';
    return `portfolio:${uid}:${gid}`;
  }
  function readPortfolio(): Lot[] {
    if (process.server) return [];
    try {
      const raw = localStorage.getItem(portfolioKey());
      return raw ? (JSON.parse(raw) as Lot[]) : [];
    } catch {
      return [];
    }
  }
  function writePortfolio(lots: Lot[]) {
    if (process.server) return;
    localStorage.setItem(portfolioKey(), JSON.stringify(lots));
  }
  function addLot(lot: Lot) {
    const lots = readPortfolio();
    lots.push(lot);
    writePortfolio(lots);
  }
  function removeFromPortfolio(sym: string, count: number) {
    const reduced = readPortfolio().reduce(
      (acc, lot) => {
        if (acc.remaining <= 0 || lot.symbol !== sym) {
          acc.list.push(lot);
          return acc;
        }
        if (lot.quantity > acc.remaining) {
          acc.list.push({ ...lot, quantity: lot.quantity - acc.remaining });
          acc.remaining = 0;
        } else {
          acc.remaining -= lot.quantity;
        }
        return acc;
      },
      { list: [] as Lot[], remaining: count },
    );
    writePortfolio(reduced.list);
  }

  function recomputeHeld() {
    const lots = readPortfolio();
    held.value = lots.filter(l => l.symbol === symbol.value).reduce((a, b) => a + b.quantity, 0);
  }

  function formatPrice(n: number | null | undefined) {
    if (n == null) return '-';
    return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function formatCoins(n: number | null | undefined) {
    if (n == null) return '0';
    const v = Math.trunc(Number(n));
    if (!Number.isFinite(v)) return '0';
    return v.toLocaleString('fr-FR');
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
      if (!symbol.value) {
        // Wait for route param to be ready
        loading.value = false;
        return;
      }
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
  watch(
    () => route.params.symbol,
    () => { fetchHistory(); recomputeHeld(); },
    { immediate: true },
  );
  onMounted(() => {
    recomputeHeld();
    if (process.client) {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key && e.key.startsWith('portfolio:')) recomputeHeld();
      });
    }
  });

  async function buy() {
    txMsg.value = null;
    if (!quote.value) return;
    const quantity = Math.max(1, Math.floor(qty.value));
    const unitPrice = Math.round(Number(quote.value.price || 0));
    if (!unitPrice || unitPrice <= 0) {
      txMsg.value = 'Prix indisponible';
      return;
    }
    txLoading.value = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auth: any = (useAuth?.() as any) || {};
      const uid = auth?.user?.id || auth?.user?.value?.id;
      const cfg = useRuntimeConfig?.();
      const gid = (cfg as any)?.GUILD_ID;
      const { error } = await useFetch('/api/stocks/buy', {
        method: 'POST',
        body: {
          userId: uid,
          guildId: gid,
          symbol: symbol.value,
          quantity,
          unitPrice,
          reason: `Achat de ${quantity} actions ${symbol.value}`,
        },
      });
      if (error.value) throw new Error((error.value as any)?.message || 'Achat échoué');
      addLot({ symbol: symbol.value, quantity, unitPrice, ts: Date.now() });
      recomputeHeld();
      txMsg.value = `Achat réussi: ${quantity} ${symbol.value} à ${formatCoins(unitPrice)}`;
      // Optimistic: update balance instantly, then refresh in background
      applyDelta(-unitPrice * quantity);
      if (uid && gid) {
        // fire-and-forget to reconcile
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        refreshUnbBalance(uid, gid);
      }
    } catch (e: any) {
      txMsg.value = e?.message || 'Achat échoué';
    } finally {
      txLoading.value = false;
    }
  }

  async function sell() {
    txMsg.value = null;
    if (!quote.value) return;
    const quantity = Math.max(1, Math.floor(qty.value));
    const unitPrice = Math.round(Number(quote.value.price || 0));
    if (!unitPrice || unitPrice <= 0) {
      txMsg.value = 'Prix indisponible';
      return;
    }
    txLoading.value = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auth: any = (useAuth?.() as any) || {};
      const uid = auth?.user?.id || auth?.user?.value?.id;
      const cfg = useRuntimeConfig?.();
      const gid = (cfg as any)?.GUILD_ID;
      // Optional: check portfolio holdings locally before selling
      const lots = readPortfolio();
      const heldQty = lots.filter(l => l.symbol === symbol.value).reduce((a, b) => a + b.quantity, 0);
      if (heldQty < quantity) {
        throw new Error('Quantité insuffisante en portefeuille');
      }
      const { error } = await useFetch('/api/stocks/sell', {
        method: 'POST',
        body: {
          userId: uid,
          guildId: gid,
          symbol: symbol.value,
          quantity,
          unitPrice,
          reason: `Vente de ${quantity} actions ${symbol.value}`,
        },
      });
      if (error.value) throw new Error((error.value as any)?.message || 'Vente échouée');
      removeFromPortfolio(symbol.value, quantity);
      recomputeHeld();
      txMsg.value = `Vente réussie: ${quantity} ${symbol.value} à ${formatCoins(unitPrice)}`;
      // Optimistic: update balance instantly, then refresh in background
      applyDelta(unitPrice * quantity);
      if (uid && gid) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        refreshUnbBalance(uid, gid);
      }
    } catch (e: any) {
      txMsg.value = e?.message || 'Vente échouée';
    } finally {
      txLoading.value = false;
    }
  }

  watch(quote, (q) => {
    useHead({
      title: q?.longName
        ? `Chicken Stocks - ${q.longName}`
        : `Chicken Stocks - ${symbol.value}`,
    });
  });
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header avec style carte moderne -->
      <div v-if="quote" class="bg-white rounded-3xl border border-gray-200 p-8 mb-8">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <!-- Informations principales -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Icon class="text-2xl text-green-600" icon="mdi:trending-up" />
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900 leading-tight">
                  {{ quote.longName || quote.shortName || symbol }}
                </h1>
                <div class="text-sm text-gray-500 flex items-center">
                  <span>{{ quote.symbol }}</span>
                  <Icon icon="mdi:circle-small" />
                  <span>{{ quote.currency }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Prix et variation -->
          <div class="text-right lg:text-center">
            <div class="flex items-center justify-end lg:justify-center gap-2 mb-2">
              <Icon class="text-3xl text-green-600" icon="mdi:chicken-leg-outline" />
              <span class="text-4xl font-bold text-gray-900">{{ formatPrice(quote.price) }}</span>
            </div>
            <div class="flex items-center justify-end lg:justify-center gap-2">
              <Icon
                :class="[ 'text-lg', (quote.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' ]"
                :icon="(quote.change ?? 0) >= 0 ? 'mdi:arrow-up-bold' : 'mdi:arrow-down-bold'"
              />
              <span :class="[ 'text-lg font-semibold', (quote.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' ]">
                {{ quote.change?.toFixed(2) ?? '-' }} ({{ quote.changePercent != null ? quote.changePercent.toFixed(2) : '-' }}%)
              </span>
            </div>
          </div>
        </div>

        <!-- Portfolio info dans l'en-tête -->
        <div class="mt-6 pt-6 border-t border-gray-100">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <Icon class="text-lg text-green-600" icon="mdi:wallet-outline" />
              <span class="text-gray-600">En portefeuille:</span>
              <span class="font-bold text-gray-900 text-base">{{ held }}</span>
              <span class="text-gray-600">action{{ held !== 1 ? 's' : '' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-gray-600">Solde disponible:</span>
              <Icon class="text-lg text-green-600" icon="mdi:chicken-leg-outline" />
              <span class="font-bold text-gray-900 text-base">
                {{ formatCoins((dynBalance as any)?.value?.bank ?? (dynBalance as any)?.bank ?? 0) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <!-- Graphique et contrôles (2/3 de la largeur) -->
        <div class="xl:col-span-2">
          <!-- Sélecteur de période modernisé -->
          <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon class="text-xl text-green-600" icon="mdi:chart-timeline-variant" />
              Période d'analyse
            </h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="period in periods"
                :key="period.value"
                :class="[
                  'px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200',
                  selectedPeriod === period.value
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-600 border border-gray-200'
                ]"
                @click="selectedPeriod = period.value"
              >
                {{ period.label }}
              </button>
            </div>
          </div>

          <!-- Graphique -->
          <div class="bg-white rounded-2xl border border-gray-200 p-6">
            <div v-if="loading" class="flex items-center justify-center py-20">
              <div class="text-center">
                <Icon class="text-4xl text-green-600 animate-spin mb-4" icon="mdi:loading" />
                <span class="text-gray-600 text-lg">Chargement du graphique...</span>
              </div>
            </div>
            <div v-else-if="errorMsg" class="text-center py-20">
              <Icon class="text-4xl text-red-500 mb-4" icon="mdi:alert-circle-outline" />
              <p class="text-red-600 text-lg">{{ errorMsg }}</p>
            </div>
            <StockChart v-else :prices="prices" :labels="labels" :period="selectedPeriod" />
          </div>

          <!-- Statistiques détaillées -->
          <div v-if="quote" class="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon class="text-xl text-green-600" icon="mdi:finance" />
              Statistiques détaillées
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-if="quote.previousClose" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">Clôture précédente</div>
                <div class="font-bold text-gray-900">{{ formatPrice(quote.previousClose) }}</div>
              </div>
              <div v-if="quote.open" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">Ouverture</div>
                <div class="font-bold text-gray-900">{{ formatPrice(quote.open) }}</div>
              </div>
              <div v-if="quote.dayLow" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">Range du jour</div>
                <div class="font-bold text-gray-900">{{ formatPrice(quote.dayLow) }} - {{ formatPrice(quote.dayHigh) }}</div>
              </div>
              <div v-if="quote.volume" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">Volume</div>
                <div class="font-bold text-gray-900">{{ formatNumber(quote.volume) }}</div>
              </div>
              <div v-if="quote.averageVolume" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">Volume moyen</div>
                <div class="font-bold text-gray-900">{{ formatNumber(quote.averageVolume) }}</div>
              </div>
              <div v-if="quote.marketCap" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">Capitalisation</div>
                <div class="font-bold text-gray-900">{{ formatNumber(quote.marketCap) }}</div>
              </div>
              <div v-if="quote.peRatio" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">PER</div>
                <div class="font-bold text-gray-900">{{ quote.peRatio }}</div>
              </div>
              <div v-if="quote.epsTrailing" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">EPS (TTM)</div>
                <div class="font-bold text-gray-900">{{ quote.epsTrailing }}</div>
              </div>
              <div v-if="quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh" class="bg-gray-50 rounded-xl p-4">
                <div class="text-sm text-gray-600 mb-1">52 semaines (min - max)</div>
                <div class="font-bold text-gray-900">{{ formatPrice(quote.fiftyTwoWeekLow) }} - {{ formatPrice(quote.fiftyTwoWeekHigh) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel de trading (1/3 de la largeur) -->
        <div v-if="quote" class="xl:col-span-1">
          <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-8">
            <!-- En-tête du panel -->
            <div class="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
              <h3 class="text-xl font-bold flex items-center gap-2">
                <Icon class="text-2xl" icon="mdi:swap-horizontal-variant" />
                Trading
              </h3>
              <p class="text-green-100 text-sm mt-1">Achetez ou vendez vos actions</p>
            </div>

            <div class="p-6">
              <!-- Tabs Achat/Vente -->
              <div class="flex bg-gray-100 rounded-xl p-1 mb-6 gap-2">
                <button
                  :class="[
                    'flex-1 py-2 px-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-colors duration-200',
                    activeTab === 'buy'
                      ? 'bg-white text-green-700 shadow-sm ring-2 ring-green-500'
                      : 'bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-700'
                  ]"
                  @click="activeTab = 'buy'"
                >
                  <Icon class="text-xl" icon="mdi:arrow-up-bold" />
                  <span>Acheter</span>
                </button>
                <button
                  :class="[
                    'flex-1 py-2 px-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-colors duration-200',
                    activeTab === 'sell'
                      ? 'bg-white text-red-700 shadow-sm ring-2 ring-red-500'
                      : 'bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-700'
                  ]"
                  @click="activeTab = 'sell'"
                >
                  <Icon class="text-xl" icon="mdi:arrow-down-bold" />
                  <span>Vendre</span>
                </button>
              </div>

              <!-- Prix unitaire -->
              <div class="bg-gray-50 rounded-xl p-4 mb-6">
                <div class="text-sm text-gray-600 mb-2">Prix unitaire</div>
                <div class="flex items-center justify-center gap-2">
                  <Icon class="text-2xl text-green-600" icon="mdi:chicken-leg-outline" />
                  <span class="text-2xl font-bold text-gray-900">{{ formatCoins(unitPriceRounded) }}</span>
                </div>
              </div>

              <!-- Quantité -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2" for="qty-input">
                  Quantité
                </label>
                <div class="relative">
                  <input
                    id="qty-input"
                    v-model.number="qty"
                    type="number"
                    min="1"
                    step="1"
                    class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-lg font-medium"
                  >
                  <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    actions
                  </div>
                </div>
              </div>

              <!-- Total -->
              <div class="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
                <div class="text-sm text-green-700 mb-1">Montant total</div>
                <div class="flex items-center justify-center gap-2">
                  <Icon class="text-2xl text-green-600" icon="mdi:chicken-leg-outline" />
                  <span class="text-2xl font-bold text-green-800">{{ formatCoins(totalAmount) }}</span>
                </div>
              </div>

              <!-- Messages de validation -->
              <div v-if="activeTab === 'buy' && !canBuy" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div class="flex items-center gap-2">
                  <Icon class="text-red-500" icon="mdi:alert-circle-outline" />
                  <span class="text-red-700 text-sm font-medium">Fonds insuffisants</span>
                </div>
              </div>

              <div v-if="activeTab === 'sell' && !canSell" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div class="flex items-center gap-2">
                  <Icon class="text-red-500" icon="mdi:alert-circle-outline" />
                  <span class="text-red-700 text-sm font-medium">Quantité insuffisante en portefeuille</span>
                </div>
              </div>

              <!-- Boutons d'action -->
              <div class="space-y-4">
                <button
                  v-if="activeTab === 'buy'"
                  :disabled="txLoading || !canBuy"
                  :class="[
                    'w-full py-4 px-6 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 transition-colors duration-200 shadow-sm',
                    txLoading || !canBuy
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-500'
                  ]"
                  @click="buy"
                >
                  <Icon v-if="txLoading" class="animate-spin text-xl" icon="mdi:loading" />
                  <Icon v-else class="text-xl" icon="mdi:cart-plus" />
                  <span>{{ txLoading ? 'Achat en cours...' : 'Acheter' }}</span>
                </button>

                <button
                  v-if="activeTab === 'sell'"
                  :disabled="txLoading || !canSell"
                  :class="[
                    'w-full py-4 px-6 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 transition-colors duration-200 shadow-sm',
                    txLoading || !canSell
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-500'
                  ]"
                  @click="sell"
                >
                  <Icon v-if="txLoading" class="animate-spin text-xl" icon="mdi:loading" />
                  <Icon v-else class="text-xl" icon="mdi:cart-minus" />
                  <span>{{ txLoading ? 'Vente en cours...' : 'Vendre' }}</span>
                </button>
              </div>

              <!-- Message de transaction -->
              <div v-if="txMsg" class="mt-4 p-4 rounded-xl" :class="txMsg.includes('réussi') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
                <div class="flex items-center gap-2">
                  <Icon
                    :class="txMsg.includes('réussi') ? 'text-green-600' : 'text-red-600'"
                    :icon="txMsg.includes('réussi') ? 'mdi:check-circle' : 'mdi:alert-circle'"
                  />
                  <span :class="txMsg.includes('réussi') ? 'text-green-800' : 'text-red-800'" class="text-sm font-medium">
                    {{ txMsg }}
                  </span>
                </div>
              </div>

              <!-- Note explicative -->
              <div class="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div class="flex items-start gap-2">
                  <Icon class="text-blue-500 mt-0.5 flex-shrink-0" icon="mdi:information-outline" />
                  <div class="text-xs text-blue-700 leading-relaxed">
                    <p class="font-medium mb-1">Informations importantes :</p>
                    <p>• Le prix est arrondi à l'unité</p>
                    <p>• Les transactions sont traitées via UnbelievaBoat</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .btn-primary {
    @apply bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors duration-200;
  }

  .btn-primary:disabled {
    @apply bg-gray-300 text-gray-500 cursor-not-allowed;
  }

  .btn-secondary {
    @apply bg-red-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-red-700 transition-colors duration-200;
  }

  .btn-secondary:disabled {
    @apply bg-gray-300 text-gray-500 cursor-not-allowed;
  }

  /* Amélioration des inputs */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
  }

  /* Style pour le sticky trading panel */
  .sticky {
    position: sticky;
    top: 2rem;
  }

  @media (max-width: 1279px) {
    .sticky {
      position: relative;
      top: auto;
    }
  }
</style>
