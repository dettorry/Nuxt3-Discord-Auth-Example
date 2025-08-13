<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Paramètres
      </h1>
      <p class="text-gray-600">
        Configurez votre compte et vos préférences
      </p>
    </div>

    <div class="space-y-6">
      <!-- Account Settings -->
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Compte
        </h2>
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
            ></input>
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
            ></input>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card border-red-200">
        <h2 class="text-xl font-semibold text-red-900 mb-4">
          Zone de danger
        </h2>
        <div class="space-y-4">
          <div>
            <h3 class="text-sm font-medium text-gray-900 mb-2">
              Déconnexion
            </h3>
            <p class="text-sm text-gray-600 mb-4">
              Se déconnecter du site
            </p>
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
  if (!loggedIn) {
    await navigateTo('/auth/login');
  }

  useHead({
    title: 'Chicken Stocks - Paramètres',
  });
</script>
