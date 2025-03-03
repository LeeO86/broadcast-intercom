<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Users ({{ users.length }})</h3>
      <button 
        type="button"
        class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        @click="$emit('toggle')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <div class="space-y-2 max-h-60 overflow-y-auto">
      <div 
        v-for="user in users" 
        :key="user.id"
        class="flex items-center justify-between p-2 rounded-md"
        :class="user.is_talking ? 'bg-danger-50 dark:bg-danger-900/30' : 'bg-gray-50 dark:bg-gray-700/30'"
      >
        <div class="flex items-center">
          <div 
            class="w-2.5 h-2.5 rounded-full mr-2"
            :class="user.is_talking ? 'bg-danger-500 animate-pulse' : 'bg-success-500'"
          ></div>
          <span>{{ user.display_name }}</span>
        </div>
        <span v-if="user.is_talking" class="text-xs text-danger-700 dark:text-danger-300 font-medium">
          Talking
        </span>
      </div>
      
      <div v-if="users.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-2">
        No users connected
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GroupMember } from '~/types';

defineProps({
  users: {
    type: Array as PropType<GroupMember[]>,
    default: () => []
  }
});

defineEmits(['toggle']);
</script>