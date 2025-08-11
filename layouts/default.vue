<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="user" class="flex">
      <!-- Sidebar -->
      <AppSidebar
        :is-collapsed="sidebarCollapsed"
        :user="user"
        :balance="balance"
      />

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0">
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
    const crumbs = [{ name: 'Accueil', href: '/' }];

    if (route.path === '/') {
      crumbs[0] = { name: 'Marchés Boursiers', href: '/' };
    } else if (route.path === '/portfolio') {
      crumbs[0] = { name: 'Portfolio', href: '/portfolio' };
    } else if (route.path === '/settings') {
      crumbs[0] = { name: 'Paramètres', href: '/settings' };
    }

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
