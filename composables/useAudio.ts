import type { AudioDevice } from '~/types';

export const useAudio = () => {
    const devices = ref<AudioDevice[]>([]);
  const speakerDevices = ref<AudioDevice[]>([]);
  const selectedDevice = ref<string | null>(null);
  const selectedSpeaker = ref<string | null>(null);
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
        // Create mock devices instead of requesting permission again
        devices.value = [{
          deviceId: 'default',
          label: 'Default Microphone (Permission Denied)',
        }];
        speakerDevices.value = [{
          deviceId: 'default',
          label: 'Default Speaker (Permission Denied)',
        }];
        selectedDevice.value = 'default';
        selectedSpeaker.value = 'default';
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
          speakerDevices.value = [{
            deviceId: 'default',
            label: 'Default Speaker (Permission Denied)',
          }];
          selectedDevice.value = 'default';
          selectedSpeaker.value = 'default';
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
      
      // Filter for audio output devices
      speakerDevices.value = allDevices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${speakerDevices.value.length + 1}`,
        }));
      
      // If no device is selected and we have devices, select the first ones
      if (!selectedDevice.value && devices.value.length > 0) {
        selectedDevice.value = devices.value[0].deviceId;
      }
      if (!selectedSpeaker.value && speakerDevices.value.length > 0) {
        selectedSpeaker.value = speakerDevices.value[0].deviceId;
      }
      
      return devices.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to get audio devices';
      console.error('Error getting audio devices:', err);
      
      // Create mock devices if there's an error
      devices.value = [{
        deviceId: 'default',
        label: 'Default Microphone',
      }];
      speakerDevices.value = [{
        deviceId: 'default',
        label: 'Default Speaker',
      }];
      selectedDevice.value = 'default';
      selectedSpeaker.value = 'default';
      return devices.value;
    } finally {
      loading.value = false;
    }
  };

  // Select an audio input device and get its stream
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
        const streamDestination = ctx.createMediaStreamDestination();
        oscillator.connect(streamDestination);
        oscillator.start();
        
        // Use the silent stream
        stream.value = streamDestination.stream;
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
        const destination = ctx.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        
        // Use the silent stream
        stream.value = destination.stream;
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

  // Select an audio output device (speaker)
  const selectSpeaker = async (deviceId: string) => {
    try {
      selectedSpeaker.value = deviceId;
      
      // Save selected speaker to user settings
      userSettings.setSpeakerDevice(deviceId);
      
      // Update all existing audio elements to use the new speaker
      const audioElements = document.querySelectorAll('audio');
      for (const element of audioElements) {
        if ((element as any).setSinkId) {
          await (element as any).setSinkId(deviceId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error selecting speaker device:', error);
      return false;
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

  // Load user's preferred devices from settings
  const loadPreferredDevices = async () => {
    // Get available devices first
    await getDevices();
    
    // Get preferred devices from user settings
    const preferredDeviceId = userSettings.settings.value.preferredAudioDevice;
    const preferredSpeakerId = userSettings.settings.value.preferredSpeakerDevice;
    
    if (preferredDeviceId) {
      // Check if preferred microphone is available
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
    
    if (preferredSpeakerId) {
      // Check if preferred speaker is available
      const speakerExists = speakerDevices.value.some(device => device.deviceId === preferredSpeakerId);
      
      if (speakerExists) {
        await selectSpeaker(preferredSpeakerId);
      } else if (speakerDevices.value.length > 0) {
        // If preferred speaker is not available, select the first available speaker
        await selectSpeaker(speakerDevices.value[0].deviceId);
      }
    } else if (speakerDevices.value.length > 0) {
      // If no preferred speaker, select the first available speaker
      await selectSpeaker(speakerDevices.value[0].deviceId);
    }
  };

  // Save selected devices as preferred
  const savePreferredDevices = () => {
    if (selectedDevice.value) {
      userSettings.setAudioDevice(selectedDevice.value);
    }
    if (selectedSpeaker.value) {
      userSettings.setSpeakerDevice(selectedSpeaker.value);
    }
  };

  // Funktion explizit zum Anfordern der Mikrofonberechtigung hinzufügen
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Wenn erfolgreich, Stream wieder freigeben
      stream.getTracks().forEach(track => track.stop());
      
      permissionDenied.value = false;
      
      // Nach erfolgreicher Berechtigung die Geräte neu laden
      await getDevices();
      
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      permissionDenied.value = true;
      return false;
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
    speakerDevices,
    selectedDevice,
    selectedSpeaker,
    stream,
    loading,
    error,
    volumeLevel,
    permissionDenied,
    getDevices,
    selectDevice,
    selectSpeaker,
    stopStream,
    loadPreferredDevices,
    savePreferredDevices,
    requestMicrophonePermission,
  };
};