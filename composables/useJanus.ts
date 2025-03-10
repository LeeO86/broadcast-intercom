import type { JanodeHandle, PeerConnection, GroupSettings, JanusSocketEvents } from '~/types';

export const useJanus = () => {
  const handles = ref<JanodeHandle[]>([]);
  const peerConnections = ref<PeerConnection[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Hinzufügen: Map für Fehler pro Gruppe
  const groupErrors = ref<Map<number, string>>(new Map());

  const { 
    createJanusHandle, 
    sendJanusMessage, 
    sendJanusTrickle, 
    toggleMute 
  } = useSocket();
  const { selectedSpeaker } = useAudio();

  // Hilfsmethode zum Setzen von Gruppenfehlern
  const setGroupError = (groupId: number, errorMessage: string) => {
    console.error(`Group ${groupId} error: ${errorMessage}`);
    groupErrors.value.set(groupId, errorMessage);
  };

  // Hilfsmethode zum Löschen von Gruppenfehlern
  const clearGroupError = (groupId: number) => {
    groupErrors.value.delete(groupId);
  };

  // Create a new Janus handle
  const createHandle = async (plugin: string, id?: string): Promise<string> => {
    loading.value = true;
    error.value = null;

    try {
      // Use wrapper function instead of direct socket.value
      const handleId = await createJanusHandle(plugin, id);
      
      // Store handle
      handles.value.push({
        handleId,
        plugin,
      });
      
      return handleId;
    } catch (error: any) {
      error.value = error.message || 'Failed to create Janus handle';
      console.error('Error creating Janus handle:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Send a message to a Janus handle
  const sendMessage = async (handleId: string, message: any) => {
    loading.value = true;
    error.value = null;

    try {
      // Use wrapper function instead of direct socket.value
      return await sendJanusMessage(handleId, message);
    } catch (error: any) {
      error.value = error.message || 'Failed to send Janus message';
      console.error('Error sending Janus message:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Send trickle ICE candidates to a Janus handle
  const sendTrickle = async (handleId: string, candidate: RTCIceCandidate | null) => {
    try {
      // Use wrapper function instead of direct socket.value
      await sendJanusTrickle(handleId, candidate);
    } catch (error) {
      console.error('Failed to send trickle ICE candidate:', error);
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

      // Create audio element for this peer connection
      const audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      audioElement.setAttribute('data-group-id', groupId.toString());
      
      // Set the audio output device if available
      if (selectedSpeaker.value && (audioElement as any).setSinkId) {
        try {
          await (audioElement as any).setSinkId(selectedSpeaker.value);
        } catch (err) {
          console.warn('Failed to set audio output device:', err);
        }
      }
      
      // Add audio element to the document
      document.body.appendChild(audioElement);

      // Create PeerConnection object
      const peerConnection: PeerConnection = {
        pc,
        groupId,
        handleId,
        audioElement
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
        
        // Connect the stream to the audio element
        if (audioElement) {
          audioElement.srcObject = event.streams[0];
        }
      };

      return peerConnection;
    } catch (error) {
      console.error(`Failed to create peer connection for group ${groupId}:`, error);
      throw error;
    }
  };

  // Join an audiobridge room
  const joinAudioRoom = async (groupId: number, displayName: string, muted: boolean = true) => {
    try {
      // Löschen eines vorherigen Fehlers für diese Gruppe
      clearGroupError(groupId);
      
      // Find or create peer connection for this group
      let peerConnection = peerConnections.value.find(pc => pc.groupId === groupId);
      
      if (!peerConnection) {
        peerConnection = await createPeerConnection(groupId);
      }

      // Get the group from the database to get the Janus room ID
      const response = await $fetch(`/api/groups/${groupId}`);
      if (!response.success) {
        const errText = 'error' in response ? String(response.error) : 'Failed to get group information';
        throw new Error(errText);
      }

      // Type guard to ensure data exists after success check
      if (!('data' in response)) {
        throw new Error('Group data not found in response');
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
    } catch (error: any) {
      // Fehler für diese spezifische Gruppe setzen
      setGroupError(groupId, error.message || 'Failed to join audio room');
      console.error(`Failed to join audiobridge room for group ${groupId}:`, error);
      throw error;
    }
  };

  // Configure WebRTC for an audiobridge room
  const configureAudioRoom = async (
    groupId: number, 
    audioStream?: MediaStream,
    audioConstraints?: MediaTrackConstraints,
    muted: boolean = true
  ) => {
    try {
      clearGroupError(groupId);
      
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
          muted,
        },
        jsep: offer,
      });

      // Handle the answer from Janus
      if (response.jsep) {
        await peerConnection.pc.setRemoteDescription(new RTCSessionDescription(response.jsep));
      }

      console.log(`Configured WebRTC for group ${groupId}`);
      
      return peerConnection;
    } catch (error: any) {
      setGroupError(groupId, error.message || 'Failed to configure audio room');
      console.error(`Failed to configure WebRTC for group ${groupId}:`, error);
      throw error;
    }
  };

  // Start talking in a group
  const startTalking = async (groupId: number) => {
    try {
      clearGroupError(groupId);
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
    } catch (error: any) {
      setGroupError(groupId, error.message || 'Failed to start talking');
      console.error(`Failed to start talking in group ${groupId}:`, error);
      throw error;
    }
  };

  // Stop talking in a group
  const stopTalking = async (groupId: number) => {
    try {
      clearGroupError(groupId);
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
    } catch (error: any) {
      setGroupError(groupId, error.message || 'Failed to stop talking');
      console.error(`Failed to stop talking in group ${groupId}:`, error);
      throw error;
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

      // Use wrapper function instead of direct socket.value
      toggleMute(groupId, muted);

      // Mute/unmute the audio element
      if (peerConnection.audioElement) {
        peerConnection.audioElement.muted = muted;
      }

      console.log(`${muted ? 'Muted' : 'Unmuted'} speaker for group ${groupId}`);
    } catch (error) {
      console.error(`Failed to toggle speaker mute for group ${groupId}:`, error);
      throw error;
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

      // Remove audio element
      if (peerConnection.audioElement) {
        peerConnection.audioElement.remove();
      }

      // Remove peer connection from list
      peerConnections.value = peerConnections.value.filter(pc => pc.groupId !== groupId);

      // Remove handle from list
      handles.value = handles.value.filter(h => h.handleId !== peerConnection.handleId);

      console.log(`Left audiobridge room for group ${groupId}`);
    } catch (error) {
      console.error(`Failed to leave audiobridge room for group ${groupId}:`, error);
      throw error;
    }
  };

  // Cleanup all connections
  const cleanup = async () => {
    try {
      // Leave all audiobridge rooms
      for (const pc of [...peerConnections.value]) {
        try {
          await leaveAudioRoom(pc.groupId);
        } catch (error) {
          console.error(`Failed to leave audiobridge room for group ${pc.groupId}:`, error);
        }
      }

      // Remove all audio elements
      peerConnections.value.forEach(pc => {
        if (pc.audioElement) {
          pc.audioElement.remove();
        }
      });

      // Clear lists
      peerConnections.value = [];
      handles.value = [];
    } catch (error) {
      console.error('Failed to clean up Janus connections:', error);
    }
  };

  return {
    handles,
    peerConnections,
    loading,
    error,
    groupErrors, // Neue Map exportieren
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