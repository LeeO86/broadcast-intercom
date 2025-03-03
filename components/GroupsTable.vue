<template>
  <div>
    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Janus Room ID
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
          <tr v-for="group in groups" :key="group.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div 
                  class="w-3 h-3 rounded-full mr-2"
                  :style="{ backgroundColor: group.ui_settings.color }"
                ></div>
                <div class="text-sm font-medium">{{ group.name }}</div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="group.type === 'program' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'"
              >
                {{ group.type === 'program' ? 'Program Sound' : 'Intercom' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm">{{ group.janus_room_id }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(group.changed_at) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <NuxtLink 
                v-if="showProductionLink && group.production_id"
                :to="`/admin/productions/${group.production_id}`" 
                class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
              >
                View Production
              </NuxtLink>
              <button 
                type="button" 
                class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                @click="editGroup(group)"
              >
                Edit
              </button>
              <button 
                type="button" 
                class="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                @click="editGroupSettings(group)"
              >
                Settings
              </button>
              <button 
                type="button" 
                class="text-danger-600 hover:text-danger-500 dark:text-danger-400 dark:hover:text-danger-300"
                @click="confirmDeleteGroup(group)"
              >
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="groups.length === 0">
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No groups found
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Add Group Modal -->
    <div v-if="showAddGroupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">
          Add {{ newGroupType === 'program' ? 'Program Sound' : 'Intercom' }} Group
        </h3>
        <form @submit.prevent="addGroup" class="space-y-4">
          <div v-if="!productionId">
            <label for="production" class="block text-sm font-medium mb-1">
              Production
            </label>
            <select
              id="production"
              v-model="groupForm.productionId"
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
            <label for="group-name" class="block text-sm font-medium mb-1">
              Group Name
            </label>
            <input
              id="group-name"
              v-model="groupForm.name"
              type="text"
              placeholder="Enter group name"
              class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              required
            />
          </div>
          
          <div v-if="newGroupType === 'program'" class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md text-sm">
            <p class="text-emerald-700 dark:text-emerald-300">
              <strong>Program Sound Group:</strong> One user can broadcast audio to all listeners. This is ideal for distributing program audio to all participants.
            </p>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              @click="closeAddGroupModal"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white"
              :class="newGroupType === 'program' ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'"
              :disabled="groupLoading"
            >
              <span v-if="groupLoading" class="mr-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </span>
              {{ groupLoading ? 'Adding...' : 'Add Group' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Edit Group Modal -->
    <div v-if="showEditGroupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">Edit Group</h3>
        <form @submit.prevent="updateGroup" class="space-y-4">
          <div>
            <label for="edit-group-name" class="block text-sm font-medium mb-1">
              Group Name
            </label>
            <input
              id="edit-group-name"
              v-model="groupForm.name"
              type="text"
              placeholder="Enter group name"
              class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label for="edit-group-type" class="block text-sm font-medium mb-1">
              Group Type
            </label>
            <select
              id="edit-group-type"
              v-model="groupForm.type"
              class="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              required
            >
              <option value="intercom">Intercom</option>
              <option value="program">Program Sound</option>
            </select>
          </div>
          
          <div v-if="groupForm.type === 'program'" class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md text-sm">
            <p class="text-emerald-700 dark:text-emerald-300">
              <strong>Program Sound Group:</strong> One user can broadcast audio to all listeners. This is ideal for distributing program audio to all participants.
            </p>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              @click="closeEditGroupModal"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              :disabled="groupLoading"
            >
              <span v-if="groupLoading" class="mr-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </span>
              {{ groupLoading ? 'Updating...' : 'Update Group' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Group Settings Modal -->
    <div v-if="showGroupSettingsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">Group Settings: {{ selectedGroup?.name }}</h3>
          <button 
            type="button"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            @click="closeGroupSettingsModal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        
        <GroupSettingsForm 
          v-if="selectedGroup"
          :group-id="selectedGroup.id"
          :initial-settings="selectedGroup.settings"
          :initial-ui-settings="selectedGroup.ui_settings"
          @settings-updated="onGroupSettingsUpdated"
          @ui-settings-updated="onGroupUISettingsUpdated"
        />
        
        <div class="flex justify-end space-x-3 pt-6">
          <button 
            type="button" 
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="closeGroupSettingsModal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Group Confirmation Modal -->
    <div v-if="showDeleteGroupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium mb-4">Confirm Delete</h3>
        <p class="mb-4">Are you sure you want to delete the group "{{ groupToDelete?.name }}"? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button 
            type="button" 
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="closeDeleteGroupModal"
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500"
            :disabled="groupLoading"
            @click="deleteGroup"
          >
            <span v-if="groupLoading" class="mr-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
            {{ groupLoading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Group, Production, GroupType, GroupSettings, GroupUISettings } from '~/types';
import { toast } from 'vue-sonner';

const props = defineProps({
  groups: {
    type: Array as PropType<Group[]>,
    required: true
  },
  productions: {
    type: Array as PropType<Production[]>,
    default: () => []
  },
  productionId: {
    type: Number,
    default: null
  },
  showProductionLink: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'add-group', 
  'update-group', 
  'delete-group', 
  'update-group-settings',
  'update-group-ui-settings'
]);

// Group form
const groupForm = reactive({
  id: 0,
  name: '',
  productionId: '',
  type: GroupType.INTERCOM
});

// Modal states
const showAddGroupModal = ref(false);
const showEditGroupModal = ref(false);
const showGroupSettingsModal = ref(false);
const showDeleteGroupModal = ref(false);
const groupToDelete = ref<Group | null>(null);
const selectedGroup = ref<Group | null>(null);
const groupLoading = ref(false);
const newGroupType = ref<GroupType>(GroupType.INTERCOM);

// Format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Open add group modal
const openAddGroupModal = (type: GroupType = GroupType.INTERCOM) => {
  newGroupType.value = type;
  
  // If we have a productionId, set it in the form
  if (props.productionId) {
    groupForm.productionId = props.productionId.toString();
  } else {
    groupForm.productionId = '';
  }
  
  groupForm.name = '';
  showAddGroupModal.value = true;
};

// Close add group modal
const closeAddGroupModal = () => {
  showAddGroupModal.value = false;
};

// Add group
const addGroup = async () => {
  if (!groupForm.name) {
    toast.error('Please enter a group name');
    return;
  }
  
  // Use either the form's productionId or the prop's productionId
  const prodId = props.productionId || parseInt(groupForm.productionId as string);
  
  if (!prodId) {
    toast.error('Please select a production');
    return;
  }
  
  groupLoading.value = true;
  
  try {
    emit('add-group', {
      productionId: prodId,
      name: groupForm.name,
      type: newGroupType.value
    });
    
    // Close modal
    showAddGroupModal.value = false;
  } catch (err: any) {
    toast.error(err.message || 'Failed to add group');
    console.error('Error adding group:', err);
  } finally {
    groupLoading.value = false;
  }
};

// Edit group
const editGroup = (group: Group) => {
  groupForm.id = group.id;
  groupForm.name = group.name;
  groupForm.type = group.type || GroupType.INTERCOM;
  showEditGroupModal.value = true;
};

// Close edit group modal
const closeEditGroupModal = () => {
  showEditGroupModal.value = false;
};

// Update group
const updateGroup = async () => {
  if (!groupForm.id || !groupForm.name) return;
  
  groupLoading.value = true;
  
  try {
    emit('update-group', {
      id: groupForm.id,
      name: groupForm.name,
      type: groupForm.type
    });
    
    // Close modal
    showEditGroupModal.value = false;
  } catch (err: any) {
    toast.error(err.message || 'Failed to update group');
    console.error('Error updating group:', err);
  } finally {
    groupLoading.value = false;
  }
};

// Edit group settings
const editGroupSettings = (group: Group) => {
  selectedGroup.value = group;
  showGroupSettingsModal.value = true;
};

// Close group settings modal
const closeGroupSettingsModal = () => {
  showGroupSettingsModal.value = false;
  selectedGroup.value = null;
};

// Handle group settings updated
const onGroupSettingsUpdated = (settings: GroupSettings) => {
  if (!selectedGroup.value) return;
  
  emit('update-group-settings', {
    id: selectedGroup.value.id,
    settings
  });
};

// Handle group UI settings updated
const onGroupUISettingsUpdated = (uiSettings: GroupUISettings) => {
  if (!selectedGroup.value) return;
  
  emit('update-group-ui-settings', {
    id: selectedGroup.value.id,
    uiSettings
  });
};

// Confirm delete group
const confirmDeleteGroup = (group: Group) => {
  groupToDelete.value = group;
  showDeleteGroupModal.value = true;
};

// Close delete group modal
const closeDeleteGroupModal = () => {
  showDeleteGroupModal.value = false;
  groupToDelete.value = null;
};

// Delete group
const deleteGroup = async () => {
  if (!groupToDelete.value) return;
  
  groupLoading.value = true;
  
  try {
    emit('delete-group', groupToDelete.value.id);
    
    // Close modal
    showDeleteGroupModal.value = false;
    groupToDelete.value = null;
  } catch (err: any) {
    toast.error(err.message || 'Failed to delete group');
    console.error('Error deleting group:', err);
  } finally {
    groupLoading.value = false;
  }
};

// Expose methods to parent component
defineExpose({
  openAddGroupModal,
  closeAddGroupModal,
  editGroup,
  editGroupSettings,
  confirmDeleteGroup
});
</script>