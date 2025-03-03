import { AudioDevice } from '~/types';

export const useAudio = () => {
  const devices = ref<AudioDevice[]>([]);
  const selectedDevice = ref<string | null>(null);
  const stream = ref<MediaStream | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const audioContext = ref<AudioContext | null>(null);
  const analyser = ref<AnalyserNode | null>(null);
  const volumeLevel = ref<number>(0);
  const permissionDenied = ref(false);
  
  // Get user settings store for persistent storage
  const userSettings = useUserSettings();

  // Get available audio input devices
  const getDevices = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      // Check if permission was previously denied
      if (permissionDenied.value) {
        // Create a mock device instead of requesting permission again
        devices.value = [{
          deviceId: 'default',
          label: 'Default Microphone (Permission Denied)',
        }];
        selectedDevice.value = 'default';
        return devices.value;
      }
      
      try {
        // Request permission to access audio devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        // Handle permission denied
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          permissionDenied.value = true;
          devices.value = [{
            deviceId: 'default',
            label: 'Default Microphone (Permission Denied)',
          }];
          selectedDevice.value = 'default';
          return devices.value;
        }
        throw err;
      }
      
      // Get list of devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter for audio input devices
      devices.value = allDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${devices.value.length + 1}`,
        }));
      
      // If no device is selected and we have devices, select the first one
      if (!selectedDevice.value && devices.value.length > 0) {
        selectedDevice.value = devices.value[0].deviceId;
      }
      
      return devices.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to get audio devices';
      console.error('Error getting audio devices:', err);
      
      // Create a mock device if there's an error
      devices.value = [{
        deviceId: 'default',
        label: 'Default Microphone',
      }];
      selectedDevice.value = 'default';
      return devices.value;
    } finally {
      loading.value = false;
    }
  };

  // Select an audio device and get its stream
  const selectDevice = async (deviceId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      // Stop any existing stream
      if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop());
      }
      
      // If permission was denied, create a silent audio stream
      if (permissionDenied.value) {
        // Create a silent audio context as a fallback
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        
        // Use the silent stream
        stream.value = dst.stream;
        selectedDevice.value = deviceId;
        
        // Set up audio analysis with silent stream
        setupAudioAnalysis();
        
        // Save selected device to user settings
        userSettings.setAudioDevice(deviceId);
        
        return stream.value;
      }
      
      // Get stream from selected device
      stream.value = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      selectedDevice.value = deviceId;
      
      // Set up audio analysis
      setupAudioAnalysis();
      
      // Save selected device to user settings
      userSettings.setAudioDevice(deviceId);
      
      return stream.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to select audio device';
      console.error('Error selecting audio device:', err);
      
      // If permission denied, set flag and create silent stream
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        permissionDenied.value = true;
        
        // Create a silent audio context as a fallback
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        
        // Use the silent stream
        stream.value = dst.stream;
        selectedDevice.value = deviceId;
        
        // Set up audio analysis with silent stream
        setupAudioAnalysis();
        
        return stream.value;
      }
      
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Set up audio analysis for volume level
  const setupAudioAnalysis = () => {
    if (!stream.value) return;
    
    try {
      // Create audio context if it doesn't exist
      if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Create analyser node
      analyser.value = audioContext.value.createAnalyser();
      analyser.value.fftSize = 256;
      
      // Connect stream to analyser
      const source = audioContext.value.createMediaStreamSource(stream.value);
      source.connect(analyser.value);
      
      // Start analyzing volume
      analyzeVolume();
    } catch (err) {
      console.error('Error setting up audio analysis:', err);
    }
  };

  // Analyze volume level
  const analyzeVolume = () => {
    if (!analyser.value) return;
    
    const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
    
    const updateVolume = () => {
      if (!analyser.value) return;
      
      analyser.value.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      
      const average = sum / dataArray.length;
      volumeLevel.value = average / 255; // Normalize to 0-1
      
      // Continue analyzing
      requestAnimationFrame(updateVolume);
    };
    
    updateVolume();
  };

  // Stop audio stream
  const stopStream = () => {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop());
      stream.value = null;
    }
    
    if (audioContext.value) {
      audioContext.value.close();
      audioContext.value = null;
      analyser.value = null;
    }
    
    volumeLevel.value = 0;
  };

  // Load user's preferred audio device from settings
  const loadPreferredDevice = async () => {
    // Get available devices first
    await getDevices();
    
    // Get preferred device from user settings
    const preferredDeviceId = userSettings.settings.value.preferredAudioDevice;
    
    if (preferredDeviceId) {
      // Check if preferred device is available
      const deviceExists = devices.value.some(device => device.deviceId === preferredDeviceId);
      
      if (deviceExists) {
        await selectDevice(preferredDeviceId);
      } else if (devices.value.length > 0) {
        // If preferred device is not available, select the first available device
        await selectDevice(devices.value[0].deviceId);
      }
    } else if (devices.value.length > 0) {
      // If no preferred device, select the first available device
      await selectDevice(devices.value[0].deviceId);
    }
  };

  // Save selected device as preferred
  const savePreferredDevice = () => {
    if (selectedDevice.value) {
      userSettings.setAudioDevice(selectedDevice.value);
    }
  };

  // Initialize on component mount
  onMounted(async () => {
    if (process.client) {
      await getDevices();
      
      // Listen for device changes
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
          await getDevices();
        });
      }
    }
  });

  // Cleanup on component unmount
  onUnmounted(() => {
    if (process.client) {
      stopStream();
      
      // Remove event listener
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', getDevices);
      }
    }
  });

  return {
    devices,
    selectedDevice,
    stream,
    loading,
    error,
    volumeLevel,
    permissionDenied,
    getDevices,
    selectDevice,
    stopStream,
    loadPreferredDevice,
    savePreferredDevice,
  };
};