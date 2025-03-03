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
        <h1 class="text-2xl font-bold">{{ production?.name }}</h1>
        <div class="flex space-x-3">
          <NuxtLink 
            :to="productionId ? `/admin/productions/${productionId}/edit` : '/admin/productions'" 
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Edit Production
          </NuxtLink>
          <NuxtLink 
            to="/admin/productions" 
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Back to Productions
          </NuxtLink>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 class="text-lg font-semibold mb-4">Production Details</h2>
            <div class="space-y-3">
              <div>
                <span class="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                <p class="font-medium">{{ production?.name }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500 dark:text-gray-400">Access Code:</span>
                <p class="font-medium">{{ production?.access_code }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500 dark:text-gray-400">Email Template:</span>
                <p class="font-medium">{{ templateName }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500 dark:text-gray-400">Created:</span>
                <p class="font-medium">{{ formatDate(production?.created_at) }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-500 dark:text-gray-400">Last Updated:</span>
                <p class="font-medium">{{ formatDate(production?.changed_at) }}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 class="text-lg font-semibold mb-4">Access Information</h2>
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <p class="text-sm mb-2">Users can join this production using:</p>
              <div class="flex items-center space-x-2 mb-4">
                <span class="font-mono bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-sm">
                  {{ production?.access_code }}
                </span>
                <button
                  type="button"
                  class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                  @click="copyAccessCode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                  </svg>
                </button>
              </div>
              <p class="text-sm">Direct link:</p>
              <div class="flex items-center space-x-2">
                <span class="font-mono bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-sm truncate max-w-xs">
                  {{ joinUrl }}
                </span>
                <div class="flex space-x-1">
                  <button
                    type="button"
                    class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                    @click="copyJoinUrl"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                      <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                    @click="emailJoinUrl"
                    title="Email link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                    @click="openInNewTab"
                    title="Open in new tab"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Groups</h2>
          <div class="flex space-x-2">
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              @click="groupsTableRef?.openAddGroupModal('intercom')"
            >
              Add Intercom Group
            </button>
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              @click="groupsTableRef?.openAddGroupModal('program')"
            >
              Add Program Sound
            </button>
          </div>
        </div>
        
        <GroupsTable
          ref="groupsTableRef"
          :groups="production?.groups || []"
          :production-id="productionId || 0"
          @add-group="handleAddGroup"
          @update-group="handleUpdateGroup"
          @delete-group="handleDeleteGroup"
          @update-group-settings="handleUpdateGroupSettings"
          @update-group-ui-settings="handleUpdateGroupUISettings"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Group, GroupSettings, GroupUISettings, GroupType } from '~/types';
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const route = useRoute();
const productionId = computed(() => {
  const id = route.params.id;
  if (!id || id === 'undefined') {
    return null;
  }
  return parseInt(id as string);
});

const { 
  production, 
  loading, 
  error, 
  getProductionById, 
  createGroup: createGroupApi, 
  updateGroup: updateGroupApi, 
  deleteGroup: deleteGroupApi
} = useProduction();

// Template name
const templateName = ref('Loading...');
const groupsTableRef = ref(null);

// Fetch template name
const fetchTemplateName = async () => {
  if (!production.value || !production.value.template_id) {
    templateName.value = 'Default';
    return;
  }
  
  try {
    const response = await $fetch(`/api/email-templates/${production.value.template_id}`);
    if (response.success) {
      templateName.value = response.data.name;
    } else {
      templateName.value = 'Unknown Template';
    }
  } catch (err) {
    console.error('Error fetching template name:', err);
    templateName.value = 'Unknown Template';
  }
};

// Join URL
const joinUrl = computed(() => {
  if (!production.value) return '';
  return `${window.location.origin}/production/${production.value.access_code}`;
});

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Copy access code to clipboard
const copyAccessCode = () => {
  if (!production.value) return;
  
  navigator.clipboard.writeText(production.value.access_code);
  toast.success('Access code copied to clipboard');
};

// Copy join URL to clipboard
const copyJoinUrl = () => {
  navigator.clipboard.writeText(joinUrl.value);
  toast.success('Join URL copied to clipboard');
};

// Email join URL
const emailJoinUrl = () => {
  if (!production.value) return;
  
  // Get username from localStorage or use "Admin" as default
  const userSettings = useUserSettings();
  const username = userSettings.settings.value.displayName || 'Admin';
  
  // Get the email template and replace variables
  const emailTemplate = production.value.email_template || '';
  const subject = encodeURIComponent(`Join ${production.value.name} Intercom`);
  const body = encodeURIComponent(
    emailTemplate
      .replace(/{production_name}/g, production.value.name)
      .replace(/{join_url}/g, joinUrl.value)
      .replace(/{access_code}/g, production.value.access_code)
      .replace(/{sender_name}/g, username)
  );
  
  // Open mailto link
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

// Open in new tab
const openInNewTab = () => {
  window.open(joinUrl.value, '_blank');
};

// Handle add group
const handleAddGroup = async (data: { productionId: number, name: string, type: GroupType }) => {
  try {
    await createGroupApi(data.productionId, data.name, data.type);
    
    // Refresh production data
    if (productionId.value) {
      await getProductionById(productionId.value);
    }
    
    toast.success(`${data.type === GroupType.PROGRAM ? 'Program Sound' : 'Intercom'} group added successfully`);
  } catch (err: any) {
    toast.error(err.message || 'Failed to add group');
    console.error('Error adding group:', err);
    throw err;
  }
};

// Handle update group
const handleUpdateGroup = async (data: { id: number, name: string, type: GroupType }) => {
  try {
    await updateGroupApi(data.id, data.name, undefined, undefined, data.type);
    
    // Refresh production data
    if (productionId.value) {
      await getProductionById(productionId.value);
    }
    
    toast.success('Group updated successfully');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update group');
    console.error('Error updating group:', err);
    throw err;
  }
};

// Handle delete group
const handleDeleteGroup = async (groupId: number) => {
  try {
    await deleteGroupApi(groupId);
    
    // Refresh production data
    if (productionId.value) {
      await getProductionById(productionId.value);
    }
    
    toast.success('Group deleted successfully');
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete group');
    console.error('Error deleting group:', err);
    throw err;
  }
};

// Handle group settings updated
const handleUpdateGroupSettings = async (data: { id: number, settings: GroupSettings }) => {
  try {
    const response = await $fetch(`/api/groups/${data.id}/settings`, {
      method: 'PUT',
      body: data.settings
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update settings');
    }
    
    // Refresh production data to get the latest settings
    if (productionId.value) {
      await getProductionById(productionId.value);
    }
    
    toast.success('Audio settings updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update settings');
    console.error('Error updating settings:', err);
    throw err;
  }
};

// Handle group UI settings updated
const handleUpdateGroupUISettings = async (data: { id: number, uiSettings: GroupUISettings }) => {
  try {
    const response = await $fetch(`/api/groups/${data.id}/ui-settings`, {
      method: 'PUT',
      body: data.uiSettings
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update UI settings');
    }
    
    // Refresh production data to get the latest settings
    if (productionId.value) {
      await getProductionById(productionId.value);
    }
    
    toast.success('UI settings updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update UI settings');
    console.error('Error updating UI settings:', err);
    throw err;
  }
};

// Fetch production data and template name on mount
onMounted(async () => {
  if (productionId.value) {
    await getProductionById(productionId.value);
    await fetchTemplateName();
  } else {
    error.value = 'Invalid production ID';
  }
});

// Update template name when production changes
watch(() => production.value?.template_id, async () => {
  if (production.value) {
    await fetchTemplateName();
  }
});
</script>