<template>
  <header class="sticky top-0 z-50 h-16 bg-white border-b border-gray-200 px-6 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <!-- Sidebar Toggle -->
        <button
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          @click="$emit('toggle-sidebar')"
        >
          <Icon icon="heroicons-outline:bars-3" class="w-5 h-5 text-gray-600" />
        </button>

        <!-- Breadcrumbs -->
        <nav class="flex" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-2">
            <li v-for="(crumb, index) in breadcrumbs" :key="index">
              <div class="flex items-center">
                <Icon
                  v-if="index > 0"
                  icon="heroicons-outline:chevron-right"
                  class="w-4 h-4 text-gray-400 mr-2"
                />
                <NuxtLink
                  v-if="crumb.href && index < breadcrumbs.length - 1"
                  :to="crumb.href"
                  class="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {{ crumb.name }}
                </NuxtLink>
                <span
                  v-else
                  class="text-sm font-medium text-gray-900"
                >
                  {{ crumb.name }}
                </span>
              </div>
            </li>
          </ol>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue';

  interface Props {
    user: any;
    breadcrumbs: Array<{ name: string; href?: string }>;
  }

  defineProps<Props>();
  defineEmits<{
    'toggle-sidebar': [];
  }>();
</script>
