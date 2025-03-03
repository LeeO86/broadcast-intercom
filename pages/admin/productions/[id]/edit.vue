<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="error" class="bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg">
      <p class="text-danger-700 dark:text-danger-300">{{ error }}</p>
      <div class="mt-4">
        <NuxtLink 
          to="/admin/productions" 
          class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Back to Productions
        </NuxtLink>
      </div>
    </div>
    
    <div v-else>
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Edit Production</h1>
        <NuxtLink 
          :to="productionId ? `/admin/productions/${productionId}` : '/admin/productions'" 
          class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Back to Production
        </NuxtLink>
      </div>
      
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <form @submit.prevent="updateProduction" class="space-y-4">
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
          
          <div>
            <label for="email-template" class="block text-sm font-medium mb-1">
              Email Template
            </label>
            <div class="relative">
              <select
                id="email-template"
                v-model="form.templateId"
                class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option v-for="template in emailTemplates" :key="template.id" :value="template.id">
                  {{ template.name }} {{ template.is_default ? '(Default)' : '' }}
                </option>
              </select>
              <div v-if="loadingTemplates" class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <div class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <NuxtLink to="/admin/email-templates" class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                Manage email templates
              </NuxtLink>
            </p>
          </div>
          
          <div class="pt-4">
            <button
              type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              :disabled="updateLoading"
            >
              <span v-if="updateLoading" class="mr-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </span>
              {{ updateLoading ? 'Updating...' : 'Update Production' }}
            </button>
          </div>
        </form>
        
        <div v-if="updateError" class="mt-4 p-3 bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 rounded-md text-sm">
          {{ updateError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const route = useRoute();
const router = useRouter();
const productionId = computed(() => {
  const id = route.params.id;
  if (!id || id === 'undefined') {
    return null;
  }
  return parseInt(id as string);
});

const { production, loading, error, getProductionById, updateProduction: updateProductionApi } = useProduction();

const form = reactive({
  name: '',
  accessCode: '',
  templateId: null as number | null,
});

const updateLoading = ref(false);
const updateError = ref('');
const emailTemplates = ref([]);
const loadingTemplates = ref(false);

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

// Fetch email templates
const fetchEmailTemplates = async () => {
  loadingTemplates.value = true;
  
  try {
    const response = await $fetch('/api/email-templates');
    
    if (response.success) {
      emailTemplates.value = response.data;
    } else {
      throw new Error(response.error || 'Failed to fetch email templates');
    }
  } catch (err) {
    console.error('Error fetching email templates:', err);
    toast.error('Failed to fetch email templates');
  } finally {
    loadingTemplates.value = false;
  }
};

// Update production
const updateProduction = async () => {
  if (!form.name || !form.accessCode) {
    updateError.value = 'Please fill in all fields';
    return;
  }
  
  if (form.accessCode.length < 16) {
    updateError.value = 'Access code must be at least 16 characters long';
    return;
  }
  
  if (form.accessCode.length > 64) {
    updateError.value = 'Access code must be at most 64 characters long';
    return;
  }
  
  if (!/\d/.test(form.accessCode)) {
    updateError.value = 'Access code must contain at least one number';
    return;
  }
  
  if (!productionId.value) {
    updateError.value = 'Invalid production ID';
    return;
  }
  
  updateLoading.value = true;
  updateError.value = '';
  
  try {
    // First update the basic production details
    await updateProductionApi(productionId.value, form.name, form.accessCode);
    
    // Then update the template if selected
    if (form.templateId) {
      await $fetch(`/api/productions/${productionId.value}/template`, {
        method: 'PUT',
        body: {
          template_id: form.templateId
        }
      });
    }
    
    // Show success message
    toast.success('Production updated successfully');
    
    // Navigate back to production details
    router.push(`/admin/productions/${productionId.value}`);
  } catch (err: any) {
    updateError.value = err.message || 'Failed to update production';
    console.error('Error updating production:', err);
  } finally {
    updateLoading.value = false;
  }
};

// Fetch production data and initialize form
onMounted(async () => {
  if (productionId.value) {
    await fetchEmailTemplates();
    const prod = await getProductionById(productionId.value);
    
    if (prod) {
      form.name = prod.name;
      form.accessCode = prod.access_code;
      form.templateId = prod.template_id || null;
    }
  } else {
    error.value = 'Invalid production ID';
  }
});
</script>