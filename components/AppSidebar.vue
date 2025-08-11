<template>
  <div class="flex h-screen bg-white border-r border-gray-200">
    <div 
      :class="[
        'flex flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      ]"
    >
      <!-- Logo/Brand -->
      <div class="flex items-center justify-center h-16 border-b border-gray-200">
        <div v-if="!isCollapsed" class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-discord-500 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">D</span>
          </div>
          <span class="font-semibold text-gray-900">Discord Bot</span>
        </div>
        <div v-else class="w-8 h-8 bg-discord-500 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">D</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2">
        <NuxtLink 
          to="/" 
          class="sidebar-link"
          :class="{ 'active': $route.path === '/' }"
        >
          <TrendingUpIcon class="w-5 h-5 mr-3" />
          <span v-if="!isCollapsed">Marchés</span>
        </NuxtLink>
        
        <NuxtLink 
          to="/portfolio" 
          class="sidebar-link"
          :class="{ 'active': $route.path === '/portfolio' }"
        >
          <ChartBarIcon class="w-5 h-5 mr-3" />
          <span v-if="!isCollapsed">Portfolio</span>
        </NuxtLink>
        
        <NuxtLink 
          to="/settings" 
          class="sidebar-link"
          :class="{ 'active': $route.path === '/settings' }"
        >
          <CogIcon class="w-5 h-5 mr-3" />
          <span v-if="!isCollapsed">Paramètres</span>
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
            <div v-if="balance" class="text-xs text-gray-500">
              Solde: {{ formatBalance(balance.total || balance.cash || 0) }}€
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { 
    TrendingUpIcon, 
    ChartBarIcon, 
    CogIcon 
  } from '@heroicons/vue/24/outline';

  interface Props {
    isCollapsed: boolean;
    user: any;
    balance: any;
  }

  defineProps<Props>();

  function formatBalance(amount: number): string {
    return (amount / 100).toFixed(2);
  }
</script>