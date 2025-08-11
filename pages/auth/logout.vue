<script setup lang="ts">
  definePageMeta({
    layout: false,
  });

  const auth = useAuth();

  onMounted(async () => {
    try {
      await auth.logout();
    } catch (e) {
      // ignore
    } finally {
      // Defensive cleanup: remove any leftover tokens/strategy from storage and cookies
      try {
        if (typeof window !== 'undefined') {
          const keys = [
            'auth.strategy',
            'auth._token.discord',
            'auth._refresh_token.discord',
          ];
          keys.forEach((k) => {
            try { window.localStorage.removeItem(k); } catch {}
            try { window.sessionStorage.removeItem(k); } catch {}
            try {
              // Delete cookies for this name (with and without domain)
              const expire = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
              document.cookie = `${k}=; ${expire}`;
              const host = window.location.hostname;
              if (host && host !== 'localhost') {
                document.cookie = `${k}=; ${expire}; domain=.${host}`;
                document.cookie = `${k}=; ${expire}; domain=${host}`;
              }
            } catch {}
          });
        }
      } catch {}
      await navigateTo('/', { external: true });
    }
  });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Déconnexion</h1>
        <p class="text-gray-600 mb-6">Vous êtes en cours de déconnexion...</p>
        <div class="inline-flex items-center justify-center w-6 h-6 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    </div>
  </div>
</template>
