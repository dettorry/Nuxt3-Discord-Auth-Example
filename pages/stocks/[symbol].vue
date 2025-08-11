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
  const qty = ref<number>(1);
  const txLoading = ref(false);
  const txMsg = ref<string | null>(null);

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
      txMsg.value = `Achat réussi: ${quantity} ${symbol.value} à $${unitPrice}`;
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
      const held = lots.filter(l => l.symbol === symbol.value).reduce((a, b) => a + b.quantity, 0);
      if (held < quantity) {
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
      txMsg.value = `Vente réussie: ${quantity} ${symbol.value} à $${unitPrice}`;
    } catch (e: any) {
      txMsg.value = e?.message || 'Vente échouée';
    } finally {
      txLoading.value = false;
    }
  }
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

      <!-- Trading Controls -->
      <div v-if="quote" class="mt-4 rounded-md border border-gray-100 bg-white p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <label class="text-sm text-gray-700" for="qty">Quantité</label>
          <input
            id="qty"
            v-model.number="qty"
            type="number"
            min="1"
            step="1"
            class="w-24 rounded border-gray-300 focus:ring-green-500 focus:border-green-500"
          >
          <button :disabled="txLoading" class="btn-primary" @click="buy">Acheter</button>
          <button :disabled="txLoading" class="btn-secondary" @click="sell">Vendre</button>
        </div>
        <p v-if="txMsg" class="mt-2 text-sm" :class="txMsg.includes('réussi') ? 'text-green-600' : 'text-red-600'">{{ txMsg }}</p>
        <p class="mt-1 text-xs text-gray-500">Le prix utilisé est arrondi à l'unité, et le débit/crédit se fait depuis/vers la banque UnbelievaBoat après vérification des fonds.</p>
      </div>

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
