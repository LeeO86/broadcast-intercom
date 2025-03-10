<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
      <h3 class="text-lg font-bold mb-2 dark:text-white">{{ title }}</h3>
      <p class="text-gray-600 dark:text-gray-300 mb-4">{{ message }}</p>
      
      <div class="flex justify-end">
        <button
          class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
          @click="handleAction"
        >
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
    default: 'reload', // 'reload' or 'microphone'
    validator: (value: string) => ['reload', 'microphone'].includes(value)
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