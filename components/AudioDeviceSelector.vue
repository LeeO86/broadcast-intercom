<template>
  <div class="space-y-4">
    <div>
      <label :for="id" class="block text-sm font-medium mb-1">
        {{ label }}
      </label>
      <div class="relative">
        <select
          :id="id"
          v-model="selectedDeviceId"
          class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 pl-3 pr-10"
          :disabled="loading || devices.length === 0"
          @change="onChange"
        >
          <option v-if="devices.length === 0" value="" disabled>No devices found</option>
          <option v-for="device in devices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
        </select>
        <div v-if="loading" class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <div class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
    
    <div v-if="showSpeakerSelector">
      <label :for="`${id}-speaker`" class="block text-sm font-medium mb-1">
        Speaker
      </label>
      <div class="relative">
        <select
          :id="`${id}-speaker`"
          v-model="selectedSpeakerId"
          class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2 pl-3 pr-10"
          :disabled="loading || speakerDevices.length === 0"
          @change="onSpeakerChange"
        >
          <option v-if="speakerDevices.length === 0" value="" disabled>No speakers found</option>
          <option v-for="device in speakerDevices" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
        </select>
        <div v-if="loading" class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <div class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
    
    <div v-if="showVolumeIndicator && volumeLevel !== null" class="mt-2">
      <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary-500 transition-all duration-100"
          :style="{ width: `${volumeLevel * 100}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  id: {
    type: String,
    default: 'audio-device-selector'
  },
  label: {
    type: String,
    default: 'Microphone'
  },
  modelValue: {
    type: String,
    default: ''
  },
  speakerValue: {
    type: String,
    default: ''
  },
  showVolumeIndicator: {
    type: Boolean,
    default: true
  },
  showSpeakerSelector: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'update:speakerValue', 'change', 'speaker-change']);

const { devices, speakerDevices, loading, selectedDevice, selectedSpeaker, volumeLevel, getDevices, selectDevice, selectSpeaker } = useAudio();

// Local selected device IDs
const selectedDeviceId = computed({
  get: () => props.modelValue || selectedDevice.value || '',
  set: (value) => {
    emit('update:modelValue', value);
  }
});

const selectedSpeakerId = computed({
  get: () => props.speakerValue || selectedSpeaker.value || '',
  set: (value) => {
    emit('update:speakerValue', value);
  }
});

// Handle device change
const onChange = async () => {
  if (selectedDeviceId.value) {
    await selectDevice(selectedDeviceId.value);
    emit('change', selectedDeviceId.value);
  }
};

// Handle speaker change
const onSpeakerChange = async () => {
  if (selectedSpeakerId.value) {
    await selectSpeaker(selectedSpeakerId.value);
    emit('speaker-change', selectedSpeakerId.value);
  }
};

// Refresh devices on mount
onMounted(async () => {
  await getDevices();
  
  // If we have a model value but no selected device, select it
  if (props.modelValue && props.modelValue !== selectedDevice.value) {
    await selectDevice(props.modelValue);
  }
  
  // If we have a speaker value but no selected speaker, select it
  if (props.speakerValue && props.speakerValue !== selectedSpeaker.value) {
    await selectSpeaker(props.speakerValue);
  }
});
</script>