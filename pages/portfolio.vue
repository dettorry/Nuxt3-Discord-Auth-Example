<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Portfolio
      </h1>
      <p class="text-gray-600">
        Gérez vos investissements et suivez vos performances
      </p>
    </div>

    <!-- Section Compte en Banque -->
    <div v-if="balance" class="mb-8">
      <!-- Séparateur visuel -->
      <div class="relative my-8">
        <hr class="border-t-2 border-gray-200">
        <span class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-gray-500 text-sm uppercase tracking-wider">
          Votre compte en banque
        </span>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="card">
          <div class="text-sm text-gray-600">
            Rang dans le classement
          </div>
          <div class="text-2xl font-bold">
            #{{ balance.rank }}
          </div>
        </div>
        <div class="card">
          <div class="text-sm text-gray-600">
            En poche
          </div>
          <div class="flex gap-1 items-center text-2xl font-bold">
            <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:wallet-outline" />
            <span>{{ formatCurrency(balance.cash) }}</span>
          </div>
        </div>
        <div class="card">
          <div class="text-sm text-gray-600">
            En banque
          </div>
          <div class="flex gap-1 items-center text-2xl font-bold">
            <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:bank-outline" />
            <span>{{ formatCurrency(balance.bank) }}</span>
          </div>
        </div>
        <div class="card">
          <div class="text-sm text-gray-600">
            Total
          </div>
          <div class="flex gap-1 items-center text-2xl font-bold">
            <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
            <span>{{ formatCurrency(balance.total) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="card text-center py-12">
      <div class="flex items-center justify-center space-x-3">
        <Icon class="w-6 h-6 text-discord-500 animate-spin" icon="mdi:loading" />
        <span class="text-gray-600">Chargement du portfolio...</span>
      </div>
    </div>
    <div v-else-if="errorMsg" class="card text-center py-6 text-red-600">
      {{ errorMsg }}
    </div>

    <!-- Empty State -->
    <div v-else-if="positions.length === 0" class="card text-center py-12">
      <Icon class="w-12 h-12 text-gray-400 mx-auto mb-4" icon="mdi:chart-line" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Portfolio vide
      </h3>
      <p class="text-gray-600 mb-4">
        Vous n'avez pas encore d'investissements dans votre portfolio.
      </p>
      <NuxtLink to="/" class="btn-primary">
        Commencer à investir
      </NuxtLink>
    </div>

    <!-- Summary -->
    <div v-else class="space-y-6">
      <!-- Séparateur visuel -->
      <div class="relative my-8">
        <hr class="border-t-2 border-gray-200">
        <span class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-gray-500 text-sm uppercase tracking-wider">
          Actions détenues
        </span>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="card">
          <div class="text-sm text-gray-600">
            Valeur de marché
          </div>
          <div class="flex gap-1 items-center text-2xl font-bold">
            <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
            <span>{{ formatCurrency(totalMarketValue) }}</span>
          </div>
        </div>
        <div class="card">
          <div class="text-sm text-gray-600">
            Coût total
          </div>
          <div class="flex gap-1 items-center text-2xl font-bold">
            <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
            <span>{{ formatCurrency(totalCost) }}</span>
          </div>
        </div>
        <div class="card">
          <div class="text-sm text-gray-600">
            P/L total
          </div>
          <div :class="['flex gap-1 items-center text-2xl font-bold', totalPL >= 0 ? 'text-green-600' : 'text-red-600']">
            <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
            <span>{{ formatCurrency(totalPL) }} ({{ formatPercent(totalPLPct) }})</span>
          </div>
        </div>
      </div>

      <!-- Positions Table -->
      <div class="card overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="text-left text-sm text-gray-500">
              <th class="py-2 pr-4">
                Symbole
              </th>
              <th class="py-2 pr-4">
                Quantité
              </th>
              <th class="py-2 pr-4">
                Prix moyen
              </th>
              <th class="py-2 pr-4">
                Prix actuel
              </th>
              <th class="py-2 pr-4">
                Valeur
              </th>
              <th class="py-2 pr-4">
                P/L
              </th>
              <th class="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in positions" :key="p.symbol" class="border-t border-gray-100">
              <td class="py-2 pr-4 font-medium text-gray-900">
                {{ p.symbol }}
              </td>
              <td class="py-2 pr-4">
                {{ formatCurrency(p.quantity) }}
              </td>
              <td class="py-2 pr-4">
                <span class="inline-flex items-center gap-1">
                  <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
                  <span>{{ formatCurrency(p.avgCost) }}</span>
                </span>
              </td>
              <td class="py-2 pr-4">
                <span class="inline-flex items-center gap-1">
                  <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
                  <span>{{ formatCurrency(p.currentPrice) }}</span>
                </span>
              </td>
              <td class="py-2 pr-4">
                <span class="inline-flex items-center gap-1">
                  <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
                  <span>{{ formatCurrency(p.marketValue) }}</span>
                </span>
              </td>
              <td class="py-2 pr-4" :class="p.pl >= 0 ? 'text-green-600' : 'text-red-600'">
                <span class="inline-flex items-center gap-1">
                  <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
                  <span>{{ formatCurrency(p.pl) }} ({{ formatPercent(p.plPct) }})</span>
                </span>
              </td>
              <td class="py-2 pr-4">
                <NuxtLink :to="`/stocks/${p.symbol}`" class="text-sm text-green-700 hover:underline">
                  Voir
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue';
  import { inject } from 'vue';
  import type { UnbeliviaboatBalance } from '~/types/unbeliviaboat';

  const balance = inject('balance') as UnbeliviaboatBalance;
  const { loggedIn } = useAuth();

  // Redirect to login if not authenticated
  if (!loggedIn) {
    await navigateTo('/auth/login');
  }

  useHead({
    title: 'Chicken Stocks - Portfolio',
  });

  type Lot = { symbol: string; quantity: number; unitPrice: number; ts: number };
  type Position = {
    symbol: string;
    quantity: number;
    avgCost: number;
    totalCost: number;
    currentPrice: number;
    marketValue: number;
    pl: number;
    plPct: number;
  };

  const loading = ref(false);
  const errorMsg = ref<string | null>(null);
  const positions = ref<Position[]>([]);

  function portfolioKey() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth: any = (useAuth?.() as any) || {};
    const uid = auth?.user?.id || auth?.user?.value?.id || 'anon';
    const cfg = useRuntimeConfig?.();
    const gid = (cfg as any)?.GUILD_ID || 'defaultGuild';
    return `portfolio:${uid}:${gid}`;
  }

  function readPortfolio(): Lot[] {
    if (process.server) {
      return [];
    }
    try {
      const raw = localStorage.getItem(portfolioKey());
      return raw ? (JSON.parse(raw) as Lot[]) : [];
    } catch {
      return [];
    }
  }

  function aggregateLots(lots: Lot[]) {
    // { symbol -> { qty, costSum } }
    const map = lots.reduce((acc, l) => {
      const s = l.symbol;
      const cur = acc.get(s) || { qty: 0, costSum: 0 };
      cur.qty += l.quantity;
      cur.costSum += l.quantity * l.unitPrice;
      acc.set(s, cur);
      return acc;
    }, new Map<string, { qty: number; costSum: number }>());
    return Array.from(map.entries()).map(([s, v]) => ({
      symbol: s,
      quantity: v.qty,
      avgCost: v.qty > 0 ? Math.round(v.costSum / v.qty) : 0,
      totalCost: v.costSum,
    }));
  }

  function formatCurrency(n: number | null | undefined) {
    const v = Math.trunc(Number(n ?? 0));
    if (!Number.isFinite(v)) {
      return '0';
    }
    return v.toLocaleString('fr-FR');
  }
  function formatPercent(n: number) {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  }

  async function loadPortfolio() {
    if (process.server) {
      return;
    }
    loading.value = true;
    errorMsg.value = null;
    positions.value = [];
    try {
      const lots = readPortfolio();
      const base = aggregateLots(lots);
      if (base.length === 0) {
        positions.value = [];
        return;
      }
      const symbols = base.map(b => b.symbol);
      // Fetch quotes in parallel
      const quotes = await Promise.all(symbols.map(s => $fetch<any>('/api/stocks/quote', { params: { symbol: s } })));
      const priceBySymbol = quotes.reduce<Record<string, number>>((acc, q) => {
        if (q && q.symbol) {
          acc[q.symbol] = Math.round(Number(q.price || 0));
        }
        return acc;
      }, {});

      positions.value = base.map((b) => {
        const currentPrice = Number(priceBySymbol[b.symbol] || 0);
        const marketValue = currentPrice * b.quantity;
        const pl = marketValue - b.totalCost;
        const plPct = b.totalCost > 0 ? (pl / b.totalCost) * 100 : 0;
        return {
          symbol: b.symbol,
          quantity: b.quantity,
          avgCost: b.avgCost,
          totalCost: b.totalCost,
          currentPrice,
          marketValue,
          pl,
          plPct,
        } as Position;
      });
    } catch (e: any) {
      errorMsg.value = e?.message || 'Erreur lors du chargement du portfolio';
    } finally {
      loading.value = false;
    }
  }

  const totalMarketValue = computed(() => positions.value.reduce((a, p) => a + p.marketValue, 0));
  const totalCost = computed(() => positions.value.reduce((a, p) => a + p.totalCost, 0));
  const totalPL = computed(() => totalMarketValue.value - totalCost.value);
  const totalPLPct = computed(() => (totalCost.value > 0 ? (totalPL.value / totalCost.value) * 100 : 0));

  onMounted(() => {
    loadPortfolio();
  });
</script>
