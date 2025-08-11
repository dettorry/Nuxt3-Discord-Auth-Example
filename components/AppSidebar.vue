<template>
  <div class="sticky top-0 h-screen bg-white border-r border-gray-200">
    <div 
      :class="[
        'flex flex-col h-screen overflow-y-auto transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-56'
      ]"
    >
      <!-- Logo/Brand -->
      <div class="flex items-center justify-center h-16 border-b border-gray-200">
        <div v-if="!isCollapsed" class="flex items-center space-x-2">
          <img src="/assets/img/cup-mascot.png" alt="Logo" class="w-8 h-8 rounded-lg object-cover" />
          <span class="font-semibold text-gray-900">Chicken Stocks</span>
        </div>
        <div v-else class="w-8 h-8 rounded-lg flex items-center justify-center">
          <img src="/assets/img/cup-mascot.png" alt="Logo" class="w-8 h-8 object-cover" />
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2">
        <NuxtLink
          to="/"
          class="sidebar-link flex items-center"
          :class="[{ 'active': $route.path === '/' }, isCollapsed ? 'justify-center px-2' : '']"
          :title="isCollapsed ? 'Marchés' : undefined"
          aria-label="Marchés"
        >
          <Icon icon="heroicons-outline:arrow-trending-up" class="w-6 h-6 shrink-0" :class="!isCollapsed ? 'mr-3' : ''" />
          <span v-if="!isCollapsed" class="align-middle">Marchés</span>
        </NuxtLink>

        <NuxtLink
          to="/portfolio"
          class="sidebar-link flex items-center"
          :class="[{ 'active': $route.path === '/portfolio' }, isCollapsed ? 'justify-center px-2' : '']"
          :title="isCollapsed ? 'Portfolio' : undefined"
          aria-label="Portfolio"
        >
          <Icon icon="heroicons-outline:chart-bar" class="w-6 h-6 shrink-0" :class="!isCollapsed ? 'mr-3' : ''" />
          <span v-if="!isCollapsed" class="align-middle">Portfolio</span>
        </NuxtLink>

        <NuxtLink
          to="/settings"
          class="sidebar-link flex items-center"
          :class="[{ 'active': $route.path === '/settings' }, isCollapsed ? 'justify-center px-2' : '']"
          :title="isCollapsed ? 'Paramètres' : undefined"
          aria-label="Paramètres"
        >
          <Icon icon="heroicons-outline:cog-6-tooth" class="w-6 h-6 shrink-0" :class="!isCollapsed ? 'mr-3' : ''" />
          <span v-if="!isCollapsed" class="align-middle">Paramètres</span>
        </NuxtLink>
      </nav>

      <!-- User Info -->
      <div class="border-t border-gray-200 p-4">
        <div v-if="user" class="flex items-center space-x-3">
          <img
            :src="`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`"
            :alt="user.username"
            class="w-10 h-10 rounded-full"
          />
          <div v-if="!isCollapsed" class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ user.username }}
            </p>
            <div v-if="balance" class="flex items-center text-xs text-gray-500 gap-1">
              <span>Solde: {{ balance.total || 0 }}</span>
              <Icon icon="mdi:chicken-leg-outline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  interface Props {
    isCollapsed: boolean;
    user: any;
    balance: any;
  }

  defineProps<Props>();
</script>