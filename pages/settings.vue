<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Paramètres</h1>
      <p class="text-gray-600">Configurez votre compte et vos préférences</p>
    </div>

    <div class="space-y-6">
      <!-- Account Settings -->
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Compte</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Nom d'utilisateur Discord
            </label>
            <input 
              type="text" 
              :value="user?.username || ''" 
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ID Discord
            </label>
            <input 
              type="text" 
              :value="user?.id || ''" 
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-medium text-gray-900">Alertes de prix</h3>
              <p class="text-sm text-gray-600">Recevoir des notifications pour les changements de prix importants</p>
            </div>
            <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-discord-500 focus:ring-offset-2">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
            </button>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-medium text-gray-900">Résumé quotidien</h3>
              <p class="text-sm text-gray-600">Recevoir un résumé quotidien de votre portfolio</p>
            </div>
            <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-discord-500 transition-colors focus:outline-none focus:ring-2 focus:ring-discord-500 focus:ring-offset-2">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card border-red-200">
        <h2 class="text-xl font-semibold text-red-900 mb-4">Zone de danger</h2>
        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-900 mb-2">Déconnexion</h3>
            <p class="text-sm text-gray-600 mb-4">Se déconnecter de l'application</p>
            <NuxtLink to="/auth/logout" class="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200">
              Se déconnecter
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const { user, loggedIn } = useAuth();

  // Redirect to login if not authenticated
  if (!loggedIn.value) {
    await navigateTo('/auth/login');
  }
</script>