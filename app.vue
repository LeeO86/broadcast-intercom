<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ConnectionStatus />
    <Toaster position="top-right" />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useTheme } from '~/composables/useTheme';

// Initialize theme
const { initTheme } = useTheme();
onMounted(() => {
  initTheme();
});
</script>