<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Productions</h1>
      <NuxtLink 
        to="/admin/productions/new" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Create Production
      </NuxtLink>
    </div>
    
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="error" class="bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg">
      <p class="text-danger-700 dark:text-danger-300">{{ error }}</p>
    </div>
    
    <div v-else class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Access Code
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Groups
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Updated
            </th>
            <th scope="col" class="relative px-6 py-3">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="production in productions" :key="production.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium">{{ production.name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm">{{ production.access_code }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm">{{ productionGroupCounts[production.id] || 0 }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(production.created_at) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(production.changed_at) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <NuxtLink 
                :to="`/admin/productions/${production.id}`" 
                class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
              >
                View
              </NuxtLink>
              <NuxtLink 
                :to="`/admin/productions/${production.id}/edit`" 
                class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
              >
                Edit
              </NuxtLink>
              <button 
                type="button" 
                class="text-danger-600 hover:text-danger-500 dark:text-danger-400 dark:hover:text-danger-300"
                @click="confirmDelete(production)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="productions.length === 0">
            <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No productions found
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">Confirm Delete</h3>
        <p class="mb-4">Are you sure you want to delete the production "{{ productionToDelete?.name }}"? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button 
            type="button" 
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500"
            @click="deleteProduction"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Production, Group } from '~/types';
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const { getAllProductions, deleteProduction: deleteProductionApi } = useProduction();

const productions = ref<Production[]>([]);
const groups = ref<Group[]>([]);
const productionGroupCounts = ref<Record<number, number>>({});
const loading = ref(true);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const productionToDelete = ref<Production | null>(null);

// Get all productions
const fetchProductions = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    productions.value = await getAllProductions();
    await fetchGroups();
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch productions';
    console.error('Error fetching productions:', err);
  } finally {
    loading.value = false;
  }
};

// Fetch all groups to count them per production
const fetchGroups = async () => {
  try {
    const response = await $fetch('/api/groups');
    
    if (response.success) {
      groups.value = response.data;
      
      // Count groups per production
      const counts: Record<number, number> = {};
      
      for (const group of groups.value) {
        if (!counts[group.production_id]) {
          counts[group.production_id] = 0;
        }
        counts[group.production_id]++;
      }
      
      productionGroupCounts.value = counts;
    }
  } catch (err) {
    console.error('Error fetching groups:', err);
  }
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Confirm delete
const confirmDelete = (production: Production) => {
  productionToDelete.value = production;
  showDeleteModal.value = true;
};

// Delete production
const deleteProduction = async () => {
  if (!productionToDelete.value) return;
  
  try {
    await deleteProductionApi(productionToDelete.value.id);
    
    // Remove from list
    productions.value = productions.value.filter(p => p.id !== productionToDelete.value?.id);
    
    // Show success message
    toast.success(`Production "${productionToDelete.value.name}" deleted successfully`);
    
    // Close modal
    showDeleteModal.value = false;
    productionToDelete.value = null;
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete production');
    console.error('Error deleting production:', err);
  }
};

// Fetch data on mount
onMounted(fetchProductions);
</script>