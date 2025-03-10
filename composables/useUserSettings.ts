import { UserSettings } from '~/types';

export const useUserSettings = () => {
  // Default settings
  const defaultSettings: UserSettings = {
    displayName: '',
    theme: 'system',
    preferredAudioDevice: '',
    preferredSpeakerDevice: '',
    groupVolumes: {},
    audioSettings: {
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true
    }
  };

  // Settings state
  const settings = useState<UserSettings>('userSettings', () => {
    // Try to load settings from localStorage
    if (process.client) {
      try {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          return {
            ...defaultSettings,
            ...JSON.parse(savedSettings),
          };
        }
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
    
    return { ...defaultSettings };
  });

  // Get user store for display name
  const userStore = useUserStore();

  // Update settings
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    settings.value = {
      ...settings.value,
      ...newSettings,
    };
    
    // Save to localStorage
    if (process.client) {
      try {
        localStorage.setItem('userSettings', JSON.stringify(settings.value));
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
      }
    }
  };

  // Set display name
  const setDisplayName = (name: string) => {
    // Update in user store
    userStore.setDisplayName(name);
    
    // Also update in settings
    updateSettings({ displayName: name });
  };

  // Set theme
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
  };

  // Set preferred audio device
  const setAudioDevice = (deviceId: string) => {
    updateSettings({ preferredAudioDevice: deviceId });
  };

  // Set preferred speaker device
  const setSpeakerDevice = (deviceId: string) => {
    updateSettings({ preferredSpeakerDevice: deviceId });
  };

  // Set audio settings
  const setAudioSettings = (audioSettings: {
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    autoGainControl?: boolean;
  }) => {
    updateSettings({
      audioSettings: {
        ...settings.value.audioSettings || {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        },
        ...audioSettings
      }
    });
  };

  // Set group volume
  const setGroupVolume = (groupId: number, volume: number) => {
    const groupVolumes = {
      ...settings.value.groupVolumes,
      [groupId]: volume,
    };
    
    updateSettings({ groupVolumes });
  };

  // Get group volume
  const getGroupVolume = (groupId: number): number => {
    return settings.value.groupVolumes[groupId] ?? 100;
  };

  return {
    settings,
    updateSettings,
    setDisplayName,
    setTheme,
    setAudioDevice,
    setSpeakerDevice,
    setAudioSettings,
    setGroupVolume,
    getGroupVolume,
  };
};