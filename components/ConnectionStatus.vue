<template>
  <div 
    class="fixed bottom-4 right-4 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-300"
    :class="connectionClass"
  >
    <div 
      class="w-2.5 h-2.5 rounded-full"
      :class="indicatorClass"
    ></div>
    {{ statusText }}
  </div>
</template>

<script setup lang="ts">
const { connected, socket } = useSocket();
const { loading } = useJanus();

// Track WebSocket vs polling connection
const isWebSocket = ref(false);

// Watch for socket connection and transport changes
watch(() => socket.value, (newSocket) => {
  if (newSocket) {
    // Check initial transport
    isWebSocket.value = newSocket.io.engine.transport.name === 'websocket';
    
    // Listen for transport changes
    newSocket.io.engine.on('upgrade', () => {
      isWebSocket.value = newSocket.io.engine.transport.name === 'websocket';
    });
  } else {
    isWebSocket.value = false;
  }
}, { immediate: true });

// Computed status
const status = computed(() => {
  if (loading.value) return 'connecting';
  if (!connected.value) return 'disconnected';
  return isWebSocket.value ? 'websocket' : 'polling';
});

// Status text
const statusText = computed(() => {
  switch (status.value) {
    case 'websocket':
      return 'WebSocket Connected';
    case 'polling':
      return 'HTTP Connected';
    case 'connecting':
      return 'Connecting...';
    case 'disconnected':
      return 'Demo Mode'; // Changed from "Disconnected" to be less alarming
    default:
      return 'Unknown';
  }
});

// Connection class
const connectionClass = computed(() => {
  switch (status.value) {
    case 'websocket':
      return 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300';
    case 'polling':
      return 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300';
    case 'connecting':
      return 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300';
    case 'disconnected':
      return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300'; // Changed from danger to gray
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
});

// Indicator class
const indicatorClass = computed(() => {
  switch (status.value) {
    case 'websocket':
      return 'bg-success-500';
    case 'polling':
      return 'bg-warning-500';
    case 'connecting':
      return 'bg-warning-500 animate-pulse';
    case 'disconnected':
      return 'bg-gray-500'; // Changed from danger to gray
    default:
      return 'bg-gray-500';
  }
});
</script>