<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  definePageMeta({
    layout: false,
  });

  useHead({
    title: 'Chicken Stocks - Connexion réussie',
  });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon="mdi:check" class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          Connexion réussie !
        </h1>
        <div class="flex flex-col gap-2">
          <p class="text-gray-600 mb-6">
            Vous êtes maintenant connecté avec Discord
          </p>
          <Icon icon="mdi:loading" class="w-6 h-6 text-green-500 animate-spin mx-auto" />
          <p class="text-sm text-gray-500 mt-2">
            Redirection en cours...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
