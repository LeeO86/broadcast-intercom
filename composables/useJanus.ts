import { JanodeHandle, PeerConnection, GroupSettings, JanusSocketEvents } from '~/types';

export const useJanus = () => {
  const handles = ref<JanodeHandle[]>([]);
  const peerConnections = ref<PeerConnection[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const socket = useSocket().socket;

  // Create a new Janus handle
  const createHandle = async (plugin: string, id?: string): Promise<string> => {
    loading.value = true;
    error.value = null;

    try {
      // Check if we have a socket connection
      if (!socket.value) {
        throw new Error('Socket connection not available');
      }

      return new Promise((resolve, reject) => {
        // Set up one-time listener for the response
        socket.value?.once(JanusSocketEvents.HANDLE_CREATED, (response) => {
          if (response.success) {
            const handleId = response.handleId;
            
            // Store handle
            handles.value.push({
              handleId,
              plugin,
            });
            
            resolve(handleId);
          } else {
            reject(new Error(response.error || 'Failed to create Janus handle'));
          }
        });
        
        // Set up one-time error listener
        socket.value?.once(JanusSocketEvents.ERROR, (response) => {
          reject(new Error(response.error || 'Failed to create Janus handle'));
        });
        
        // Send the request
        socket.value?.emit(JanusSocketEvents.CREATE_HANDLE, { plugin, id });
      });
    } catch (err: any) {
      error.value = err.message || 'Failed to create Janus handle';
      console.error('Error creating Janus handle:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Send a message to a Janus handle
  const sendMessage = async (handleId: string, message: any) => {
    loading.value = true;
    error.value = null;

    try {
      // Check if we have a socket connection
      if (!socket.value) {
        throw new Error('Socket connection not available');
      }

      return new Promise((resolve, reject) => {
        // Set up one-time listener for the response
        socket.value?.once(JanusSocketEvents.MESSAGE_RESPONSE, (response) => {
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Failed to send Janus message'));
          }
        });
        
        // Set up one-time error listener
        socket.value?.once(JanusSocketEvents.ERROR, (response) => {
          reject(new Error(response.error || 'Failed to send Janus message'));
        });
        
        // Send the request
        socket.value?.emit(JanusSocketEvents.SEND_MESSAGE, { handleId, message });
      });
    } catch (err: any) {
      error.value = err.message || 'Failed to send Janus message';
      console.error('Error sending Janus message:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Send trickle ICE candidates to a Janus handle
  const sendTrickle = async (handleId: string, candidate: RTCIceCandidate | null) => {
    try {
      // Check if we have a socket connection
      if (!socket.value) {
        throw new Error('Socket connection not available');
      }

      return new Promise<void>((resolve, reject) => {
        // Set up one-time listener for the response
        socket.value?.once(JanusSocketEvents.TRICKLE_RESPONSE, (response) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error || 'Failed to send trickle ICE candidate'));
          }
        });
        
        // Set up one-time error listener
        socket.value?.once(JanusSocketEvents.ERROR, (response) => {
          reject(new Error(response.error || 'Failed to send trickle ICE candidate'));
        });
        
        // Send the request
        socket.value?.emit(JanusSocketEvents.SEND_TRICKLE, { handleId, candidate });
      });
    } catch (err) {
      console.error('Failed to send trickle ICE candidate:', err);
    }
  };

  // Create a new PeerConnection for a group
  const createPeerConnection = async (groupId: number, plugin: string = 'janus.plugin.audiobridge'): Promise<PeerConnection> => {
    try {
      // Create RTCPeerConnection with ICE servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Create Janus handle for this group
      const handleId = await createHandle(plugin, `group-${groupId}`);

      // Store group ID with handle
      const handleIndex = handles.value.findIndex(h => h.handleId === handleId);
      if (handleIndex >= 0) {
        handles.value[handleIndex].groupId = groupId;
      }

      // Create PeerConnection object
      const peerConnection: PeerConnection = {
        pc,
        groupId,
        handleId,
      };

      // Add to list of peer connections
      peerConnections.value.push(peerConnection);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        sendTrickle(handleId, event.candidate);
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for group ${groupId}:`, pc.iceConnectionState);
      };

      // Handle track events
      pc.ontrack = (event) => {
        console.log(`Received track for group ${groupId}:`, event.track.kind);
        
        // Store the stream with the peer connection
        peerConnection.stream = event.streams[0];
      };

      return peerConnection;
    } catch (err) {
      console.error(`Failed to create peer connection for group ${groupId}:`, err);
      throw err;
    }
  };

  // Join an audiobridge room
  const joinAudioRoom = async (groupId: number, displayName: string, muted: boolean = true) => {
    try {
      // Find or create peer connection for this group
      let peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        peerConnection = await createPeerConnection(groupId);
      }

      // Get the group from the database to get the Janus room ID
      const response = await $fetch(`/api/groups/${groupId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get group information');
      }

      const group = response.data;
      const janusRoomId = group.janus_room_id;

      // Join the audiobridge room
      const joinResponse = await sendMessage(peerConnection.handleId, {
        janus: 'message',
        body: {
          request: 'join',
          room: janusRoomId,
          display: displayName,
          muted,
        },
      });

      console.log(`Joined audiobridge room ${janusRoomId} for group ${groupId}`);
      
      return peerConnection;
    } catch (err) {
      console.error(`Failed to join audiobridge room for group ${groupId}:`, err);
      throw err;
    }
  };

  // Configure WebRTC for an audiobridge room
  const configureAudioRoom = async (
    groupId: number, 
    audioStream?: MediaStream,
    audioConstraints?: MediaTrackConstraints
  ) => {
    try {
      // Find peer connection for this group
      const peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        throw new Error(`No peer connection found for group ${groupId}`);
      }

      // If we have an audio stream, add it to the peer connection
      if (audioStream) {
        // Remove any existing tracks
        const senders = peerConnection.pc.getSenders();
        for (const sender of senders) {
          peerConnection.pc.removeTrack(sender);
        }
        
        // Add tracks with constraints if provided
        audioStream.getTracks().forEach(track => {
          if (track.kind === 'audio' && audioConstraints) {
            // Apply constraints to audio track if provided
            track.applyConstraints(audioConstraints).catch(err => {
              console.warn('Failed to apply audio constraints:', err);
            });
          }
          peerConnection.pc.addTrack(track, audioStream);
        });
      }

      // Create offer
      const offer = await peerConnection.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      // Set local description
      await peerConnection.pc.setLocalDescription(offer);

      // Send the offer to Janus
      const response = await sendMessage(peerConnection.handleId, {
        janus: 'message',
        body: {
          request: 'configure',
          muted: audioStream ? false : true,
        },
        jsep: offer,
      });

      // Handle the answer from Janus
      if (response.jsep) {
        await peerConnection.pc.setRemoteDescription(new RTCSessionDescription(response.jsep));
      }

      console.log(`Configured WebRTC for group ${groupId}`);
      
      return peerConnection;
    } catch (err) {
      console.error(`Failed to configure WebRTC for group ${groupId}:`, err);
      throw err;
    }
  };

  // Start talking in a group
  const startTalking = async (groupId: number) => {
    try {
      // Find peer connection for this group
      const peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        throw new Error(`No peer connection found for group ${groupId}`);
      }

      // Send unmute request to Janus
      await sendMessage(peerConnection.handleId, {
        janus: 'message',
        body: {
          request: 'configure',
          muted: false,
        },
      });

      console.log(`Started talking in group ${groupId}`);
    } catch (err) {
      console.error(`Failed to start talking in group ${groupId}:`, err);
      throw err;
    }
  };

  // Stop talking in a group
  const stopTalking = async (groupId: number) => {
    try {
      // Find peer connection for this group
      const peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        throw new Error(`No peer connection found for group ${groupId}`);
      }

      // Send mute request to Janus
      await sendMessage(peerConnection.handleId, {
        janus: 'message',
        body: {
          request: 'configure',
          muted: true,
        },
      });

      console.log(`Stopped talking in group ${groupId}`);
    } catch (err) {
      console.error(`Failed to stop talking in group ${groupId}:`, err);
      throw err;
    }
  };

  // Mute/unmute speaker for a group
  const toggleSpeakerMute = async (groupId: number, muted: boolean) => {
    try {
      // Find peer connection for this group
      const peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        throw new Error(`No peer connection found for group ${groupId}`);
      }

      // Emit mute toggle event to server
      socket.value?.emit('mute_toggle', { groupId, muted });

      console.log(`${muted ? 'Muted' : 'Unmuted'} speaker for group ${groupId}`);
    } catch (err) {
      console.error(`Failed to toggle speaker mute for group ${groupId}:`, err);
      throw err;
    }
  };

  // Leave an audiobridge room
  const leaveAudioRoom = async (groupId: number) => {
    try {
      // Find peer connection for this group
      const peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        return;
      }

      // Send leave request to Janus
      await sendMessage(peerConnection.handleId, {
        janus: 'message',
        body: {
          request: 'leave',
        },
      });

      // Close peer connection
      peerConnection.pc.close();

      // Remove peer connection from list
      peerConnections.value = peerConnections.value.filter(pc => pc.groupId !== groupId);

      // Remove handle from list
      handles.value = handles.value.filter(h => h.handleId !== peerConnection.handleId);

      console.log(`Left audiobridge room for group ${groupId}`);
    } catch (err) {
      console.error(`Failed to leave audiobridge room for group ${groupId}:`, err);
      throw err;
    }
  };

  // Cleanup all connections
  const cleanup = async () => {
    try {
      // Leave all audiobridge rooms
      for (const pc of [...peerConnections.value]) {
        try {
          await leaveAudioRoom(pc.groupId);
        } catch (err) {
          console.error(`Failed to leave audiobridge room for group ${pc.groupId}:`, err);
        }
      }

      // Clear lists
      peerConnections.value = [];
      handles.value = [];
    } catch (err) {
      console.error('Failed to clean up Janus connections:', err);
    }
  };

  return {
    handles,
    peerConnections,
    loading,
    error,
    createHandle,
    sendMessage,
    sendTrickle,
    createPeerConnection,
    joinAudioRoom,
    configureAudioRoom,
    startTalking,
    stopTalking,
    toggleSpeakerMute,
    leaveAudioRoom,
    cleanup,
  };
};