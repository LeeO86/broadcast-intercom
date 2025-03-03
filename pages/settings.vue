<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h1 class="text-2xl font-bold text-center mb-6">Audio Settings</h1>
      
      <div class="space-y-6">
        <div>
          <label for="display-name" class="block text-sm font-medium mb-1">
            Your Name
          </label>
          <input
            id="display-name"
            v-model="displayName"
            type="text"
            placeholder="Enter your name"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
        
        <AudioDeviceSelector
          v-model="selectedDevice"
          @change="onDeviceChange"
        />
        
        <div>
          <h3 class="text-sm font-medium mb-2">Audio Processing</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label for="noise-suppression" class="text-sm font-medium">
                Noise Suppression
              </label>
              <div class="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="noise-suppression" 
                  v-model="audioSettings.noiseSuppression"
                  class="sr-only"
                />
                <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
                <div 
                  class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
                  :class="{ 'transform translate-x-4': audioSettings.noiseSuppression }"
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
                  v-model="audioSettings.echoCancellation"
                  class="sr-only"
                />
                <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
                <div 
                  class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
                  :class="{ 'transform translate-x-4': audioSettings.echoCancellation }"
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
                  v-model="audioSettings.autoGainControl"
                  class="sr-only"
                />
                <div class="block h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-10"></div>
                <div 
                  class="dot absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform duration-200 ease-in-out"
                  :class="{ 'transform translate-x-4': audioSettings.autoGainControl }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 class="text-sm font-medium mb-2">Theme</h3>
          <ThemeSelector />
        </div>
        
        <div class="pt-4">
          <button
            type="button"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="saveSettings"
          >
            Save Settings
          </button>
        </div>
        
        <div class="text-center mt-4">
          <NuxtLink to="/" class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Back to Home
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner';

const userSettings = useUserSettings();
const userStore = useUserStore();
const { selectedDevice, loadPreferredDevice, savePreferredDevice } = useAudio();

const displayName = ref(userStore.displayName || userSettings.settings.value.displayName || '');
const audioSettings = ref({
  noiseSuppression: userSettings.settings.value.audioSettings?.noiseSuppression ?? true,
  echoCancellation: userSettings.settings.value.audioSettings?.echoCancellation ?? true,
  autoGainControl: userSettings.settings.value.audioSettings?.autoGainControl ?? true
});

// Load preferred device on mount
onMounted(async () => {
  await loadPreferredDevice();
  
  // Initialize user store if needed
  if (!userStore.isInitialized) {
    userStore.initialize();
  }
});

// Handle device change
const onDeviceChange = (deviceId: string) => {
  selectedDevice.value = deviceId;
};

// Save settings
const saveSettings = () => {
  // Save display name to user store and settings
  userStore.setDisplayName(displayName.value);
  userSettings.setDisplayName(displayName.value);
  
  // Save preferred audio device
  savePreferredDevice();
  
  // Save audio processing settings
  userSettings.setAudioSettings({
    noiseSuppression: audioSettings.value.noiseSuppression,
    echoCancellation: audioSettings.value.echoCancellation,
    autoGainControl: audioSettings.value.autoGainControl
  });
  
  // Show success message
  toast.success('Settings saved successfully');
};
</script>

<style scoped>
/* Toggle switch styling */
input:checked ~ .dot {
  background-color: #3B82F6;
}
</style>