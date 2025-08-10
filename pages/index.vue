<script setup lang="ts">
  import { NuxtLink } from '#components';

  const { user } = useAuth();
</script>

<template>
  <div>
    {{ user }}
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
  </div>
</template>
