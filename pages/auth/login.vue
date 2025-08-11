<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  definePageMeta({
    layout: false,
  });

  useAuth().loginWith('discord');

</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-discord-500 to-discord-700 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-discord-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="logos:discord-icon" class="w-8 h-8 icon-white" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            Connexion Discord
          </h1>
          <p class="text-gray-600">
            Connectez-vous avec votre compte Discord pour accéder à l'application
          </p>
        </div>

        <div class="flex flex-col items-center">
          <Icon
            class="w-8 h-8 text-discord-500 animate-spin mb-4"
            icon="mdi:loading"
          />
          <p class="text-gray-600">
            Redirection vers Discord en cours...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
