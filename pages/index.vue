<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <h1 class="text-2xl font-bold text-center mb-6">Welcome to Broadcast Intercom</h1>
      
      <form @submit.prevent="joinProduction" class="space-y-4">
        <div>
          <label for="production-code" class="block text-sm font-medium mb-1">
            Production Code
          </label>
          <input
            id="production-code"
            v-model="productionCode"
            type="text"
            placeholder="Enter production code"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
            minlength="16"
            maxlength="64"
            pattern=".*\d.*"
            title="Production code must be at least 16 characters long, contain at least one number, and be at most 64 characters long"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter the access code provided by your production administrator
          </p>
        </div>
        
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
            required
          />
        </div>
        
        <div class="pt-2">
          <button
            type="submit"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            :disabled="loading"
          >
            <span v-if="loading" class="mr-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
            {{ loading ? 'Joining...' : 'Join Production' }}
          </button>
        </div>
        
        <div class="text-center mt-4">
          <NuxtLink to="/settings" class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Audio Settings
          </NuxtLink>
          <span class="mx-2 text-gray-400">|</span>
          <NuxtLink to="/admin" class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Admin Panel
          </NuxtLink>
        </div>
      </form>
      
      <div v-if="error" class="mt-4 p-3 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded-md text-sm">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const { getProductionByCode, error: productionError } = useProduction();
const userSettings = useUserSettings();
const userStore = useUserStore();

const productionCode = ref('');
const displayName = ref(userStore.displayName || userSettings.settings.value.displayName || '');
const loading = ref(false);
const error = ref('');

// Join production
const joinProduction = async () => {
  if (!productionCode.value || !displayName.value) {
    error.value = 'Please enter both production code and your name';
    return;
  }
  
  // Validate production code
  if (productionCode.value.length < 16) {
    error.value = 'Production code must be at least 16 characters long';
    return;
  }
  
  if (productionCode.value.length > 64) {
    error.value = 'Production code must be at most 64 characters long';
    return;
  }
  
  if (!/\d/.test(productionCode.value)) {
    error.value = 'Production code must contain at least one number';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    // Initialize user store if needed
    if (!userStore.isInitialized) {
      userStore.initialize();
    }
    
    // Save display name to user store and settings
    userStore.setDisplayName(displayName.value);
    userSettings.setDisplayName(displayName.value);
    
    // Get production by code
    const production = await getProductionByCode(productionCode.value);
    
    if (!production) {
      error.value = productionError.value || 'Invalid production code';
      return;
    }
    
    // Navigate to production page
    router.push(`/production/${productionCode.value}`);
  } catch (err: any) {
    error.value = err.message || 'Failed to join production';
    console.error('Error joining production:', err);
  } finally {
    loading.value = false;
  }
};

// Initialize display name from user store
onMounted(() => {
  if (userStore.isInitialized) {
    displayName.value = userStore.displayName || userSettings.settings.value.displayName || '';
  }
});
</script>