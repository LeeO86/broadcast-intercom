<template>
  <div class="space-y-4">
    <h3 class="text-lg font-medium">Audio Settings</h3>
    
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label for="noise-suppression" class="text-sm font-medium">
          Noise Suppression
        </label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="noise-suppression" 
            v-model="settings.noise_suppression"
            class="sr-only"
            @change="updateSettings"
          />
          <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
          <div 
            class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
            :class="{ 'transform translate-x-4': settings.noise_suppression }"
          ></div>
        </div>
      </div>
      
      <div class="flex items-center justify-between">
        <label for="echo-cancellation" class="text-sm font-medium">
          Echo Cancellation
        </label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="echo-cancellation" 
            v-model="settings.echo_cancellation"
            class="sr-only"
            @change="updateSettings"
          />
          <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
          <div 
            class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
            :class="{ 'transform translate-x-4': settings.echo_cancellation }"
          ></div>
        </div>
      </div>
      
      <div class="flex items-center justify-between">
        <label for="auto-gain-control" class="text-sm font-medium">
          Auto Gain Control
        </label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="auto-gain-control" 
            v-model="settings.auto_gain_control"
            class="sr-only"
            @change="updateSettings"
          />
          <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
          <div 
            class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
            :class="{ 'transform translate-x-4': settings.auto_gain_control }"
          ></div>
        </div>
      </div>
      
      <div class="flex items-center justify-between">
        <label for="audio-level-events" class="text-sm font-medium">
          Audio Level Events
        </label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="audio-level-events" 
            v-model="settings.audio_level_events"
            class="sr-only"
            @change="updateSettings"
          />
          <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
          <div 
            class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
            :class="{ 'transform translate-x-4': settings.audio_level_events }"
          ></div>
        </div>
      </div>
      
      <div class="flex items-center justify-between">
        <label for="comfort-noise" class="text-sm font-medium">
          Comfort Noise
        </label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="comfort-noise" 
            v-model="settings.comfort_noise"
            class="sr-only"
            @change="updateSettings"
          />
          <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
          <div 
            class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
            :class="{ 'transform translate-x-4': settings.comfort_noise }"
          ></div>
        </div>
      </div>
      
      <div class="flex items-center justify-between">
        <label for="muted-by-default" class="text-sm font-medium">
          Muted by Default
        </label>
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
          <input 
            type="checkbox" 
            id="muted-by-default" 
            v-model="settings.muted_by_default"
            class="sr-only"
            @change="updateSettings"
          />
          <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
          <div 
            class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
            :class="{ 'transform translate-x-4': settings.muted_by_default }"
          ></div>
        </div>
      </div>
    </div>
    
    <div class="pt-4">
      <h3 class="text-lg font-medium mb-3">UI Settings</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Button Style</label>
          <div class="flex space-x-4">
            <button
              type="button"
              class="flex flex-col items-center space-y-2"
              :class="uiSettings.button_style === 'round' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'"
              @click="setButtonStyle('round')"
            >
              <div class="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                :class="uiSettings.button_style === 'round' ? 'border-primary-500 dark:border-primary-400' : 'border-gray-300 dark:border-gray-600'"
              >
                <span class="text-xs">TALK</span>
              </div>
              <span class="text-xs">Round</span>
            </button>
            
            <button
              type="button"
              class="flex flex-col items-center space-y-2"
              :class="uiSettings.button_style === 'square' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'"
              @click="setButtonStyle('square')"
            >
              <div class="w-12 h-12 rounded-lg border-2 flex items-center justify-center"
                :class="uiSettings.button_style === 'square' ? 'border-primary-500 dark:border-primary-400' : 'border-gray-300 dark:border-gray-600'"
              >
                <span class="text-xs">TALK</span>
              </div>
              <span class="text-xs">Square</span>
            </button>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Button Color</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="colorOption in GROUP_COLORS"
              :key="colorOption.value"
              type="button"
              class="w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              :style="{ backgroundColor: colorOption.value }"
              :class="uiSettings.color === colorOption.value ? 'border-primary-500 dark:border-primary-400' : 'border-gray-300 dark:border-gray-600'"
              :title="colorOption.name"
              @click="setColor(colorOption.value)"
            ></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GroupSettings, GroupUISettings, DEFAULT_GROUP_SETTINGS, DEFAULT_GROUP_UI_SETTINGS, GROUP_COLORS } from '~/types';
import { toast } from 'vue-sonner';

const props = defineProps({
  groupId: {
    type: Number,
    required: true
  },
  initialSettings: {
    type: Object as PropType<GroupSettings>,
    default: () => DEFAULT_GROUP_SETTINGS
  },
  initialUISettings: {
    type: Object as PropType<GroupUISettings>,
    default: () => DEFAULT_GROUP_UI_SETTINGS
  }
});

const emit = defineEmits(['settings-updated', 'ui-settings-updated']);

// Local state for settings
const settings = ref<GroupSettings>({ ...props.initialSettings });
const uiSettings = ref<GroupUISettings>({ ...props.initialUISettings });

// Update settings on the server
const updateSettings = async () => {
  try {
    const response = await $fetch(`/api/groups/${props.groupId}/settings`, {
      method: 'PUT',
      body: settings.value
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update settings');
    }
    
    emit('settings-updated', settings.value);
    toast.success('Audio settings updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update settings');
    console.error('Error updating settings:', err);
  }
};

// Set button style
const setButtonStyle = async (style: 'round' | 'square') => {
  uiSettings.value.button_style = style;
  
  try {
    const response = await $fetch(`/api/groups/${props.groupId}/ui-settings`, {
      method: 'PUT',
      body: { button_style: style }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update button style');
    }
    
    emit('ui-settings-updated', uiSettings.value);
    toast.success('Button style updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update button style');
    console.error('Error updating button style:', err);
  }
};

// Set color
const setColor = async (color: string) => {
  uiSettings.value.color = color;
  
  try {
    const response = await $fetch(`/api/groups/${props.groupId}/ui-settings`, {
      method: 'PUT',
      body: { color }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update color');
    }
    
    emit('ui-settings-updated', uiSettings.value);
    toast.success('Button color updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update color');
    console.error('Error updating color:', err);
  }
};

// Reset to defaults
const resetToDefaults = () => {
  settings.value = { ...DEFAULT_GROUP_SETTINGS };
  uiSettings.value = { ...DEFAULT_GROUP_UI_SETTINGS };
  updateSettings();
  setButtonStyle(DEFAULT_GROUP_UI_SETTINGS.button_style);
  setColor(DEFAULT_GROUP_UI_SETTINGS.color);
};

// Initialize with props
onMounted(() => {
  settings.value = { ...props.initialSettings };
  uiSettings.value = { ...props.initialUISettings };
});

// Update local state when props change
watch(() => props.initialSettings, (newSettings) => {
  settings.value = { ...newSettings };
}, { deep: true });

watch(() => props.initialUISettings, (newUISettings) => {
  uiSettings.value = { ...newUISettings };
}, { deep: true });

// Expose methods to parent component
defineExpose({
  resetToDefaults
});
</script>

<style scoped>
/* Toggle switch styling */
input:checked ~ .dot {
  background-color: #3B82F6;
}
</style>