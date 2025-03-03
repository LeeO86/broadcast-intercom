<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Create Production</h1>
      <NuxtLink 
        to="/admin/productions" 
        class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
      >
        Back to Productions
      </NuxtLink>
    </div>
    
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <form @submit.prevent="createNewProduction" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium mb-1">
            Production Name
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Enter production name"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
        </div>
        
        <div>
          <label for="access-code" class="block text-sm font-medium mb-1">
            Access Code
          </label>
          <div class="flex">
            <input
              id="access-code"
              v-model="form.accessCode"
              type="text"
              placeholder="Enter access code"
              class="block w-full rounded-md rounded-r-none border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              required
            />
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md shadow-sm text-sm font-medium bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              @click="generateAccessCode"
            >
              Generate
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Access code must be at least 16 characters long, contain at least one number, and be at most 64 characters long.
          </p>
        </div>
        
        <div class="pt-4">
          <button
            type="submit"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            :disabled="loading"
          >
            <span v-if="loading" class="mr-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
            {{ loading ? 'Creating...' : 'Create Production' }}
          </button>
        </div>
      </form>
      
      <div v-if="error" class="mt-4 p-3 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded-md text-sm">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const router = useRouter();
const { createProduction } = useProduction();

const form = reactive({
  name: '',
  accessCode: '',
});

const loading = ref(false);
const error = ref('');

// Generate a random access code that meets the requirements
const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  // Generate a code that's 16-20 characters long
  const length = Math.floor(Math.random() * 5) + 16;
  
  // Ensure at least one number
  let hasNumber = false;
  
  for (let i = 0; i < length; i++) {
    const char = chars.charAt(Math.floor(Math.random() * chars.length));
    code += char;
    
    // Check if the character is a number
    if (!hasNumber && /\d/.test(char)) {
      hasNumber = true;
    }
  }
  
  // If no number was added, replace a random character with a number
  if (!hasNumber) {
    const position = Math.floor(Math.random() * code.length);
    const numbers = '23456789';
    const randomNumber = numbers.charAt(Math.floor(Math.random() * numbers.length));
    code = code.substring(0, position) + randomNumber + code.substring(position + 1);
  }
  
  form.accessCode = code;
};

// Create production
const createNewProduction = async () => {
  if (!form.name || !form.accessCode) {
    error.value = 'Please fill in all fields';
    return;
  }
  
  if (form.accessCode.length < 16) {
    error.value = 'Access code must be at least 16 characters long';
    return;
  }
  
  if (form.accessCode.length > 64) {
    error.value = 'Access code must be at most 64 characters long';
    return;
  }
  
  if (!/\d/.test(form.accessCode)) {
    error.value = 'Access code must contain at least one number';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    const production = await createProduction(form.name, form.accessCode);
    
    if (production && production.id) {
      // Show success message with the actual name
      toast.success(`Production "${production.name}" created successfully`);
      
      // Navigate to production details with the correct ID
      router.push(`/admin/productions/${production.id}`);
    } else {
      throw new Error('Failed to create production: Invalid response');
    }
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create production';
    error.value = errorMessage;
    console.error('Error creating production:', err);
  } finally {
    loading.value = false;
  }
};
</script>