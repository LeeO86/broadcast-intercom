<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Janus Rooms</h1>
      <button
        type="button"
        class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        @click="refreshRooms"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
        </svg>
        Refresh
      </button>
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
              Room ID
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Description
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" class="relative px-6 py-3">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="room in rooms" :key="room.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium">{{ room.id }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm">{{ room.description }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ formatDateTime(room.created) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button 
                type="button" 
                class="text-danger-600 hover:text-danger-500 dark:text-danger-400 dark:hover:text-danger-300"
                @click="confirmDeleteRoom(room)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="rooms.length === 0">
            <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No Janus rooms found
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Delete Room Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">Confirm Delete</h3>
        <p class="mb-4">Are you sure you want to delete the Janus room "{{ roomToDelete?.description }}" (ID: {{ roomToDelete?.id }})? This action cannot be undone.</p>
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
            @click="deleteRoom"
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

interface JanusRoom {
  id: number;
  description: string;
  created: string;
}

const rooms = ref<JanusRoom[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Delete modal state
const showDeleteModal = ref(false);
const roomToDelete = ref<JanusRoom | null>(null);
const deleteLoading = ref(false);

// Fetch Janus rooms
const fetchRooms = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await $fetch('/api/janus/rooms');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch Janus rooms');
    }
    
    rooms.value = response.data;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch Janus rooms';
    console.error('Error fetching Janus rooms:', err);
  } finally {
    loading.value = false;
  }
};

// Refresh rooms
const refreshRooms = () => {
  fetchRooms();
};

// Format date and time
const formatDateTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Confirm delete room
const confirmDeleteRoom = (room: JanusRoom) => {
  roomToDelete.value = room;
  showDeleteModal.value = true;
};

// Delete room
const deleteRoom = async () => {
  if (!roomToDelete.value) return;
  
  deleteLoading.value = true;
  
  try {
    const response = await $fetch(`/api/janus/rooms/${roomToDelete.value.id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete Janus room');
    }
    
    // Remove room from list
    rooms.value = rooms.value.filter(r => r.id !== roomToDelete.value?.id);
    
    // Close modal
    showDeleteModal.value = false;
    roomToDelete.value = null;
    
    toast.success('Janus room deleted successfully');
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete Janus room');
    console.error('Error deleting Janus room:', err);
  } finally {
    deleteLoading.value = false;
  }
};

// Fetch data on mount
onMounted(fetchRooms);
</script>