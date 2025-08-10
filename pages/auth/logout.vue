<script setup lang="ts">
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
  <div><p>Logging you out...</p></div>
</template>
