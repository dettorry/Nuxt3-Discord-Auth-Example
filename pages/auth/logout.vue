<script setup lang="ts">
  import { Icon } from '@iconify/vue';

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
          <Icon icon="mdi:logout" class="text-white text-4xl" />
        </div>
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            Déconnexion
          </h1>
          <Icon
            icon="mdi:loading"
            class="w-6 h-6 text-red-500 animate-spin mx-auto"
          />
          <p class="text-gray-600">
            Vous êtes en cours de déconnexion...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
