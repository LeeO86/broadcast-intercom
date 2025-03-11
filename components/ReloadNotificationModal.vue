<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
      <div class="mb-4">
        <!-- Error/Warning Icon -->
        <div class="flex justify-center mb-4">
          <div :class="iconClass">
            <svg v-if="type === 'reload'" xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else-if="type === 'microphone'" xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        <h3 class="text-lg font-bold text-center" :class="titleClass">{{ title }}</h3>
        <p class="mt-2 text-center" :class="messageClass">{{ message }}</p>
      </div>
      
      <div class="flex justify-center">
        <button
          class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
          :class="buttonClass"
          @click="handleAction"
        >
          <svg v-if="type === 'reload'" class="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ actionText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'reload', // 'reload' | 'microphone' | 'error'
    validator: (value: string) => ['reload', 'microphone', 'error'].includes(value)
  },
  title: {
    type: String,
    default: 'Updates Available'
  },
  message: {
    type: String,
    default: 'Changes have been made to the production. Please reload to see the latest updates.'
  },
  actionText: {
    type: String,
    default: 'Reload Now'
  }
});

const emit = defineEmits(['action', 'reload', 'request-microphone']);

// Computed styles based on type
const iconClass = computed(() => {
  switch (props.type) {
    case 'reload':
      return 'text-primary-500 dark:text-primary-400';
    case 'microphone':
      return 'text-warning-500 dark:text-warning-400';
    case 'error':
      return 'text-danger-500 dark:text-danger-400';
    default:
      return 'text-primary-500 dark:text-primary-400';
  }
});

const titleClass = computed(() => {
  switch (props.type) {
    case 'reload':
      return 'text-primary-700 dark:text-primary-300';
    case 'microphone':
      return 'text-warning-700 dark:text-warning-300';
    case 'error':
      return 'text-danger-700 dark:text-danger-300';
    default:
      return 'text-gray-900 dark:text-gray-100';
  }
});

const messageClass = computed(() => {
  switch (props.type) {
    case 'reload':
      return 'text-primary-600 dark:text-primary-400';
    case 'microphone':
      return 'text-warning-600 dark:text-warning-400';
    case 'error':
      return 'text-danger-600 dark:text-danger-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
});

const buttonClass = computed(() => {
  switch (props.type) {
    case 'reload':
      return 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500';
    case 'microphone':
      return 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500';
    case 'error':
      return 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500';
    default:
      return 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500';
  }
});

const handleAction = () => {
  emit('action');
  
  if (props.type === 'reload') {
    emit('reload');
    window.location.reload();
  } else if (props.type === 'microphone') {
    emit('request-microphone');
  }
};
</script>