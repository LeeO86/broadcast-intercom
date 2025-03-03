<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <label :for="id" class="block text-sm font-medium">
        {{ label }}
      </label>
      <span class="text-xs text-gray-500 dark:text-gray-400">{{ volume }}%</span>
    </div>
    <input
      :id="id"
      type="range"
      min="0"
      max="100"
      step="1"
      v-model.number="volume"
      class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
      @input="onChange"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  id: {
    type: String,
    default: 'volume-control'
  },
  label: {
    type: String,
    default: 'Volume'
  },
  modelValue: {
    type: Number,
    default: 100
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Local volume state
const volume = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  }
});

// Handle volume change
const onChange = () => {
  emit('change', volume.value);
};
</script>