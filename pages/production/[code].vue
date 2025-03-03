<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="error" class="max-w-md mx-auto">
      <div class="bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg shadow-md">
        <h2 class="text-lg font-medium text-danger-800 dark:text-danger-200">Error</h2>
        <p class="mt-2 text-danger-700 dark:text-danger-300">{{ error }}</p>
        <div class="mt-4">
          <NuxtLink 
            to="/" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-danger-600 hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger-500"
          >
            Back to Home
          </NuxtLink>
        </div>
      </div>
    </div>
    
    <div v-else>
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">{{ production?.name }}</h1>
        
        <div class="flex items-center space-x-4">
          <button
            type="button"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="showUserList = !showUserList"
          >
            <span class="mr-1">Users</span>
            <span class="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-1.5 py-0.5 rounded-full text-xs">
              {{ groupMembers.length }}
            </span>
          </button>
          
          <button
            type="button"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            @click="leaveProduction"
          >
            Leave
          </button>
        </div>
      </div>
      
      <div v-if="audioPermissionDenied" class="mb-4 p-3 bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded-md text-sm">
        <p class="font-medium">Microphone access denied</p>
        <p class="mt-1">You won't be able to talk, but you can still listen to others.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="group in production?.groups" :key="group.id" class="h-40">
          <!-- Intercom Group -->
          <PTTButton
            v-if="group.type === 'intercom'"
            :group-id="group.id"
            :name="group.name"
            :other-talking="isSomeoneElseTalking(group.id)"
            :other-talking-name="getTalkingUser(group.id)?.display_name || ''"
            :ui-settings="group.ui_settings"
            @talking-start="handleTalkingStart"
            @talking-stop="handleTalkingStop"
            @volume-change="handleVolumeChange"
            @mute-toggle="handleMuteToggle"
          />
          
          <!-- Program Sound Group -->
          <ProgramSoundGroup
            v-else
            :group-id="group.id"
            :name="group.name"
            :current-publisher="getPublisherName(group.id)"
            :is-publisher="isPublisher(group.id)"
            :ui-settings="group.ui_settings"
            @volume-change="handleVolumeChange"
            @mute-toggle="handleMuteToggle"
            @become-publisher="handleBecomePublisher"
            @stop-broadcasting="handleStopBroadcasting"
          />
        </div>
      </div>
      
      <div v-if="showUserList" class="fixed top-20 right-4 z-10">
        <UserList :users="groupMembers" @toggle="showUserList = false" />
      </div>
      
      <!-- Reload Notification Modal -->
      <ReloadNotificationModal :show="showReloadModal" @reload="handleReload" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { GroupMember, GroupType, SocketEvents } from '~/types';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const productionCode = computed(() => route.params.code as string);

const { production, loading, error, getProductionByCode } = useProduction();
const { stream, loadPreferredDevice, permissionDenied: audioPermissionDenied } = useAudio();
const { 
  joinAudioRoom, 
  configureAudioRoom, 
  startTalking: startJanusTalking, 
  stopTalking: stopJanusTalking, 
  leaveAudioRoom, 
  cleanup 
} = useJanus();
const { 
  initSocket, 
  connected: socketConnected,
  socket,
  joinProduction: joinProductionSocket, 
  leaveProduction: leaveProductionSocket,
  joinGroup: joinGroupSocket,
  leaveGroup: leaveGroupSocket,
  startTalking: startTalkingSocket,
  stopTalking: stopTalkingSocket,
  onUserJoined,
  onUserLeft,
  onTalkingStart,
  onTalkingStop,
  disconnect
} = useSocket();

const userSettings = useUserSettings();
const userStore = useUserStore();
const groupMembers = ref<GroupMember[]>([]);
const talkingUsers = ref<Map<number, GroupMember>>(new Map());
const showUserList = ref(false);
const groupVolumes = ref<Map<number, number>>(new Map());
const mutedGroups = ref<Set<number>>(new Set());
const showReloadModal = ref(false);

// Program sound publishers
const publishers = ref<Map<number, string>>(new Map());
const isPublisherMap = ref<Map<number, boolean>>(new Map());

// Initialize
const init = async () => {
  try {
    // Get production by code
    const prod = await getProductionByCode(productionCode.value);
    if (!prod) return;
    
    // Load audio device
    await loadPreferredDevice();
    
    // Make sure user is initialized
    if (!userStore.isInitialized) {
      userStore.initialize();
    }
    
    // Initialize socket
    initSocket();
    
    // Add self to group members
    groupMembers.value.push({
      id: userStore.id,
      display_name: userStore.displayName || userSettings.settings.value.displayName || 'Anonymous',
      is_talking: false,
      last_active: new Date().toISOString(),
    });
    
    // Join production via socket
    joinProductionSocket(
      prod.id, 
      userStore.id, 
      userStore.displayName || userSettings.settings.value.displayName || 'Anonymous'
    );
    
    // Join each group
    for (const group of prod.groups) {
      // Join group via socket
      joinGroupSocket(group.id);
      
      try {
        // Join Janus audiobridge room with settings from the group
        await joinAudioRoom(
          group.id, 
          userStore.displayName || userSettings.settings.value.displayName || 'Anonymous',
          group.settings.muted_by_default // Use the group's muted_by_default setting
        );
        
        // Get audio settings from user preferences
        const audioConstraints = {
          echoCancellation: userSettings.settings.value.audioSettings?.echoCancellation ?? true,
          noiseSuppression: userSettings.settings.value.audioSettings?.noiseSuppression ?? true,
          autoGainControl: userSettings.settings.value.audioSettings?.autoGainControl ?? true
        };
        
        // Configure WebRTC with the user's audio settings
        await configureAudioRoom(
          group.id, 
          stream.value || undefined, 
          audioConstraints
        );
        
        // Initialize group volume from user settings
        const savedVolume = userSettings.getGroupVolume(group.id);
        groupVolumes.value.set(group.id, savedVolume);
      } catch (err) {
        console.error(`Error joining audio room for group ${group.id}:`, err);
        // Continue with other groups even if one fails
      }
    }
    
    // Set up socket event listeners
    setupSocketListeners();
    
    toast.success(`Joined production: ${prod.name}`);
  } catch (err: any) {
    error.value = err.message || 'Failed to join production';
    console.error('Error initializing production:', err);
  }
};

// Set up socket event listeners
const setupSocketListeners = () => {
  // User joined
  const userJoinedUnsub = onUserJoined((data) => {
    // Add user to group members if not already present
    const existingIndex = groupMembers.value.findIndex(m => m.id === data.userId);
    
    if (existingIndex === -1) {
      groupMembers.value.push({
        id: data.userId,
        display_name: data.displayName,
        is_talking: false,
        last_active: new Date().toISOString(),
      });
    }
  });
  
  // User left
  const userLeftUnsub = onUserLeft((data) => {
    // Remove user from group members
    groupMembers.value = groupMembers.value.filter(m => m.id !== data.userId);
    
    // Remove from talking users
    for (const [groupId, user] of talkingUsers.value.entries()) {
      if (user.id === data.userId) {
        talkingUsers.value.delete(groupId);
      }
    }
  });
  
  // Talking start
  const talkingStartUnsub = onTalkingStart((data) => {
    // Update user's talking status
    const userIndex = groupMembers.value.findIndex(m => m.id === data.userId);
    
    if (userIndex !== -1) {
      groupMembers.value[userIndex].is_talking = true;
      
      // Add to talking users map
      talkingUsers.value.set(data.groupId, groupMembers.value[userIndex]);
    }
  });
  
  // Talking stop
  const talkingStopUnsub = onTalkingStop((data) => {
    // Update user's talking status
    const userIndex = groupMembers.value.findIndex(m => m.id === data.userId);
    
    if (userIndex !== -1) {
      groupMembers.value[userIndex].is_talking = false;
    }
    
    // Remove from talking users map
    talkingUsers.value.delete(data.groupId);
  });
  
  // Listen for users list
  socket.value?.on(SocketEvents.USERS_LIST, (users) => {
    // Replace the group members with the received list
    // but keep the current user
    const currentUser = groupMembers.value.find(m => m.id === userStore.id);
    
    if (currentUser) {
      // Filter out the current user from the received list to avoid duplicates
      const otherUsers = users.filter((u: any) => u.id !== userStore.id);
      
      // Create a new array with the current user and other users
      groupMembers.value = [
        currentUser,
        ...otherUsers.map((u: any) => ({
          id: u.id,
          display_name: u.displayName,
          is_talking: false,
          last_active: new Date().toISOString(),
        }))
      ];
    }
  });
  
  // Listen for publisher changes
  socket.value?.on(SocketEvents.PUBLISHER_CHANGED, (data) => {
    if (data.userId) {
      // Someone became the publisher
      publishers.value.set(data.groupId, data.displayName);
      
      // Check if it's us
      isPublisherMap.value.set(data.groupId, data.userId === userStore.id);
      
      // If we were replaced as publisher, show a notification
      if (data.replaced && data.userId !== userStore.id && isPublisherMap.value.get(data.groupId)) {
        toast.info('Someone else is now broadcasting');
        isPublisherMap.value.set(data.groupId, false);
      }
    } else {
      // No publisher
      publishers.value.delete(data.groupId);
      isPublisherMap.value.set(data.groupId, false);
    }
  });
  
  // Listen for production updates
  socket.value?.on(SocketEvents.PRODUCTION_UPDATED, () => {
    showReloadModal.value = true;
  });
  
  // Listen for group updates
  socket.value?.on(SocketEvents.GROUP_UPDATED, () => {
    showReloadModal.value = true;
  });
  
  // Clean up listeners on component unmount
  onUnmounted(() => {
    userJoinedUnsub();
    userLeftUnsub();
    talkingStartUnsub();
    talkingStopUnsub();
    socket.value?.off(SocketEvents.USERS_LIST);
    socket.value?.off(SocketEvents.PUBLISHER_CHANGED);
    socket.value?.off(SocketEvents.PRODUCTION_UPDATED);
    socket.value?.off(SocketEvents.GROUP_UPDATED);
  });
};

// Handle talking start
const handleTalkingStart = async (groupId: number) => {
  try {
    // Don't allow talking if microphone permission is denied
    if (audioPermissionDenied.value) {
      toast.error('Microphone access is required to talk');
      return;
    }
    
    // Don't allow talking if group is muted
    if (mutedGroups.value.has(groupId)) {
      toast.error('Unmute the group to talk');
      return;
    }
    
    // Start talking in Janus
    await startJanusTalking(groupId);
    
    // Notify others via socket
    startTalkingSocket(groupId);
  } catch (err) {
    console.error(`Failed to start talking in group ${groupId}:`, err);
    toast.error('Failed to start talking');
  }
};

// Handle talking stop
const handleTalkingStop = async (groupId: number) => {
  try {
    // Stop talking in Janus
    await stopJanusTalking(groupId);
    
    // Notify others via socket
    stopTalkingSocket(groupId);
  } catch (err) {
    console.error(`Failed to stop talking in group ${groupId}:`, err);
  }
};

// Handle volume change
const handleVolumeChange = ({ groupId, volume }: { groupId: number, volume: number }) => {
  // Save volume to user settings
  userSettings.setGroupVolume(groupId, volume);
  
  // Update local volume state
  groupVolumes.value.set(groupId, volume);
  
  // TODO: Apply volume to audio element if we have one for this group
  const audioElements = document.querySelectorAll(`audio[data-group-id="${groupId}"]`);
  audioElements.forEach((el: HTMLAudioElement) => {
    el.volume = volume / 100;
  });
};

// Handle mute toggle
const handleMuteToggle = ({ groupId, muted }: { groupId: number, muted: boolean }) => {
  if (muted) {
    mutedGroups.value.add(groupId);
    
    // Mute any audio elements for this group
    const audioElements = document.querySelectorAll(`audio[data-group-id="${groupId}"]`);
    audioElements.forEach((el: HTMLAudioElement) => {
      el.muted = true;
    });
    
    toast.info(`Muted ${production.value?.groups.find(g => g.id === groupId)?.name || 'group'}`);
  } else {
    mutedGroups.value.delete(groupId);
    
    // Unmute any audio elements for this group
    const audioElements = document.querySelectorAll(`audio[data-group-id="${groupId}"]`);
    audioElements.forEach((el: HTMLAudioElement) => {
      el.muted = false;
    });
    
    toast.info(`Unmuted ${production.value?.groups.find(g => g.id === groupId)?.name || 'group'}`);
  }
};

// Check if someone else is talking in a group
const isSomeoneElseTalking = (groupId: number): boolean => {
  const talkingUser = talkingUsers.value.get(groupId);
  return !!talkingUser && talkingUser.id !== userStore.id;
};

// Get the user who is talking in a group
const getTalkingUser = (groupId: number): GroupMember | undefined => {
  return talkingUsers.value.get(groupId);
};

// Get the publisher name for a program sound group
const getPublisherName = (groupId: number): string => {
  return publishers.value.get(groupId) || '';
};

// Check if current user is the publisher for a group
const isPublisher = (groupId: number): boolean => {
  return isPublisherMap.value.get(groupId) || false;
};

// Handle becoming publisher for program sound
const handleBecomePublisher = async (groupId: number) => {
  try {
    // Don't allow becoming publisher if microphone permission is denied
    if (audioPermissionDenied.value) {
      toast.error('Microphone access is required to broadcast');
      return;
    }
    
    // Don't allow becoming publisher if group is muted
    if (mutedGroups.value.has(groupId)) {
      toast.error('Unmute the group to broadcast');
      return;
    }
    
    // Start talking in Janus
    await startJanusTalking(groupId);
    
    // Notify others via socket that we're the publisher
    socket.value?.emit(SocketEvents.PUBLISHER_CHANGED, { groupId });
    
    toast.success('You are now broadcasting');
  } catch (err) {
    console.error(`Failed to become publisher for group ${groupId}:`, err);
    toast.error('Failed to start broadcasting');
  }
};

// Handle stop broadcasting for program sound
const handleStopBroadcasting = async (groupId: number) => {
  try {
    // Stop talking in Janus
    await stopJanusTalking(groupId);
    
    // Notify others via socket that there's no publisher
    socket.value?.emit(SocketEvents.PUBLISHER_CHANGED, { 
      groupId,
      userId: null,
      displayName: null,
      socketId: null
    });
    
    // Update local state
    isPublisherMap.value.set(groupId, false);
    publishers.value.delete(groupId);
    
    toast.info('Broadcasting stopped');
  } catch (err) {
    console.error(`Failed to stop broadcasting for group ${groupId}:`, err);
  }
};

// Handle reload button click
const handleReload = () => {
  // The actual reload is handled by the ReloadNotificationModal component
  showReloadModal.value = false;
};

// Leave production
const leaveProduction = async () => {
  try {
    if (production.value) {
      // Leave each group
      for (const group of production.value.groups) {
        // Leave group via socket
        leaveGroupSocket(group.id);
        
        try {
          // Leave Janus audiobridge room
          await leaveAudioRoom(group.id);
        } catch (err) {
          console.error(`Error leaving audio room for group ${group.id}:`, err);
          // Continue with other groups even if one fails
        }
      }
      
      // Leave production via socket
      leaveProductionSocket(production.value.id);
    }
    
    // Clean up
    await cleanup();
    disconnect();
    
    // Navigate back to home
    router.push('/');
  } catch (err) {
    console.error('Error leaving production:', err);
    // Still navigate back to home even if there's an error
    router.push('/');
  }
};

// Initialize on mount
onMounted(init);

// Clean up on unmount
onUnmounted(async () => {
  try {
    if (production.value) {
      // Leave each group
      for (const group of production.value.groups) {
        leaveGroupSocket(group.id);
        try {
          await leaveAudioRoom(group.id);
        } catch (err) {
          console.error(`Error leaving audio room for group ${group.id}:`, err);
        }
      }
      
      // Leave production
      leaveProductionSocket(production.value.id);
    }
    
    // Clean up
    await cleanup();
    disconnect();
  } catch (err) {
    console.error('Error cleaning up:', err);
  }
});
</script>