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

  const unitPriceRounded = computed(() => Math.round(Number(quote.value?.price || 0)) || 0);
  const quantitySafe = computed(() => Math.max(1, Math.floor(qty.value)));
  const totalAmount = computed(() => quantitySafe.value * unitPriceRounded.value);
  const canBuy = computed(() => {
    const bank = Number((dynBalance as any)?.value?.bank ?? (dynBalance as any)?.bank ?? 0);
    return totalAmount.value > 0 && bank >= totalAmount.value;
  });

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
  <div class="h-full flex flex-col items-center justify-center gap-6 px-4 md:px-0">
    <!-- Header: Name, Price, Change -->
    <div v-if="quote" class="w-full max-w-4xl flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ quote.longName || quote.shortName || symbol }}
        </h1>
        <div class="text-xs text-gray-500">{{ quote.symbol }} · {{ quote.currency }}</div>
      </div>
      <div class="text-right">
        <div class="flex gap-1 items-center text-3xl font-bold text-gray-900">
          <Icon class="align-middle" icon="mdi:chicken-leg-outline" />
          <span>{{ formatPrice(quote.price) }}</span>
        </div>
        <div :class="[ 'text-sm', (quote.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' ]">
          {{ quote.change?.toFixed(2) ?? '-' }} ({{ quote.changePercent != null ? quote.changePercent.toFixed(2) : '-' }}%)
        </div>
      </div>
    </div>

    <!-- Period selector -->
    <div class="flex flex-wrap gap-2 w-full max-w-4xl">
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

    <div class="w-full max-w-4xl">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <span class="text-gray-600">Chargement du graphique...</span>
      </div>
      <div v-else-if="errorMsg" class="text-red-600 text-center py-4">
        {{ errorMsg }}
      </div>
      <StockChart v-else :prices="prices" :labels="labels" :period="selectedPeriod" />

      <!-- Trading Controls -->
      <div v-if="quote" class="mt-4 rounded-md border border-gray-100 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between text-sm text-gray-700">
          <div>En portefeuille: <span class="font-medium">{{ held }}</span> action<span v-if="held !== 1">s</span></div>
          <div class="flex items-center gap-1">
            <span>Prix unitaire:</span>
            <Icon class="align-middle" icon="mdi:chicken-leg-outline" />
            <span class="font-medium">{{ formatCoins(unitPriceRounded) }}</span>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <label class="text-sm text-gray-700" for="qty">Quantité</label>
          <input
            id="qty"
            v-model.number="qty"
            type="number"
            min="1"
            step="1"
            class="w-24 rounded border-gray-300 focus:ring-green-500 focus:border-green-500"
          >
          <div class="text-sm text-gray-700 flex items-center gap-1">
            <span>Total:</span>
            <Icon class="align-middle" icon="mdi:chicken-leg-outline" />
            <span class="font-semibold">{{ formatCoins(totalAmount) }}</span>
          </div>
          <button :disabled="txLoading || !canBuy" class="btn-primary" @click="buy">Acheter</button>
          <button :disabled="txLoading || held <= 0" class="btn-secondary" @click="sell">Vendre</button>
        </div>
        <div class="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-2">
          <span>Le prix est arrondi à l'unité. Débit/Crédit via la banque UnbelievaBoat.</span>
          <span v-if="canBuy === false" class="text-red-600">Fonds insuffisants pour acheter {{ quantitySafe }} action<span v-if="quantitySafe !== 1">s</span>.</span>
        </div>
        <p v-if="txMsg" class="mt-2 text-sm" :class="txMsg.includes('réussi') ? 'text-green-600' : 'text-red-600'">{{ txMsg }}</p>
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
