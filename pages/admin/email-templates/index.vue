<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Email Templates</h1>
      <NuxtLink 
        to="/admin/email-templates/new" 
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Create Template
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
              Description
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Updated
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Used By
            </th>
            <th scope="col" class="relative px-6 py-3">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="template in templates" :key="template.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium">{{ template.name }}</div>
              <div v-if="template.is_default" class="text-xs text-primary-600 dark:text-primary-400">Default</div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm">{{ template.description }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(template.changed_at) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm">{{ template.usage_count }} productions</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <NuxtLink 
                :to="`/admin/email-templates/${template.id}`" 
                class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
              >
                Edit
              </NuxtLink>
              <button 
                type="button" 
                class="text-danger-600 hover:text-danger-500 dark:text-danger-400 dark:hover:text-danger-300"
                @click="confirmDelete(template)"
                :disabled="template.is_default || template.usage_count > 0"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="templates.length === 0">
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No email templates found
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">Confirm Delete</h3>
        <p class="mb-4">Are you sure you want to delete the template "{{ templateToDelete?.name }}"? This action cannot be undone.</p>
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
            :disabled="deleteLoading"
            @click="deleteTemplate"
          >
            <span v-if="deleteLoading" class="mr-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
            {{ deleteLoading ? 'Deleting...' : 'Delete' }}
          </button>
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

interface EmailTemplate {
  id: number;
  name: string;
  description: string;
  content: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  changed_at: string;
}

const templates = ref<EmailTemplate[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const templateToDelete = ref<EmailTemplate | null>(null);
const deleteLoading = ref(false);

// Fetch all templates
const fetchTemplates = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await $fetch('/api/email-templates');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch email templates');
    }
    
    templates.value = response.data;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch email templates';
    console.error('Error fetching email templates:', err);
  } finally {
    loading.value = false;
  }
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Confirm delete
const confirmDelete = (template: EmailTemplate) => {
  if (template.is_default) {
    toast.error('Cannot delete the default template');
    return;
  }
  
  if (template.usage_count > 0) {
    toast.error('Cannot delete a template that is in use');
    return;
  }
  
  templateToDelete.value = template;
  showDeleteModal.value = true;
};

// Delete template
const deleteTemplate = async () => {
  if (!templateToDelete.value) return;
  
  deleteLoading.value = true;
  
  try {
    const response = await $fetch(`/api/email-templates/${templateToDelete.value.id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete template');
    }
    
    // Remove template from list
    templates.value = templates.value.filter(t => t.id !== templateToDelete.value?.id);
    
    // Close modal
    showDeleteModal.value = false;
    templateToDelete.value = null;
    
    toast.success('Email template deleted successfully');
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete template');
    console.error('Error deleting template:', err);
  } finally {
    deleteLoading.value = false;
  }
};

// Fetch data on mount
onMounted(fetchTemplates);
</script>