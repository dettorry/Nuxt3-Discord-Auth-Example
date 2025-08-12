<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="user" class="flex">
      <!-- Sidebar -->
      <AppSidebar
        :is-collapsed="sidebarCollapsed"
        :user="user"
        :balance="balance"
        @close="sidebarCollapsed = true"
      />

      <!-- Main Content -->
      <div :class="['flex-1 flex flex-col min-w-0', sidebarCollapsed ? 'flex' : 'hidden md:flex']">
        <AppHeader
          :user="user"
          :breadcrumbs="breadcrumbs"
          @toggle-sidebar="toggleSidebar"
        />

        <main class="flex-1 p-6">
          <slot />
        </main>
      </div>
    </div>

    <!-- Auth pages layout -->
    <div v-else class="min-h-screen">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
  const { user } = useAuth();
  const route = useRoute();

  const sidebarCollapsed = ref(false);
  const balance = ref<any | null>(null);

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  // Generate breadcrumbs based on current route
  const breadcrumbs = computed(() => {
    const crumbs: Array<{ name: string; href?: string }> = [];

    if (route.path === '/') {
      crumbs.push({ name: 'Marchés Boursiers', href: '/' });
      return crumbs;
    }

    if (route.path === '/portfolio') {
      crumbs.push({ name: 'Portfolio' });
      return crumbs;
    }

    if (route.path === '/settings') {
      crumbs.push({ name: 'Paramètres' });
      return crumbs;
    }

    // Stocks details page: /stocks/:symbol
    if (route.path.startsWith('/stocks')) {
      crumbs.push({ name: 'Marchés Boursiers', href: '/' });
      const sym = ((route.params as any)?.symbol ?? '').toString().toUpperCase();
      if (sym) {
        crumbs.push({ name: sym });
      }
      return crumbs;
    }

    // Fallback
    crumbs.push({ name: 'Accueil', href: '/' });
    return crumbs;
  });

  // Fetch balance when user is available
  watch(
    () => (user as any)?.id ?? (user as any)?.value?.id,
    async (id) => {
      if (id) {
        try {
          const { data } = await useFetch<{ balance: any }>('/api/balance', {
            method: 'get',
            params: { userId: id },
            cache: 'no-cache',
          });
          balance.value = data.value?.balance ?? null;
        } catch (e) {
          console.error('Failed to fetch balance:', e);
        }
      } else {
        balance.value = null;
      }
    },
    { immediate: true },
  );
</script>
