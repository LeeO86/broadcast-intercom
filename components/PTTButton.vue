<template>
  <div 
    class="h-full w-full border-2 rounded-lg flex flex-col items-center justify-center p-4 transition-colors duration-200"
    :class="[buttonClass, isMuted ? 'h-16' : 'h-full']"
    :style="buttonContainerStyle"
  >
    <h3 class="text-lg font-semibold mb-2" v-if="!isMuted">{{ name }}</h3>
    
    <div class="flex items-center w-full" v-if="!isMuted">
      <!-- Vertical Volume Control -->
      <div class="flex flex-col items-center mr-4">
        <button 
          @click="toggleMute" 
          class="p-1 mb-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
          :class="isMuted ? 'text-danger-500 dark:text-danger-400' : 'text-gray-500 dark:text-gray-400'"
          :title="isMuted ? 'Unmute' : 'Mute'"
        >
          <svg v-if="isMuted" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <div class="relative h-24 flex items-center">
          <input
            :id="`volume-${groupId}`"
            type="range"
            min="0"
            max="100"
            step="1"
            v-model.number="volume"
            class="h-24 w-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            style="writing-mode: vertical-lr; direction: rtl; width: 8px;"
            @input="onVolumeChange"
          />
        </div>
      </div>
      
      <!-- PTT Button with Lock Option -->
      <div class="relative flex-1 flex justify-center">
        <button
          type="button"
          class="w-24 h-24 border-4 border-gray-300 dark:border-gray-600 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
          :class="[
            isTalking ? 'bg-danger-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
            buttonStyle === 'round' ? 'rounded-full' : 'rounded-lg'
          ]"
          @mousedown="isLocked ? toggleTalking() : startTalking()"
          @mouseup="isLocked ? null : stopTalking()"
          @mouseleave="isLocked ? null : stopTalking()"
          @touchstart.prevent="isLocked ? toggleTalking() : startTalking()"
          @touchend.prevent="isLocked ? null : stopTalking()"
          :disabled="otherTalking || isMuted"
        >
          <span v-if="isTalking" class="text-sm font-medium">LIVE</span>
          <span v-else class="text-sm font-medium">TALK</span>
        </button>
        
        <!-- Lock Button -->
        <button 
          @click="toggleLock"
          class="absolute -top-2 -right-2 p-1.5 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-500"
          :class="isLocked ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
          :title="isLocked ? 'Unlock PTT' : 'Lock PTT'"
        >
          <svg v-if="isLocked" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Muted state - collapsed view -->
    <div v-if="isMuted" class="flex items-center justify-between w-full">
      <span class="text-sm font-medium">{{ name }}</span>
      <button 
        @click="toggleMute" 
        class="p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-danger-500 dark:text-danger-400"
        title="Unmute"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <div v-if="otherTalking && !isMuted" class="mt-2 text-sm text-warning-700 dark:text-warning-300 animate-pulse">
      {{ otherTalkingName }} is talking
    </div>
  </div>
</template>

<script setup lang="ts">
import { GroupUISettings } from '~/types';

const props = defineProps({
  groupId: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  otherTalking: {
    type: Boolean,
    default: false
  },
  otherTalkingName: {
    type: String,
    default: ''
  },
  uiSettings: {
    type: Object as PropType<GroupUISettings>,
    default: () => ({
      button_style: 'round',
      color: '#3B82F6'
    })
  }
});

const emit = defineEmits(['talking-start', 'talking-stop', 'volume-change', 'mute-toggle']);

const isTalking = ref(false);
const isLocked = ref(false);
const isMuted = ref(false);
const volume = ref(100);
const theme = useTheme().theme;

// Get button style from UI settings
const buttonStyle = computed(() => props.uiSettings.button_style);

// Get color from UI settings
const color = computed(() => props.uiSettings.color);

// Generate lighter and darker versions of the color for light/dark mode
const getLighterColor = (hexColor: string, percent: number = 0.2): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Lighten
  const lighter = [
    Math.min(255, Math.floor(r + (255 - r) * percent)),
    Math.min(255, Math.floor(g + (255 - g) * percent)),
    Math.min(255, Math.floor(b + (255 - b) * percent))
  ];
  
  // Convert back to hex
  return `#${lighter.map(c => c.toString(16).padStart(2, '0')).join('')}`;
};

const getDarkerColor = (hexColor: string, percent: number = 0.3): string => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Darken
  const darker = [
    Math.max(0, Math.floor(r * (1 - percent))),
    Math.max(0, Math.floor(g * (1 - percent))),
    Math.max(0, Math.floor(b * (1 - percent)))
  ];
  
  // Convert back to hex
  return `#${darker.map(c => c.toString(16).padStart(2, '0')).join('')}`;
};

// Button container style with dynamic color
const buttonContainerStyle = computed(() => {
  if (isTalking.value) {
    return {}; // Use default danger color for talking
  } else if (props.otherTalking) {
    return {}; // Use default warning color for other talking
  } else {
    // Use custom color based on theme
    const isDark = process.client && theme.value === 'dark' || 
      (theme.value === 'system' && process.client && window?.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      // Dark mode - use darker border and semi-transparent background
      const darkColor = getDarkerColor(color.value);
      return {
        borderColor: darkColor,
        backgroundColor: `${darkColor}20` // 20 = 12.5% opacity
      };
    } else {
      // Light mode - use lighter background and normal border
      const lightColor = getLighterColor(color.value, 0.8);
      return {
        borderColor: color.value,
        backgroundColor: lightColor
      };
    }
  }
});

// Button class based on state
const buttonClass = computed(() => {
  if (isTalking.value) {
    return 'bg-danger-50 border-danger-500 text-danger-700 dark:bg-danger-900/30 dark:border-danger-700 dark:text-danger-300';
  } else if (props.otherTalking) {
    return 'bg-warning-50 border-warning-500 text-warning-700 dark:bg-warning-900/30 dark:border-warning-700 dark:text-warning-300';
  } else if (isMuted.value) {
    return 'bg-gray-100 border-gray-400 text-gray-500 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400';
  } else {
    return 'border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-900/30';
  }
});

// Start talking (for mousedown/touchstart in unlocked mode)
const startTalking = () => {
  if (props.otherTalking || isMuted.value) return;
  
  isTalking.value = true;
  emit('talking-start', props.groupId);
};

// Stop talking (for mouseup/touchend in unlocked mode)
const stopTalking = () => {
  if (!isTalking.value) return;
  
  isTalking.value = false;
  emit('talking-stop', props.groupId);
};

// Toggle talking (for locked mode)
const toggleTalking = () => {
  if (props.otherTalking || isMuted.value) return;
  
  if (isTalking.value) {
    isTalking.value = false;
    emit('talking-stop', props.groupId);
  } else {
    isTalking.value = true;
    emit('talking-start', props.groupId);
  }
};

// Toggle lock state
const toggleLock = () => {
  isLocked.value = !isLocked.value;
  
  // If unlocking while talking, stop talking
  if (!isLocked.value && isTalking.value) {
    isTalking.value = false;
    emit('talking-stop', props.groupId);
  }
};

// Toggle mute state
const toggleMute = () => {
  isMuted.value = !isMuted.value;
  
  // If muting while talking, stop talking
  if (isMuted.value && isTalking.value) {
    isTalking.value = false;
    emit('talking-stop', props.groupId);
  }
  
  emit('mute-toggle', { groupId: props.groupId, muted: isMuted.value });
};

// Handle volume change
const onVolumeChange = () => {
  emit('volume-change', { groupId: props.groupId, volume: volume.value });
};

// Initialize volume from user settings
onMounted(() => {
  const userSettings = useUserSettings();
  const savedVolume = userSettings.getGroupVolume(props.groupId);
  if (savedVolume !== undefined) {
    volume.value = savedVolume;
  }
});
</script>

<style scoped>
/* Toggle switch styling */
input:checked ~ .dot {
  background-color: #3B82F6;
}
</style>