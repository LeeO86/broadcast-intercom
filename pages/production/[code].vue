<template>
  <div>
    <!-- Mobile Audio Start Modal -->
    <ReloadNotificationModal
      :show="showMobileAudioModal"
      type="microphone"
      title="Start Audio"
      message="To use the intercom system on your mobile device, please tap the button below to start audio."
      action-text="Start Audio"
      @request-microphone="startMobileAudio"
    />

    <div v-if="productionLoading" class="flex justify-center items-center h-64">
      <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="productionError" class="max-w-md mx-auto">
      <div class="bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg shadow-md">
        <h2 class="text-lg font-medium text-danger-800 dark:text-danger-200">Error</h2>
        <p class="mt-2 text-danger-700 dark:text-danger-300">{{ productionError }}</p>
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
          <!-- Show error state if there's an error for this group -->
          <GroupErrorState
            v-if="getGroupError(group.id)"
            :title="getErrorTitle(getGroupError(group.id)!)"
            :message="getErrorMessage(getGroupError(group.id)!)"
            @retry="retryGroupConnection(group.id)"
          />
          
          <!-- Intercom Group -->
          <PTTButton
            v-else-if="group.type === 'intercom'"
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
      
      <!-- User List -->
      <div v-if="showUserList" class="fixed top-20 right-4 z-10">
        <UserList :users="groupMembers" @toggle="showUserList = false" />
      </div>
      
      <!-- Reload Notification Modal -->
      <ReloadNotificationModal 
        :show="showReloadModal || hasGlobalError" 
        :type="globalError ? 'error' : 'reload'"
        :title="globalError ? getErrorTitle(globalError) : 'Updates Available'"
        :message="globalError ? getErrorMessage(globalError) : 'Changes have been made to the production. Please reload to see the latest updates.'"
        :action-text="globalError ? 'Retry Connection' : 'Reload Now'"
        @action="globalError ? retryGlobalConnection() : handleReload"
      />
      
      <!-- Microphone Permission Modal -->
      <ReloadNotificationModal
        :show="showMicrophoneModal"
        type="microphone"
        title="Microphone Access Required"
        message="This app requires access to your microphone for the intercom functionality. Please click the button below to allow access."
        action-text="Allow Access"
        @request-microphone="requestMicrophoneAccess"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { GroupMember, GroupType, SocketEvents } from '~/types';
import { useJanusErrors } from '~/composables/useJanusErrors';
import { JanusErrorType } from '~/types';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const productionCode = computed(() => route.params.code as string);

const { production, loading: productionLoading, error: productionError, getProductionByCode } = useProduction();
const { 
  stream, 
  loadPreferredDevices, 
  permissionDenied: audioPermissionDenied,
  requestMicrophonePermission,
  setGroupVolume
} = useAudio();
const { 
  joinAudioRoom, 
  configureAudioRoom, 
  startTalking: startJanusTalking, 
  stopTalking: stopJanusTalking, 
  toggleSpeakerMute,
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
  onUsersList,
  onPublisherChanged,
  onProductionUpdated,
  onGroupUpdated,
  disconnect
} = useSocket();

const showMobileAudioModal = ref(false);

const userSettings = useUserSettings();
const userStore = useUserStore();
const groupMembers = ref<GroupMember[]>([]);
const talkingUsers = ref<Map<number, GroupMember>>(new Map());
const showUserList = ref(false);
const groupVolumes = ref<Map<number, number>>(new Map());
const mutedGroups = ref<Set<number>>(new Set());
const showReloadModal = ref(false);
const showMicrophoneModal = ref(false);

// Program sound publishers
const publishers = ref<Map<number, string>>(new Map());
const isPublisherMap = ref<Map<number, boolean>>(new Map());

// Initialize error handling
const { 
  getGroupError,
  setGroupError,
  clearGroupError,
  globalError,
  hasGlobalError,
  setGlobalError,
  clearGlobalError,
  getErrorMessage,
  getErrorTitle
} = useJanusErrors();

const isMobileBrowser = () => {
  if (!process.client) return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const startMobileAudio = async () => {
  try {   
    const stream = navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    await init();
    showMobileAudioModal.value = false;

  } catch (error) {
    console.error('Error starting audio on mobile:', error);
    toast.error(`Failed to start audio. Please check your permissions. ${error}`);
    
    if (audioPermissionDenied.value) {
      showMicrophoneModal.value = true;
    }
  }
};

// Initialize
const init = async () => {
  console.log('Initializing production');
  try {
    // Get production by code
    const prod = await getProductionByCode(productionCode.value);
    if (!prod) return;
    
    // Load audio device
    await loadPreferredDevices();
    
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

    // Listen for users list
    const usersListUnsub = onUsersList((users) => {
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

    onUnmounted(() => {
      usersListUnsub();
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
          audioConstraints,
          group.settings.muted_by_default
        );
        
        // Initialize group volume from user settings
        const savedVolume = userSettings.getGroupVolume(group.id);
        groupVolumes.value.set(group.id, savedVolume);
      } catch (err) {
        console.error(`Error joining audio room for group ${group.id}:`, err);
        setGroupError(group.id, {
          type: JanusErrorType.ROOM,
          message: 'Failed to join audio room',
          groupId: group.id
        });
      }
    }
    
    // Set up socket event listeners
    setupSocketListeners();
    
    toast.success(`Joined production: ${prod.name}`);
  } catch (err: any) {
    productionError.value = err.message || 'Failed to join production';
    console.error('Error initializing production:', err);
    setGlobalError({
      type: JanusErrorType.CONNECTION,
      message: 'Failed to initialize production'
    });
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
  
  // Listen for publisher changes
  const publisherChangedUnsub = onPublisherChanged((data) => {
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
  const productionUpdatedUnsub = onProductionUpdated(() => {
    console.log('Production updated');
    showReloadModal.value = true;
  });
  
  // Listen for group updates
  const groupUpdatedUnsub = onGroupUpdated(() => {
    console.log('Group updated');
    showReloadModal.value = true;
  });
  
  // Listen for Janus errors
  socket.value?.on(SocketEvents.JANUS_ERROR, (error) => {
    if (error.groupId) {
      setGroupError(error.groupId, {
        type: error.type || JanusErrorType.UNKNOWN,
        message: error.message,
        groupId: error.groupId,
        code: error.code
      });
    } else {
      setGlobalError({
        type: error.type || JanusErrorType.UNKNOWN,
        message: error.message,
        code: error.code
      });
    }
  });
  
  // Clean up listeners on component unmount
  onUnmounted(() => {
    userJoinedUnsub();
    userLeftUnsub();
    talkingStartUnsub();
    talkingStopUnsub();
    publisherChangedUnsub(); 
    productionUpdatedUnsub();
    groupUpdatedUnsub();
    socket.value?.off(SocketEvents.JANUS_ERROR);
  });
};

// Retry connection for a specific group
const retryGroupConnection = async (groupId: number) => {
  try {
    clearGroupError(groupId);
    
    // Get group info
    const group = production.value?.groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Rejoin the group
    await joinGroupSocket(groupId);
    
    // Configure audio
    await configureAudioRoom(
      groupId,
      stream.value || undefined,
      {
        echoCancellation: userSettings.settings.value.audioSettings?.echoCancellation ?? true,
        noiseSuppression: userSettings.settings.value.audioSettings?.noiseSuppression ?? true,
        autoGainControl: userSettings.settings.value.audioSettings?.autoGainControl ?? true
      },
      group.settings.muted_by_default
    );
    
    toast.success('Reconnected successfully');
  } catch (error) {
    console.error(`Error retrying connection for group ${groupId}:`, error);
    setGroupError(groupId, {
      type: JanusErrorType.CONNECTION,
      message: 'Failed to reconnect to the audio server',
      groupId
    });
    toast.error('Failed to reconnect');
  }
};

// Retry global connection
const retryGlobalConnection = async () => {
  try {
    clearGlobalError();
    await init();
    toast.success('Reconnected successfully');
  } catch (error) {
    console.error('Error retrying global connection:', error);
    setGlobalError({
      type: JanusErrorType.CONNECTION,
      message: 'Failed to reconnect to the server'
    });
    toast.error('Failed to reconnect');
  }
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
  } catch (error) {
    console.error(`Failed to start talking in group ${groupId}:`, error);
    setGroupError(groupId, {
      type: JanusErrorType.MEDIA,
      message: 'Failed to start audio transmission',
      groupId
    });
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
  } catch (error) {
    console.error(`Failed to stop talking in group ${groupId}:`, error);
    setGroupError(groupId, {
      type: JanusErrorType.MEDIA,
      message: 'Failed to stop audio transmission',
      groupId
    });
  }
};

// Handle volume change
const handleVolumeChange = async ({ groupId, volume }: { groupId: number, volume: number }) => {
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
const handleMuteToggle = async ({ groupId, muted }: { groupId: number, muted: boolean }) => {
  if (muted) {
    mutedGroups.value.add(groupId);
    
    // Mute any audio elements for this group
    const audioElements = document.querySelectorAll(`audio[data-group-id="${groupId}"]`);
    audioElements.forEach((el: HTMLAudioElement) => {
      el.muted = true;
    });
    
    // Suspend audio in Janus
    await toggleSpeakerMute(groupId, true);
    
    toast.info(`Muted ${production.value?.groups.find(g => g.id === groupId)?.name || 'group'}`);
  } else {
    mutedGroups.value.delete(groupId);
    
    // Unmute any audio elements for this group
    const audioElements = document.querySelectorAll(`audio[data-group-id="${groupId}"]`);
    audioElements.forEach((el: HTMLAudioElement) => {
      el.muted = false;
    });
    
    // Resume audio in Janus
    await toggleSpeakerMute(groupId, false);
    
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
  } catch (error) {
    console.error(`Failed to become publisher for group ${groupId}:`, error);
    setGroupError(groupId, {
      type: JanusErrorType.MEDIA,
      message: 'Failed to start broadcasting',
      groupId
    });
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
  } catch (error) {
    console.error(`Failed to stop broadcasting for group ${groupId}:`, error);
    setGroupError(groupId, {
      type: JanusErrorType.MEDIA,
      message: 'Failed to stop broadcasting',
      groupId
    });
  }
};

// Handle reload button click
const handleReload = () => {
  showReloadModal.value = false;
  window.location.reload();
};

// Request microphone access
const requestMicrophoneAccess = async () => {
  try {
    const hasPermission = await requestMicrophonePermission();
    if (hasPermission) {
      showMicrophoneModal.value = false;
      await loadPreferredDevices();
      toast.success('Microphone access granted');
    } else {
      toast.error('Microphone access required');
    }
  } catch (error) {
    console.error('Error requesting microphone access:', error);
    toast.error('Error requesting microphone access');
  }
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
        } catch (error) {
          console.error(`Error leaving audio room for group ${group.id}:`, error);
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
  } catch (error) {
    console.error('Error leaving production:', error);
    // Still navigate back to home even if there's an error
    router.push('/');
  }
};

// Initialize on mount
onMounted(async () => {
  // Check if mobile browser and show audio modal
  if (isMobileBrowser()) {
    showMobileAudioModal.value = true;
  } else {
    await init();
  }
  
  // Show microphone modal if permission is denied
  if (audioPermissionDenied.value) {
    showMicrophoneModal.value = true;
  }
});

// Clean up on unmount
onUnmounted(async () => {
  try {
    if (production.value) {
      // Leave each group
      for (const group of production.value.groups) {
        leaveGroupSocket(group.id);
        try {
          await leaveAudioRoom(group.id);
        } catch (error) {
          console.error(`Error leaving audio room for group ${group.id}:`, error);
        }
      }
      
      // Leave production
      leaveProductionSocket(production.value.id);
    }
    
    // Clean up
    await cleanup();
    disconnect();
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
});

// Watch for microphone permission changes
watch(audioPermissionDenied, (denied) => {
  if (denied) {
    showMicrophoneModal.value = true;
  } else {
    showMicrophoneModal.value = false;
  }
});
</script>