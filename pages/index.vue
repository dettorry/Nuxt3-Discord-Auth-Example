<script setup lang="ts">
  import { NuxtLink } from '#components';

  const { user } = useAuth();
  const balance = ref<any | null>(null);
  const loading = ref(false);
  const errorMsg = ref<string | null>(null);

  async function fetchBalance() {
    const uid = (user as any)?.id ?? (user as any)?.value?.id;
    if (!uid) {
      return;
    }
    loading.value = true;
    errorMsg.value = null;
    balance.value = null;
    try {
      const { data, error } = await useFetch<{ balance: any }>('/api/balance', {
        method: 'get',
        params: { userId: uid },
        cache: 'no-cache',
      });
      if (error.value) {
        const msg = (error.value as any)?.message ?? 'Failed to fetch balance';
        throw new Error(msg);
      }
      // La réponse de l'API UnbelievaBoat peut contenir { cash, bank, total }
      balance.value = data.value?.balance ?? null;
    } catch (e: any) {
      errorMsg.value = e?.message ?? 'Erreur lors de la récupération du solde.';
    } finally {
      loading.value = false;
    }
  }

  // Récupérer automatiquement le solde dès que l'utilisateur est disponible
  watch(
    () => (user as any)?.id ?? (user as any)?.value?.id,
    async (id) => {
      if (id) {
        await fetchBalance();
      } else {
        balance.value = null;
        errorMsg.value = null;
      }
    },
    { immediate: true },
  );
</script>

<template>
  <div>
    <!-- Debug utilisateur (optionnel) -->
    <!-- {{ user }} -->
    <NuxtLink v-if="!user" to="/auth/login">
      Log in with discord
    </NuxtLink>
    <!-- Optimized image via Nuxt Image -->
    <img
      v-if="user"
      :src="`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=4096&ignore=true`"
      :alt="String(user.username)"
      :title="String(user.username)"
      width="100"
      height="100"
    ></img>
    <NuxtLink v-if="user" to="/auth/logout">
      Log out
    </NuxtLink>

    <div v-if="user" style="margin-top: 1rem;">
      <p v-if="loading">
        Chargement…
      </p>

      <p v-if="errorMsg" style="color: #c00;">
        {{ errorMsg }}
      </p>
      <div v-if="balance !== null">
        <p><strong>Solde</strong></p>
        <pre style="white-space: pre-wrap;">{{ balance }}</pre>
      </div>
      <p v-else-if="!loading && !errorMsg">
        Aucun solde disponible.
      </p>
    </div>
  </div>
</template>
