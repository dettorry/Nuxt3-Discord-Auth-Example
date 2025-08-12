<template>
  <div :class="['sticky top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out', isCollapsed ? 'w-0 md:w-20' : 'w-full md:w-56']">
    <div
      class="flex flex-col h-screen overflow-y-auto transition-all duration-300 ease-in-out"
    >
      <!-- Logo/Brand -->

      <div
        class="flex items-center h-16 border-b border-gray-200"
        :class="{ 'justify-between px-8': !isCollapsed, 'justify-center': isCollapsed }"
      >
        <div class="flex items-center space-x-2">
          <img src="/assets/img/cup-mascot.png" alt="Logo" class="w-8 h-8 rounded-lg object-cover"></img>
          <span v-if="!isCollapsed" class="font-semibold text-gray-900">Chicken Stocks</span>
        </div>
        <!-- Bouton close en format mobile -->
        <button
          v-if="!isCollapsed"
          @click="$emit('close')"
          class="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition"
          aria-label="Fermer le menu"
        >
          <Icon icon="mdi:close" class="w-6 h-6 text-gray-700" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link flex items-center"
          :class="[{ 'active': $route.path === item.to }, isCollapsed ? 'justify-center px-2' : '']"
          :title="isCollapsed ? item.label : undefined"
          :aria-label="item.label"
        >
          <Icon :icon="item.icon" class="w-6 h-6 shrink-0" :class="!isCollapsed ? 'mr-3' : ''" />
          <span v-if="!isCollapsed" class="align-middle">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- User Info -->
      <div class="border-t border-gray-200 p-4">
        <div v-if="user" class="flex items-center space-x-3">
          <img
            :src="`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`"
            :alt="String(user?.username || '')"
            class="w-10 h-10 rounded-full"
          ></img>
          <div v-if="!isCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ user.username }}
            </p>
            <div v-if="dynBalance || balance" class="flex items-center text-xs text-gray-500 gap-1">
              <span>Solde:
                <span class="inline-flex items-center gap-1">
                  {{ formatCoins(dynBalance?.total ?? balance?.total ?? 0) }}
                  <Icon class="w-[1em] h-[1em] align-middle" icon="mdi:chicken-leg-outline" />
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  const runtime = useRuntimeConfig?.();
  const { user: authUser } = useAuth();
  const { balance: dynBalance, start: startBalance, stop: stopBalance } = useUnbBalance();

  const navItems = [
    {
      to: '/',
      label: 'Marchés',
      icon: 'heroicons-outline:arrow-trending-up',
    },
    {
      to: '/portfolio',
      label: 'Portfolio',
      icon: 'heroicons-outline:chart-bar',
    },
    {
      to: '/settings',
      label: 'Paramètres',
      icon: 'heroicons-outline:cog-6-tooth',
    },
  ];

  interface Props {
    isCollapsed: boolean;
    user: any;
    balance: any;
  }

  const props = defineProps<Props>();
  onMounted(() => {
    const uid = (authUser as any)?.id
      ?? (authUser as any)?.value?.id
      ?? (props.user as any)?.id
      ?? (props.user as any)?.value?.id;
    const gid = (runtime as any)?.GUILD_ID;
    startBalance(uid, gid, 15000);
  });
  onUnmounted(() => stopBalance());

  // Format balance between 0 and 999M with K/M suffixes and fr-FR locale
  function formatCoins(amount?: number | null) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n)) {
      return '0';
    }
    if (n < 1000) {
      return Math.floor(n).toLocaleString('fr-FR');
    }
    if (n < 1_000_000) {
      const v = n / 1000;
      const digits = v < 100 ? 1 : 0;
      const t = digits ? Math.trunc(v * 10) / 10 : Math.trunc(v);
      return `${t.toLocaleString('fr-FR', { maximumFractionDigits: digits })}k`;
    }
    const v = n / 1_000_000;
    const digits = v < 100 ? 1 : 0;
    const t = digits ? Math.trunc(v * 10) / 10 : Math.trunc(v);
    return `${t.toLocaleString('fr-FR', { maximumFractionDigits: digits })}M`;
  }
</script>
