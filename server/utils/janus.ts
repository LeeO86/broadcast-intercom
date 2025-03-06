import { createLogger } from './logger';
import Janode from 'janode';
import AudioBridgePlugin from 'janode/plugins/audiobridge';

const logger = createLogger('janus');

// Store for handles and sessions
const clientHandles = new Map(); // Map<clientId, Map<groupId, handle>>
const rooms = new Map();
interface JanodeSession {
  id?: string;
  attach<T>(plugin: any): Promise<T>;
  destroy(): Promise<any>;
  once(event: string, listener: (...args: any[]) => void): void;
}

let janodeSession: JanodeSession | null = null;
interface JanodeConnection {
  once(event: string, listener: (...args: any[]) => void): void;
  create(): Promise<JanodeSession>;
  close(): Promise<any>;
}

let janodeConnection: JanodeConnection | null = null;

// Initialize Janus connection
export async function initJanus() {
  logger.trace('initJanus() called');
  
  try {
    const config = useRuntimeConfig();
    const janusUrl = config.janusUrl || 'ws://localhost:8188/';
    const janusApiSecret = config.janusApiSecret || '';
    
    logger.info(`Connecting to Janus at ${janusUrl}`);
    
    // Close any existing connection
    if (janodeConnection) {
      try {
        await destroyJanus();
      } catch (err) {
        logger.warn({ err }, 'Error destroying existing Janus connection');
      }
    }
    
    // Connect to Janus
    janodeConnection = await Janode.connect({
      address: [{
        url: janusUrl,
        apisecret: janusApiSecret
      }]
    });
    
    logger.info('Connection with Janus created');
    
    // Set up connection event handlers
    janodeConnection.once(Janode.EVENT.CONNECTION_CLOSED, () => {
      logger.info('Connection with Janus closed');
      janodeSession = null;
      janodeConnection = null;
      
      // Schedule reconnection
      setTimeout(() => {
        initJanus().catch(err => {
          logger.error({ err }, 'Failed to reconnect to Janus');
        });
      }, 10000); // Retry after 10 seconds
    });
    
    janodeConnection.once(Janode.EVENT.CONNECTION_ERROR, ({ message }) => {
      logger.error({ message }, 'Connection with Janus error');
      janodeSession = null;
      janodeConnection = null;
      
      // Schedule reconnection
      setTimeout(() => {
        initJanus().catch(err => {
          logger.error({ err }, 'Failed to reconnect to Janus');
        });
      }, 10000); // Retry after 10 seconds
    });
    
    // Create a session
    janodeSession = await janodeConnection.create();
    logger.info('Session with Janus created');
    
    janodeSession.once(Janode.EVENT.SESSION_DESTROYED, () => {
      logger.info('Session destroyed');
      janodeSession = null;
    });
    
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Janus setup error');
    
    if (janodeConnection) {
      try {
        await janodeConnection.close();
      } catch (err) {
        logger.warn({ err }, 'Error closing Janus connection');
      }
      janodeConnection = null;
    }
    
    janodeSession = null;
    
    // Schedule reconnection
    setTimeout(() => {
      initJanus().catch(err => {
        logger.error({ err }, 'Failed to reconnect to Janus');
      });
    }, 10000); // Retry after 10 seconds
    
    return false;
  }
}

// Create a new audiobridge room
export async function createAudioRoom(roomId: number, description: string) {
  logger.trace(`createAudioRoom(${roomId}, "${description}") called`);
  
  if (!janodeSession) {
    logger.warn('No Janus session available, storing room info locally');
    
    // Store room in our local map for tracking
    rooms.set(roomId, {
      id: roomId,
      description,
      created: new Date().toISOString()
    });
    
    logger.info({ roomId, description }, 'Stored room info locally');
    return true;
  }
  
  try {
    // Create a handle for the audiobridge plugin
    const handle = await janodeSession.attach(AudioBridgePlugin);
    logger.debug({ handleId: handle.id }, 'Audiobridge handle attached');
    
    // Create the room
    const response = await handle.create({
      room: roomId,
      description,
      record: false,
      audiolevel_event: true,
      audio_level_average: 70,
      audio_active_packets: 2,
    });
    
    logger.info({ roomId, description, response }, 'Created audiobridge room');
    
    // Store room in our local map for tracking
    rooms.set(roomId, {
      id: roomId,
      description,
      created: new Date().toISOString()
    });
    
    // Detach the handle
    await handle.detach();
    
    return true;
  } catch (error) {
    logger.error({ err: error, roomId, description }, 'Error creating audiobridge room');
    
    // Store room locally as fallback
    rooms.set(roomId, {
      id: roomId,
      description,
      created: new Date().toISOString()
    });
    
    return false;
  }
}

// Delete an audiobridge room
export async function deleteAudioRoom(roomId) {
  logger.trace(`deleteAudioRoom(${roomId}) called`);
  
  if (!janodeSession) {
    logger.warn('No Janus session available, removing room from local storage');
    
    if (!rooms.has(roomId)) {
      logger.warn({ roomId }, 'Attempted to delete non-existent room');
      return false;
    }
    
    // Remove room from our local map
    rooms.delete(roomId);
    
    logger.info({ roomId }, 'Removed room from local storage');
    return true;
  }
  
  try {
    // Create a handle for the audiobridge plugin
    const handle = await janodeSession.attach(AudioBridgePlugin);
    logger.debug({ handleId: handle.id }, 'Audiobridge handle attached for room deletion');
    
    // Destroy the room
    const response = await handle.destroy({
      room: roomId,
    });
    
    logger.info({ roomId, response }, 'Deleted audiobridge room');
    
    // Remove room from our local map
    rooms.delete(roomId);
    
    // Detach the handle
    await handle.detach();
    
    return true;
  } catch (error) {
    logger.error({ err: error, roomId }, 'Error deleting audiobridge room');
    
    // Still remove from local map
    rooms.delete(roomId);
    
    return false;
  }
}

function mapToObject(map: Map<any, any>): object {
  const obj: { [key: string]: any } = {};
  for (const [key, value] of map) {
    if (value instanceof Map) {
      // If the value is a Map, recursively convert it to an object
      obj[key] = mapToObject(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

// Get or create a handle for a specific client and group
export async function getClientGroupHandle(clientId: string, groupId: number, janusRoomId: number) {
  logger.trace(`getClientGroupHandle("${clientId}", ${groupId}, ${janusRoomId}) called`);
  
  if (!janodeSession) {
    logger.error('No Janus session available');
    throw new Error('Janus session not available');
  }
  
  try {
    // Check if we already have a handle for this client and group
    if (!clientHandles.has(clientId)) {
      clientHandles.set(clientId, new Map());
    }
    logger.trace({ clientHandles: mapToObject(clientHandles), clientId, groupId }, 'getClientGroupHandle(): List all Handles');
    const clientGroupHandles = clientHandles.get(clientId);
    
    // If we already have a handle for this group, return it
    if (clientGroupHandles.has(groupId)) {
      logger.debug({ clientId, groupId, handleId: clientGroupHandles.get(groupId).id }, 'Using existing handle');
      return clientGroupHandles.get(groupId);
    }
    
    // Create a new handle for the audiobridge plugin
    const handle = await janodeSession.attach(AudioBridgePlugin);
    logger.info({ clientId, groupId, handleId: handle.id }, 'Created new handle for client and group');
    
    // Store the handle
    clientGroupHandles.set(groupId, handle);
    
    return handle;
  } catch (error) {
    logger.error({ err: error, clientId, groupId }, 'Error getting handle for client and group');
    throw error;
  }
}

// Join a client to an audiobridge room
export async function joinClientToRoom(clientId: string, groupId: number, janusRoomId: number, displayName: string, muted = true) {
  logger.trace(`joinClientToRoom("${clientId}", ${groupId}, ${janusRoomId}, "${displayName}") called`);
  
  try {
    // Get or create a handle for this client and group
    const handle = await getClientGroupHandle(clientId, groupId, janusRoomId);
    
    // Join the room
    const response = await handle.join({
      room: janusRoomId,
      display: displayName,
      muted: muted
    });
    logger.trace({ clientHandles: mapToObject(clientHandles), clientId, groupId, handleId: handle.id }, 'joinClientToRoom(): List all Handles');
    logger.info({ clientId, groupId, janusRoomId, displayName, response }, 'Client joined audiobridge room');
    
    return { success: true, handleId: handle.id, data: response };
  } catch (error) {
    logger.error({ err: error, clientId, groupId, janusRoomId }, 'Error joining client to audiobridge room');
    throw error;
  }
}

// Configure a client's WebRTC connection
export async function configureClientWebRTC(clientId, groupId, jsep, muted = false) {
  logger.trace(`configureClientWebRTC("${clientId}", ${groupId}) called`);
  
  try {
    // Get the handle for this client and group
    if (!clientHandles.has(clientId) || !clientHandles.get(clientId).has(groupId)) {
      throw new Error(`No handle found for client ${clientId} and group ${groupId}`);
    }
    
    const handle = clientHandles.get(clientId).get(groupId);
    logger.trace({ mapToObject: mapToObject(clientHandles), clientId, groupId, handleId: handle.id }, 'configureClientWebRTC(): List all Handles');
    // Configure the WebRTC connection
    const response = await handle.configure({
      muted: muted,
      jsep: jsep
    });
    
    logger.info({ clientId, groupId, handleId: handle.id, response }, 'Client WebRTC configured');
    
    return { success: true, data: response };
  } catch (error) {
    logger.error({ err: error, clientId, groupId }, 'Error configuring client WebRTC');
    throw error;
  }
}

// Set mute state for a client in a group
export async function setClientMute(clientId: string, groupId: number, muted: boolean) {
  logger.trace(`setClientMute("${clientId}", ${groupId}, ${muted}) called`);
  
  try {
    // Get the handle for this client and group
    if (!clientHandles.has(clientId) || !clientHandles.get(clientId).has(groupId)) {
      throw new Error(`No handle found for client ${clientId} and group ${groupId}`);
    }
    logger.trace({ clientHandles: mapToObject(clientHandles), clientId, groupId }, 'setClientMute(): List all Handles');
    const handle = clientHandles.get(clientId).get(groupId);

    logger.trace({ clientId, groupId, handleId: handle.id }, 'setClientMute(): Chosen Handle');
    
    // Configure mute state
    const response = await handle.configure({
      muted: muted
    });
    
    logger.info({ clientId, groupId, muted, handleId: handle.id, response }, 'Client mute state changed');
    
    return { success: true, data: response };
  } catch (error) {
    logger.error({ err: error, clientId, groupId, muted }, 'Error setting client mute state');
    throw error;
  }
}

// Suspend audio for a client in a group (when speaker is muted)
export async function suspendClientAudio(clientId: string, groupId: number) {
  logger.trace(`suspendClientAudio("${clientId}", ${groupId}) called`);
  
  try {
    // Get the handle for this client and group
    if (!clientHandles.has(clientId) || !clientHandles.get(clientId).has(groupId)) {
      throw new Error(`No handle found for client ${clientId} and group ${groupId}`);
    }
    
    const handle = clientHandles.get(clientId).get(groupId);
    
    // Suspend audio
    const response = await handle.configure({
      muted: true,
      suspend: true
    });
    
    logger.info({ clientId, groupId, handleId: handle.id, response }, 'Client audio suspended');
    
    return { success: true, data: response };
  } catch (error) {
    logger.error({ err: error, clientId, groupId }, 'Error suspending client audio');
    throw error;
  }
}

// Resume audio for a client in a group (when speaker is unmuted)
export async function resumeClientAudio(clientId: string, groupId: number, muted = true) {
  logger.trace(`resumeClientAudio("${clientId}", ${groupId}) called`);
  
  try {
    // Get the handle for this client and group
    if (!clientHandles.has(clientId) || !clientHandles.get(clientId).has(groupId)) {
      throw new Error(`No handle found for client ${clientId} and group ${groupId}`);
    }
    
    const handle = clientHandles.get(clientId).get(groupId);
    
    // Resume audio
    const response = await handle.configure({
      muted: muted,
      suspend: false
    });
    
    logger.info({ clientId, groupId, handleId: handle.id, response }, 'Client audio resumed');
    
    return { success: true, data: response };
  } catch (error) {
    logger.error({ err: error, clientId, groupId }, 'Error resuming client audio');
    throw error;
  }
}

// Process trickle ICE candidate for a client in a group
export async function processTrickleCandidate(clientId: string, groupId: number, candidate: any | null) {
  logger.trace(`processTrickleCandidate("${clientId}", ${groupId}) called`);
  
  try {
    // Get the handle for this client and group
    if (!clientHandles.has(clientId) || !clientHandles.get(clientId).has(groupId)) {
      throw new Error(`No handle found for client ${clientId} and group ${groupId}`);
    }
    
    const handle = clientHandles.get(clientId).get(groupId);
    
    // Process the trickle candidate
    if (candidate === null) {
      // This is a trickle complete signal
      await handle.trickleComplete();
      logger.debug({ clientId, groupId, handleId: handle.id }, 'Trickle complete');
    } else {
      // This is a regular trickle candidate
      await handle.trickle(candidate);
      logger.debug({ clientId, groupId, handleId: handle.id }, 'Trickle candidate processed');
    }
    
    return { success: true };
  } catch (error) {
    logger.error({ err: error, clientId, groupId }, 'Error processing trickle candidate');
    throw error;
  }
}

// Leave a client from an audiobridge room
export async function leaveClientFromRoom(clientId: string, groupId: number) {
  logger.trace(`leaveClientFromRoom("${clientId}", ${groupId}) called`);
  
  try {
    // Get the handle for this client and group
    if (!clientHandles.has(clientId) || !clientHandles.get(clientId).has(groupId)) {
      logger.warn({ clientId, groupId }, 'No handle found for client and group, nothing to leave');
      return { success: true };
    }
    
    const handle = clientHandles.get(clientId).get(groupId);
    
    // Leave the room
    const response = await handle.leave();
    
    logger.info({ clientId, groupId, handleId: handle.id, response }, 'Client left audiobridge room');
    
    // Detach the handle
    await handle.detach();
    
    // Remove the handle from our map
    clientHandles.get(clientId).delete(groupId);
    
    // If this client has no more handles, remove the client entry
    if (clientHandles.get(clientId).size === 0) {
      clientHandles.delete(clientId);
    }
    
    return { success: true, data: response };
  } catch (error) {
    logger.error({ err: error, clientId, groupId }, 'Error leaving audiobridge room');
    
    // Still try to clean up the handle
    try {
      if (clientHandles.has(clientId) && clientHandles.get(clientId).has(groupId)) {
        const handle = clientHandles.get(clientId).get(groupId);
        await handle.detach();
        clientHandles.get(clientId).delete(groupId);
        
        if (clientHandles.get(clientId).size === 0) {
          clientHandles.delete(clientId);
        }
      }
    } catch (cleanupError) {
      logger.error({ err: cleanupError, clientId, groupId }, 'Error cleaning up handle after leave failure');
    }
    
    throw error;
  }
}

// Clean up all handles for a client
export async function cleanupClientHandles(clientId: string) {
  logger.trace(`cleanupClientHandles("${clientId}") called`);
  
  if (!clientHandles.has(clientId)) {
    logger.debug({ clientId }, 'No handles found for client, nothing to clean up');
    return { success: true };
  }
  
  const clientGroupHandles = clientHandles.get(clientId);
  const errors = [];
  
  // Leave each room and detach each handle
  for (const [groupId, handle] of clientGroupHandles.entries()) {
    try {
      // Try to leave the room
      try {
        await handle.leave();
        logger.debug({ clientId, groupId, handleId: handle.id }, 'Client left audiobridge room during cleanup');
      } catch (leaveError) {
        logger.warn({ err: leaveError, clientId, groupId, handleId: handle.id }, 'Error leaving room during cleanup');
      }
      
      // Detach the handle
      await handle.detach();
      logger.debug({ clientId, groupId, handleId: handle.id }, 'Handle detached during cleanup');
    } catch (error) {
      logger.error({ err: error, clientId, groupId }, 'Error cleaning up handle');
      errors.push(error);
    }
  }
  
  // Remove all handles for this client
  clientHandles.delete(clientId);
  
  logger.info({ clientId, errorCount: errors.length }, 'Client handles cleaned up');
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true };
}

// Get all rooms (for debugging/admin purposes)
export async function getAllRooms() {
  logger.trace('getAllRooms() called');
  
  if (!janodeSession) {
    logger.warn('No Janus session available, returning locally stored rooms');
    return Array.from(rooms.values());
  }
  
  try {
    // Create a handle for the audiobridge plugin
    const handle = await janodeSession.attach<JanusPluginHandle>(AudioBridgePlugin);
    logger.debug({ handleId: handle.id }, 'Audiobridge handle attached for listing rooms');
    
    // List all rooms
    const response = await handle.list();
    logger.debug({ response }, 'Retrieved rooms list from Janus');
    
    // Format the response
    const roomsList = response.list.map(room => ({
      id: room.room,
      description: room.description || '',
      created: new Date().toISOString(), // Janus doesn't provide creation time
      participants: room.num_participants || 0
    }));
    
    // Detach the handle
    await handle.detach();
    
    return roomsList;
  } catch (error) {
    logger.error({ err: error }, 'Error getting rooms list');
    
    // Return locally stored rooms as fallback
    return Array.from(rooms.values());
  }
}

// Get handle for a specific plugin (legacy method, use getClientGroupHandle instead)
// Interface for Janus plugin handle
interface JanusPluginHandle {
  id: string;
  detach(): Promise<any>;
  leave?(): Promise<any>;
  join?(options: any): Promise<any>;
  configure?(options: any): Promise<any>;
  trickle?(candidate: any): Promise<any>;
  trickleComplete?(): Promise<any>;
  create?(options: any): Promise<any>;
  destroy?(options: any): Promise<any>;
  list?(): Promise<any>;
}

export async function getHandle(plugin: string, id: string): Promise<JanusPluginHandle> {
  logger.trace(`getHandle("${plugin}", "${id}") called`);
  logger.warn('Using legacy getHandle method, consider using getClientGroupHandle instead');
  
  if (!janodeSession) {
    logger.error('No Janus session available');
    throw new Error('Janus session not available');
  }
  
  try {
    // Determine which plugin to use
    let pluginToUse;
    if (plugin === 'janus.plugin.audiobridge' || plugin === 'audiobridge') {
      pluginToUse = AudioBridgePlugin;
    } else {
      // Default to AudioBridgePlugin if not specified
      pluginToUse = AudioBridgePlugin;
    }
    
    // Create a handle for the specified plugin
    const handle = await janodeSession.attach<JanusPluginHandle>(pluginToUse);
    logger.info({ handleId: handle.id, plugin }, 'Created Janode handle');
    
    return handle;
  } catch (error) {
    logger.error({ err: error, plugin, id }, 'Error getting handle');
    throw error;
  }
}

// Destroy Janus session
export async function destroyJanus() {
  logger.trace('destroyJanus() called');
  
  try {
    // Clean up all client handles
    const clientIds = Array.from(clientHandles.keys());
    for (const clientId of clientIds) {
      try {
        await cleanupClientHandles(clientId);
      } catch (error) {
        logger.error({ err: error, clientId }, 'Error cleaning up client handles during Janus destruction');
      }
    }
    
    // Destroy session if it exists
    if (janodeSession) {
      await janodeSession.destroy();
      janodeSession = null;
    }
    
    // Close connection if it exists
    if (janodeConnection) {
      await janodeConnection.close();
      janodeConnection = null;
    }
    
    logger.info('Janus connection destroyed');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to destroy Janus connection');
    
    // Reset variables even if there was an error
    janodeSession = null;
    janodeConnection = null;
    clientHandles.clear();
    
    return false;
  }
}