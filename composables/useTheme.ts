export const useTheme = () => {
  const userSettings = useUserSettings();
  
  // Initialize theme based on user settings
  const initTheme = () => {
    if (process.client) {
      const theme = userSettings.settings.value.theme;
      
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Listen for system theme changes
      if (theme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (e.matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        });
      }
    }
  };
  
  // Set theme
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    userSettings.setTheme(theme);
    
    if (process.client) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  };
  
  return {
    theme: computed(() => userSettings.settings.value.theme),
    initTheme,
    setTheme,
  };
};