<template>
  <div class="h-full w-full border-2 border-danger-500 dark:border-danger-700 rounded-lg p-4 bg-danger-50 dark:bg-danger-900/30">
    <div class="flex flex-col items-center justify-center h-full space-y-4">
      <!-- Error Icon -->
      <div class="text-danger-500 dark:text-danger-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <!-- Error Message -->
      <div class="text-center">
        <h3 class="text-lg font-medium text-danger-700 dark:text-danger-300">
          {{ title }}
        </h3>
        <p class="mt-1 text-sm text-danger-600 dark:text-danger-400">
          {{ message }}
        </p>
      </div>

      <!-- Retry Button -->
      <button
        v-if="showRetry"
        type="button"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-danger-600 hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500"
        @click="$emit('retry')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry Connection
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  showRetry: {
    type: Boolean,
    default: true
  }
});

defineEmits(['retry']);
</script>