<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="authUser" class="flex">
      <!-- Sidebar -->
      <AppSidebar
        :is-collapsed="sidebarCollapsed"
        :user="authUser"
        @close="sidebarCollapsed = true"
      />

      <!-- Main Content -->
      <div :class="['flex-1 flex flex-col min-w-0', sidebarCollapsed ? 'flex' : 'hidden md:flex']">
        <AppHeader
          :user="authUser"
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
  import { provide } from 'vue';

  const runtime = useRuntimeConfig?.();
  const route = useRoute();
  const { balance, start: startBalance, stop: stopBalance } = useUnbBalance();
  const { user: authUser } = useAuth();
  const sidebarCollapsed = ref(false);

  // Provide balance to children
  provide('balance', balance);

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  // Generate breadcrumbs based on current route
  const breadcrumbs = computed(() => {
    const crumbs: Array<{ name: string; href?: string }> = [];

    if (route.path.startsWith('/stocks')) {
      crumbs.push({ name: 'Marchés Boursiers', href: '/stocks' });
      const sym = ((route.params as any)?.symbol ?? '').toString().toUpperCase();
      if (sym) {
        crumbs.push({ name: sym });
      }
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

    // Fallback
    crumbs.push({ name: 'Accueil', href: '/' });
    return crumbs;
  });

  onMounted(() => {
    const uid = (authUser as any)?.id
      ?? (authUser as any)?.value?.id;
    const gid = (runtime as any)?.GUILD_ID;
    startBalance(uid, gid, 15000);
  });
  onUnmounted(() => stopBalance());
</script>
