<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Create Group</h1>
      <NuxtLink 
        to="/admin/groups" 
        class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
      >
        Back to Groups
      </NuxtLink>
    </div>
    
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <form @submit.prevent="createGroup" class="space-y-4">
        <div>
          <label for="production" class="block text-sm font-medium mb-1">
            Production
          </label>
          <select
            id="production"
            v-model="form.productionId"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          >
            <option value="" disabled>Select a production</option>
            <option v-for="production in productions" :key="production.id" :value="production.id">
              {{ production.name }}
            </option>
          </select>
        </div>
        
        <div>
          <label for="name" class="block text-sm font-medium mb-1">
            Group Name
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Enter group name"
            class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
          />
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
            {{ loading ? 'Creating...' : 'Create Group' }}
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
import { Production } from '~/types';
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const router = useRouter();
const { getAllProductions, createGroup: createGroupApi } = useProduction();

const productions = ref<Production[]>([]);
const form = reactive({
  productionId: '',
  name: '',
});

const loading = ref(false);
const error = ref('');

// Fetch all productions
const fetchProductions = async () => {
  try {
    productions.value = await getAllProductions();
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch productions';
    console.error('Error fetching productions:', err);
  }
};

// Create group
const createGroup = async () => {
  if (!form.productionId || !form.name) {
    error.value = 'Please fill in all fields';
    return;
  }
  
  loading.value = true;
  error.value = '';
  
  try {
    const group = await createGroupApi(parseInt(form.productionId), form.name);
    
    // Show success message
    toast.success(`Group "${group.name}" created successfully`);
    
    // Navigate to production details
    router.push(`/admin/productions/${form.productionId}`);
  } catch (err: any) {
    error.value = err.message || 'Failed to create group';
    console.error('Error creating group:', err);
  } finally {
    loading.value = false;
  }
};

// Fetch productions on mount
onMounted(fetchProductions);
</script>