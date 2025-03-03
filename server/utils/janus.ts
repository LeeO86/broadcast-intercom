import { createLogger } from './logger';

const logger = createLogger('janus');

// Store for handles and sessions
const handles = new Map();
const rooms = new Map();
let nextHandleId = 1;

// Initialize Janus connection
export async function initJanus() {
  logger.trace('initJanus() called');
  logger.info('Mock Janus initialized');
  return true;
}

// Create a new audiobridge room
export async function createAudioRoom(roomId, description) {
  logger.trace(`createAudioRoom(${roomId}, "${description}") called`);
  
  // Store room in our local map for tracking
  rooms.set(roomId, {
    id: roomId,
    description,
    created: new Date().toISOString()
  });
  
  logger.info({ roomId, description }, 'Created mock audiobridge room');
  return true;
}

// Delete an audiobridge room
export async function deleteAudioRoom(roomId) {
  logger.trace(`deleteAudioRoom(${roomId}) called`);
  
  if (!rooms.has(roomId)) {
    logger.warn({ roomId }, 'Attempted to delete non-existent audiobridge room');
    return false;
  }
  
  // Remove room from our local map
  rooms.delete(roomId);
  
  logger.info({ roomId }, 'Deleted mock audiobridge room');
  return true;
}

// Get or create a handle for a specific plugin
export async function getHandle(plugin, id) {
  logger.trace(`getHandle("${plugin}", "${id}") called`);
  const handleId = id || plugin || `handle-${nextHandleId++}`;
  
  // Check if handle already exists
  if (handles.has(handleId)) {
    logger.debug({ handleId }, 'Returning existing handle');
    return handles.get(handleId);
  }

  logger.debug({ handleId, plugin }, 'Creating new handle');
  
  // Create mock handle
  const handle = {
    id: handleId,
    plugin: plugin,
    sendWithTransaction: async (message) => {
      logger.debug({ handleId, messageType: message.janus, bodyRequest: message.body?.request }, 'Sending message to handle');
      
      // For audiobridge join, return a mock response
      if (message.body?.request === 'join') {
        logger.debug({ room: message.body.room, display: message.body.display }, 'Handling join request');
        return {
          plugindata: {
            plugin: 'janus.plugin.audiobridge',
            data: {
              audiobridge: 'joined',
              room: message.body.room,
              id: Math.floor(Math.random() * 1000000),
              participants: []
            }
          }
        };
      }
      
      // For configure with jsep, return a mock jsep response
      if (message.body?.request === 'configure' && message.jsep) {
        logger.debug({ muted: message.body.muted, hasJsep: true }, 'Handling configure request with jsep');
        return {
          plugindata: {
            plugin: 'janus.plugin.audiobridge',
            data: {
              audiobridge: 'event',
              configured: 'ok'
            }
          },
          jsep: {
            type: 'answer',
            sdp: `v=0
o=- 1234567890 1 IN IP4 127.0.0.1
s=Mock SDP
t=0 0
a=group:BUNDLE audio
m=audio 1 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=sendrecv
a=fingerprint:sha-256 A1:2C:3D:4E:5F:6A:7B:8C:9D:0E:1F:2A:3B:4C:5D:6E:7F:8A:9B:0C:1D:2E:3F:4A:5B:6C:7D:8E:9F:0A:1B:2C
a=setup:actpass
a=ice-ufrag:mock1234
a=ice-pwd:mockpwd1234567890abcdef
a=mid:audio
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=msid-semantic: WMS mockstream
a=rtcp-mux
a=rtcp-fb:111 transport-cc
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=ssrc:1234567890 cname:mock@example.com
a=ssrc:1234567890 msid:mockstream mockaudio
a=ssrc:1234567890 mslabel:mockstream
a=ssrc:1234567890 label:mockaudio`
          }
        };
      }
      
      // For configure without jsep (mute/unmute)
      if (message.body?.request === 'configure' && !message.jsep) {
        logger.debug({ muted: message.body.muted }, 'Handling configure request (mute/unmute)');
        return {
          plugindata: {
            plugin: 'janus.plugin.audiobridge',
            data: {
              audiobridge: 'event',
              configured: 'ok',
              muted: message.body.muted
            }
          }
        };
      }
      
      // For leave request
      if (message.body?.request === 'leave') {
        logger.debug('Handling leave request');
        return {
          plugindata: {
            plugin: 'janus.plugin.audiobridge',
            data: {
              audiobridge: 'event',
              leaving: 'ok'
            }
          }
        };
      }
      
      // For destroy request (delete room)
      if (message.body?.request === 'destroy') {
        logger.debug({ room: message.body.room }, 'Handling destroy request');
        
        // Remove room from our local map
        if (message.body.room && rooms.has(message.body.room)) {
          rooms.delete(message.body.room);
          logger.info({ roomId: message.body.room }, 'Deleted audiobridge room via destroy request');
        }
        
        return {
          plugindata: {
            plugin: 'janus.plugin.audiobridge',
            data: {
              audiobridge: 'destroyed',
              room: message.body.room
            }
          }
        };
      }
      
      // Default response
      logger.debug({ plugin }, 'Sending default response');
      return {
        plugindata: {
          plugin: plugin,
          data: {
            status: 'ok'
          }
        }
      };
    },
    sendTrickle: async (candidate) => {
      logger.debug({ handleId, hasCandidate: !!candidate }, 'Sending trickle ICE candidate');
      return true;
    },
    detach: async () => {
      logger.debug({ handleId }, 'Detaching handle');
      handles.delete(handleId);
      return true;
    }
  };
  
  handles.set(handleId, handle);
  logger.info({ handleId, plugin }, 'Created and stored new handle');
  return handle;
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
  logger.info('All handles cleared');
}

// Get all rooms (for debugging/admin purposes)
export async function getAllRooms() {
  logger.trace('getAllRooms() called');
  return Array.from(rooms.values());
}

// Destroy Janus session
export async function destroyJanus() {
  logger.trace('destroyJanus() called');
  try {
    // Clear all handles
    await clearHandles();
    // Clear all rooms
    rooms.clear();
    logger.info('Mock Janus connection destroyed');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Failed to destroy mock Janus connection');
    return false;
  }
}