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

    <div class="card text-center py-12">
      <Icon
        class="w-12 h-12 text-gray-400 mx-auto mb-4"
        icon="mdi:chart-line"
      />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        Portfolio vide
      </h3>
      <p class="text-gray-600 mb-4">
        Vous n'avez pas encore d'investissements dans votre portfolio.
      </p>
      <button class="btn-primary">
        Commencer à investir
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  const { loggedIn } = useAuth();

  // Redirect to login if not authenticated
  if (!loggedIn) {
    await navigateTo('/auth/login');
  }
</script>
