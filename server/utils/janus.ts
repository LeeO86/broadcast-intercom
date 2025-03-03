import Janode from 'janode';
import Audiobridgeplugin from 'janode/plugins/audiobridge';
import { createLogger } from './logger';

const logger = createLogger('janus');

// Store for handles and sessions
const handles = new Map();
const sessions = new Map();
let janodeConnection = null;

// Initialize Janus connection
export async function initJanus() {
  logger.trace('initJanus() called');
  
  try {
    const config = useRuntimeConfig();
    const janusUrl = config.janusUrl || 'ws://localhost:8188';
    const janusApiSecret = config.janusApiSecret || '';
    
    logger.debug({ janusUrl }, 'Connecting to Janus server');
    
    // Initialize Janode connection
    janodeConnection = await Janode.connect({
      address: [{
        url: janusUrl,
        apisecret: janusApiSecret
      }],
      // seconds between retries after a connection setup error
      retry_time_secs: 10
    });
    
    // Set up event handlers
    janodeConnection.on('error', (err) => {
      logger.error({ err }, 'Janus connection error');
    });
    
    janodeConnection.on('close', () => {
      logger.warn('Janus connection closed');
    });
    
    logger.info('Janus connection established successfully');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to Janus server');
    return false;
  }
}

// Create a new audiobridge room
export async function createAudioRoom(roomId, description) {
  logger.trace(`createAudioRoom(${roomId}, "${description}") called`);
  
  try {
    if (!janodeConnection) {
      logger.error('Janus connection not initialized');
      return false;
    }
    
    // Create a session
    const session = await janodeConnection.create();
    
    // Create an audiobridge handle
    const handle = await session.attach(Audiobridgeplugin);
    
    // Create the room
    const response = await handle.sendWithTransaction({
      janus: 'message',
      body: {
        request: 'create',
        room: roomId,
        description: description,
        record: false,
        audiolevel_event: true,
        audio_active_packets: 10,
        audio_level_average: 25,
        secret: `room-${roomId}-secret`,
      }
    });
    
    // Check response
    if (response?.plugindata?.data?.audiobridge === 'created') {
      logger.info({ roomId, description }, 'Audiobridge room created successfully');
      
      // Detach handle and destroy session
      await handle.detach();
      await session.destroy();
      
      return true;
    } else {
      logger.error({ response }, 'Failed to create audiobridge room');
      return false;
    }
  } catch (error) {
    logger.error({ err: error, roomId, description }, 'Error creating audiobridge room');
    return false;
  }
}

// Delete an audiobridge room
export async function deleteAudioRoom(roomId) {
  logger.trace(`deleteAudioRoom(${roomId}) called`);
  
  try {
    if (!janodeConnection) {
      logger.error('Janus connection not initialized');
      return false;
    }
    
    // Create a session
    const session = await janodeConnection.create();
    
    // Create an audiobridge handle
    const handle = await session.attach('janus.plugin.audiobridge');
    
    // Destroy the room
    const response = await handle.sendWithTransaction({
      janus: 'message',
      body: {
        request: 'destroy',
        room: roomId,
        secret: `room-${roomId}-secret`,
      }
    });
    
    // Check response
    if (response?.plugindata?.data?.audiobridge === 'destroyed') {
      logger.info({ roomId }, 'Audiobridge room destroyed successfully');
      
      // Detach handle and destroy session
      await handle.detach();
      await session.destroy();
      
      return true;
    } else {
      logger.error({ response }, 'Failed to destroy audiobridge room');
      return false;
    }
  } catch (error) {
    logger.error({ err: error, roomId }, 'Error destroying audiobridge room');
    return false;
  }
}

// Get or create a handle for a specific plugin
export async function getHandle(plugin, id) {
  logger.trace(`getHandle("${plugin}", "${id}") called`);
  const handleId = id || plugin;
  
  // Check if handle already exists
  if (handles.has(handleId)) {
    logger.debug({ handleId }, 'Returning existing handle');
    return handles.get(handleId);
  }

  logger.debug({ handleId, plugin }, 'Creating new handle');
  
  try {
    if (!janodeConnection) {
      throw new Error('Janus connection not initialized');
    }
    
    // Create a session if needed
    let session;
    if (sessions.has(handleId)) {
      session = sessions.get(handleId);
    } else {
      session = await janodeConnection.create();
      sessions.set(handleId, session);
      
      // Set up session event handlers
      session.on('timeout', () => {
        logger.warn({ handleId }, 'Session timeout');
        sessions.delete(handleId);
      });
      
      session.on('destroyed', () => {
        logger.info({ handleId }, 'Session destroyed');
        sessions.delete(handleId);
      });
    }
    
    // Create handle
    const handle = await session.attach(Audiobridgeplugin);
    
    // Store handle
    handles.set(handleId, handle);
    
    // Set up handle event handlers
    handle.on('detached', () => {
      logger.info({ handleId }, 'Handle detached');
      handles.delete(handleId);
    });
    
    return handle;
  } catch (error) {
    logger.error({ err: error, handleId, plugin }, 'Error creating handle');
    throw error;
  }
}

// Clear all existing handles
export async function clearHandles() {
  logger.trace('clearHandles() called');
  
  for (const [id, handle] of handles.entries()) {
    try {
      await handle.detach();
      logger.debug({ handleId: id }, 'Detached handle');
    } catch (error) {
      logger.error({ err: error, handleId: id }, 'Failed to detach handle');
    }
  }
  
  handles.clear();
  
  // Also destroy all sessions
  for (const [id, session] of sessions.entries()) {
    try {
      await session.destroy();
      logger.debug({ sessionId: id }, 'Destroyed session');
    } catch (error) {
      logger.error({ err: error, sessionId: id }, 'Failed to destroy session');
    }
  }
  
  sessions.clear();
  
  logger.info('All handles and sessions cleared');
}

// Get all rooms (for debugging/admin purposes)
export async function getAllRooms() {
  logger.trace('getAllRooms() called');
  
  try {
    if (!janodeConnection) {
      logger.error('Janus connection not initialized');
      return [];
    }
    
    // Create a session
    const session = await janodeConnection.create();
    
    // Create an audiobridge handle
    const handle = await session.attach('janus.plugin.audiobridge');
    
    // List all rooms
    const response = await handle.sendWithTransaction({
      janus: 'message',
      body: {
        request: 'list',
      }
    });
    
    // Check response
    if (response?.plugindata?.data?.audiobridge === 'success' && 
        Array.isArray(response?.plugindata?.data?.list)) {
      const rooms = response.plugindata.data.list.map(room => ({
        id: room.room,
        description: room.description || `Room ${room.room}`,
        created: new Date().toISOString(), // Janus doesn't provide creation time
        participants: room.num_participants || 0
      }));
      
      // Detach handle and destroy session
      await handle.detach();
      await session.destroy();
      
      logger.debug(`Retrieved ${rooms.length} audiobridge rooms`);
      return rooms;
    } else {
      logger.error({ response }, 'Failed to list audiobridge rooms');
      return [];
    }
  } catch (error) {
    logger.error({ err: error }, 'Error listing audiobridge rooms');
    return [];
  }
}

// Destroy Janus session
export async function destroyJanus() {
  logger.trace('destroyJanus() called');
  
  try {
    // Clear all handles and sessions
    await clearHandles();
    
    // Disconnect Janode
    if (janodeConnection) {
      await janodeConnection.close();
      janodeConnection = null;
    }
    
    logger.info('Janus connection destroyed');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to destroy Janus connection');
    return false;
  }
}