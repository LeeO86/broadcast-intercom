<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Admin Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Productions</h2>
        <div class="flex justify-between items-center">
          <div class="text-3xl font-bold">{{ productions.length }}</div>
          <NuxtLink 
            to="/admin/productions" 
            class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
          >
            View All
          </NuxtLink>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Groups</h2>
        <div class="flex justify-between items-center">
          <div class="text-3xl font-bold">{{ totalGroups }}</div>
          <NuxtLink 
            to="/admin/groups" 
            class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
          >
            View All
          </NuxtLink>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
        <div class="space-y-2">
          <NuxtLink 
            to="/admin/productions/new" 
            class="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Create Production
          </NuxtLink>
          <NuxtLink 
            to="/admin/groups/new" 
            class="block w-full text-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Create Group
          </NuxtLink>
        </div>
      </div>
    </div>
    
    <div class="mt-8">
      <h2 class="text-xl font-semibold mb-4">System Activity Log</h2>
      <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Item
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Details
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="activity in activityLog" :key="activity.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div :class="getActionClass(activity.action)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ formatAction(activity.action) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium">{{ formatItemType(activity.item_type) }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm">
                  <span class="font-medium">{{ activity.item_name }}</span>
                  <span v-if="activity.production_name && activity.item_type === 'group'" class="text-gray-500 dark:text-gray-400">
                    in {{ activity.production_name }}
                  </span>
                  <div v-if="activity.details" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {{ activity.details }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500 dark:text-gray-400">{{ formatDateTime(activity.timestamp) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <NuxtLink 
                  v-if="activity.action !== 'deleted' && activity.production_id && activity.item_type === 'group'"
                  :to="`/admin/productions/${activity.production_id}`" 
                  class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  View Production
                </NuxtLink>
                <NuxtLink 
                  v-else-if="activity.action !== 'deleted' && activity.item_type === 'production'"
                  :to="`/admin/productions/${activity.item_id}`" 
                  class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  View
                </NuxtLink>
              </td>
            </tr>
            <tr v-if="activityLog.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No activity recorded yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Production, ProductionWithGroups, ActivityLogEntry } from '~/types';

definePageMeta({
  layout: 'admin',
});

const { getAllProductions } = useProduction();

const productions = ref<Production[]>([]);
const groups = ref<any[]>([]);
const activityLog = ref<ActivityLogEntry[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Get all productions
const fetchProductions = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    productions.value = await getAllProductions();
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch productions';
    console.error('Error fetching productions:', err);
  } finally {
    loading.value = false;
  }
};

// Get all groups
const fetchGroups = async () => {
  try {
    const response = await $fetch('/api/groups');
    if (response.success) {
      groups.value = response.data;
    }
  } catch (err) {
    console.error('Error fetching groups:', err);
  }
};

// Fetch activity log
const fetchActivityLog = async () => {
  try {
    const response = await $fetch('/api/activity?limit=20');
    if (response.success) {
      activityLog.value = response.data;
    }
  } catch (err) {
    console.error('Error fetching activity log:', err);
  }
};

// Get total number of groups
const totalGroups = computed(() => {
  return groups.value.length;
});

// Format action for display
const formatAction = (action: string) => {
  return action.charAt(0).toUpperCase() + action.slice(1);
};

// Format item type for display
const formatItemType = (itemType: string) => {
  return itemType.charAt(0).toUpperCase() + itemType.slice(1);
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Format date and time
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Get CSS class for action type
const getActionClass = (action: string) => {
  switch (action) {
    case 'created':
      return 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300';
    case 'updated':
      return 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300';
    case 'deleted':
      return 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Fetch data on mount
onMounted(async () => {
  await fetchProductions();
  await fetchGroups();
  await fetchActivityLog();
});
</script>