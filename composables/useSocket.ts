import { io, Socket } from 'socket.io-client';
import { SocketEvents, JanusSocketEvents } from '~/types';

let socket: Socket | null = null;

export const useSocket = () => {
  const config = useRuntimeConfig();
  const { requestMicrophonePermission } = useAudio();
  const connected = ref(false);
  const error = ref<string | null>(null);
  const userStore = useUserStore();

  // Initialize socket connection
  const initSocket = () => {
    if (socket) return socket;

const url = useRequestURL();
    const socketUrl = config.public.socketUrl || `${url.protocol}//${url.host}`;
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'] // Try WebSocket first, fall back to polling
    });

    socket.on('connect', async () => {
      connected.value = true;
      error.value = null;
      console.log('Socket connected using transport:', socket?.io.engine.transport.name);
      
      // Listen for transport upgrade
      socket?.io.engine.on('upgrade', () => {
        console.log('Socket transport upgraded to:', socket?.io.engine.transport.name);
      });

      // Request microphone permission
      await requestMicrophonePermission();
    });

    socket.on('disconnect', () => {
      connected.value = false;
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      connected.value = false;
      error.value = err.message;
      console.error('Socket connection error:', err);
    });

    // Listen for user ID assignment
    socket.on(SocketEvents.USER_ID, ({ userId }) => {
      // Only set the ID if we don't have one yet
      if (!userStore.id) {
        userStore.id = userId;
      }
    });

    return socket;
  };

  // Join a production
  const joinProduction = (productionId: number, userId: string, displayName: string) => {
    if (!socket) initSocket();
    socket?.emit(SocketEvents.JOIN_PRODUCTION, { productionId, userId, displayName });
  };

  // Leave a production
  const leaveProduction = (productionId: number) => {
    socket?.emit(SocketEvents.LEAVE_PRODUCTION, { productionId });
  };

  // Join a group
  const joinGroup = (groupId: number) => {
    socket?.emit(SocketEvents.JOIN_GROUP, { groupId });
  };

  // Leave a group
  const leaveGroup = (groupId: number) => {
    socket?.emit(SocketEvents.LEAVE_GROUP, { groupId });
  };

  // Start talking in a group
  const startTalking = (groupId: number) => {
    socket?.emit(SocketEvents.TALKING_START, { groupId });
  };

  // Stop talking in a group
  const stopTalking = (groupId: number) => {
    socket?.emit(SocketEvents.TALKING_STOP, { groupId });
  };

  // Listen for events
  const onUserJoined = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.USER_JOINED, callback);
    return () => socket?.off(SocketEvents.USER_JOINED, callback);
  };

  const onUserLeft = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.USER_LEFT, callback);
    return () => socket?.off(SocketEvents.USER_LEFT, callback);
  };

  const onTalkingStart = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.TALKING_START, callback);
    return () => socket?.off(SocketEvents.TALKING_START, callback);
  };

  const onTalkingStop = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.TALKING_STOP, callback);
    return () => socket?.off(SocketEvents.TALKING_STOP, callback);
  };

  const onError = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.ERROR, callback);
    return () => socket?.off(SocketEvents.ERROR, callback);
  };

  // Listen for users list
  const onUsersList = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.USERS_LIST, callback);
    return () => socket?.off(SocketEvents.USERS_LIST, callback);
  };

  // Listen for publisher changes
  const onPublisherChanged = (callback: (data: any) => void) => {
    socket?.on(SocketEvents.PUBLISHER_CHANGED, callback);
    return () => socket?.off(SocketEvents.PUBLISHER_CHANGED, callback);
  };

  // Listen for production updates
  const onProductionUpdated = (callback: () => void) => {
    socket?.on(SocketEvents.PRODUCTION_UPDATED, callback);
    return () => socket?.off(SocketEvents.PRODUCTION_UPDATED, callback);
  };

  // Listen for group updates
  const onGroupUpdated = (callback: () => void) => {
    socket?.on(SocketEvents.GROUP_UPDATED, callback);
    return () => socket?.off(SocketEvents.GROUP_UPDATED, callback);
  };

  // Janus WebSocket methods
  const createJanusHandle = (plugin: string, id?: string): Promise<string> => {
    if (!socket) initSocket();

    return new Promise((resolve, reject) => {
      socket?.once(JanusSocketEvents.HANDLE_CREATED, (response) => {
        if (response.success) {
          resolve(response.handleId);
        } else {
          reject(new Error(response.error || 'Failed to create Janus handle'));
        }
      });

      socket?.once(JanusSocketEvents.ERROR, (response) => {
        reject(new Error(response.error || 'Failed to create Janus handle'));
      });

      socket?.emit(JanusSocketEvents.CREATE_HANDLE, { plugin, id });
    });
  };

  const sendJanusMessage = (handleId: string, message: any): Promise<any> => {
    if (!socket) initSocket();

    return new Promise((resolve, reject) => {
      socket?.once(JanusSocketEvents.MESSAGE_RESPONSE, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Failed to send Janus message'));
        }
      });

      socket?.once(JanusSocketEvents.ERROR, (response) => {
        reject(new Error(response.error || 'Failed to send Janus message'));
      });

      socket?.emit(JanusSocketEvents.SEND_MESSAGE, { handleId, message });
    });
  };

  const sendJanusTrickle = (handleId: string, candidate: RTCIceCandidate | null): Promise<void> => {
    if (!socket) initSocket();

    return new Promise((resolve, reject) => {
      socket?.once(JanusSocketEvents.TRICKLE_RESPONSE, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to send trickle ICE candidate'));
        }
      });

      socket?.once(JanusSocketEvents.ERROR, (response) => {
        reject(new Error(response.error || 'Failed to send trickle ICE candidate'));
      });

      socket?.emit(JanusSocketEvents.SEND_TRICKLE, { handleId, candidate });
    });
  };

  const toggleMute = (groupId: number, muted: boolean) => {
    socket?.emit('mute_toggle', { groupId, muted });
  };

  // Neue Funktion zum Überwachen des Transporttyps
  const watchTransport = (callback: (transport: string) => void) => {
    if (!socket) initSocket();

    // Check initial transport
    if (socket?.io?.engine?.transport?.name) {
      callback(socket.io.engine.transport.name);
    }

    // Listen for transport changes
    socket?.io?.engine?.on('upgrade', () => {
      if (socket?.io?.engine?.transport?.name) {
        callback(socket.io.engine.transport.name);
      }
    });

    return () => {
      socket?.io?.engine?.off('upgrade');
    };
  };

  // Cleanup
  const disconnect = () => {
    socket?.disconnect();
    socket = null;
    connected.value = false;
  };

  return {
    socket: computed(() => socket),
    connected,
    error,
    initSocket,
    joinProduction,
    leaveProduction,
    joinGroup,
    leaveGroup,
    startTalking,
    stopTalking,
    onUserJoined,
    onUserLeft,
    onTalkingStart,
    onTalkingStop,
    onError,
    disconnect,
    createJanusHandle,
    sendJanusMessage,
    sendJanusTrickle,
    onUsersList,
    onPublisherChanged,
    onProductionUpdated,
    onGroupUpdated,
    toggleMute,
    watchTransport
  };
};