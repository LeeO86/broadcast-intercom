<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">All Groups</h1>
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
    
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="error" class="bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg">
      <p class="text-danger-700 dark:text-danger-300">{{ error }}</p>
    </div>
    
    <div v-else>
      <GroupsTable
        ref="groupsTableRef"
        :groups="groups"
        :productions="productions"
        :show-production-link="true"
        @add-group="handleAddGroup"
        @update-group="handleUpdateGroup"
        @delete-group="handleDeleteGroup"
        @update-group-settings="handleUpdateGroupSettings"
        @update-group-ui-settings="handleUpdateGroupUISettings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Group, Production, GroupType } from '~/types';
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'admin',
});

const { getAllProductions } = useProduction();
const { updateGroup: updateGroupApi, deleteGroup: deleteGroupApi } = useProduction();

const groups = ref<Group[]>([]);
const productions = ref<Production[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const groupsTableRef = ref(null);

// Fetch all groups
const fetchGroups = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Fetch all productions first
    productions.value = await getAllProductions();
    
    // Fetch all groups
    const response = await $fetch('/api/groups');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch groups');
    }
    
    groups.value = response.data;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch groups';
    console.error('Error fetching groups:', err);
  } finally {
    loading.value = false;
  }
};

// Handle add group
const handleAddGroup = async (data: { productionId: number, name: string, type: GroupType }) => {
  try {
    // Create group with the selected type
    const response = await $fetch('/api/groups', {
      method: 'POST',
      body: {
        production_id: data.productionId,
        name: data.name,
        type: data.type
      }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create group');
    }
    
    // Add group to list
    groups.value.push(response.data);
    
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
    
    // Update group in list
    const index = groups.value.findIndex(g => g.id === data.id);
    if (index !== -1) {
      groups.value[index].name = data.name;
      groups.value[index].type = data.type;
      groups.value[index].changed_at = new Date().toISOString();
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
    
    // Remove group from list
    groups.value = groups.value.filter(g => g.id !== groupId);
    
    toast.success('Group deleted successfully');
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete group');
    console.error('Error deleting group:', err);
    throw err;
  }
};

// Handle update group settings
const handleUpdateGroupSettings = async (data: { id: number, settings: any }) => {
  try {
    const response = await $fetch(`/api/groups/${data.id}/settings`, {
      method: 'PUT',
      body: data.settings
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update settings');
    }
    
    // Update group in list
    const index = groups.value.findIndex(g => g.id === data.id);
    if (index !== -1) {
      groups.value[index].settings = data.settings;
    }
    
    toast.success('Audio settings updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update settings');
    console.error('Error updating settings:', err);
    throw err;
  }
};

// Handle update group UI settings
const handleUpdateGroupUISettings = async (data: { id: number, uiSettings: any }) => {
  try {
    const response = await $fetch(`/api/groups/${data.id}/ui-settings`, {
      method: 'PUT',
      body: data.uiSettings
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update UI settings');
    }
    
    // Update group in list
    const index = groups.value.findIndex(g => g.id === data.id);
    if (index !== -1) {
      groups.value[index].ui_settings = data.uiSettings;
    }
    
    toast.success('UI settings updated');
  } catch (err: any) {
    toast.error(err.message || 'Failed to update UI settings');
    console.error('Error updating UI settings:', err);
    throw err;
  }
};

// Fetch data on mount
onMounted(fetchGroups);
</script>