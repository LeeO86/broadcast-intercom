import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from 'socket.io';
import { SocketEvents, JanusSocketEvents } from '~/types';
import { createLogger } from '~/server/utils/logger';
import { 
  getClientGroupHandle, 
  joinClientToRoom, 
  configureClientWebRTC, 
  setClientMute, 
  suspendClientAudio, 
  resumeClientAudio, 
  processTrickleCandidate, 
  leaveClientFromRoom, 
  cleanupClientHandles 
} from '~/server/utils/janus';
import { v4 as uuidv4 } from 'uuid';
import { groupsDb } from '~/server/database';

const logger = createLogger('plugins:socket');

export default defineNitroPlugin((nitroApp: NitroApp) => {
  logger.trace('Socket.IO plugin initializing');
  
  // Create Socket.IO server
  const engine = new Engine();
  const io = new Server();

  io.bind(engine);

  // Store active users by production and group
  const productionUsers = new Map<number, Map<string, { id: string, displayName: string }>>();
  const groupUsers = new Map<number, Set<string>>();
  const userInfo = new Map<string, { id: string, displayName: string }>();
  const talkingUsers = new Map<string, Set<number>>();
  
  // Store program sound publishers
  const groupPublishers = new Map<number, { socketId: string, userId: string, displayName: string }>();
  
  // Store muted groups for each client
  const clientMutedGroups = new Map<string, Set<number>>();

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');
    
    // Generate a UUID for this client if they don't provide one
    socket.emit(SocketEvents.USER_ID, { userId: uuidv4() });

    // Join a production
    socket.on(SocketEvents.JOIN_PRODUCTION, ({ productionId, userId, displayName }) => {
      logger.debug({ socketId: socket.id, productionId, userId, displayName }, 'User joining production');
      
      // Store user info
      userInfo.set(socket.id, { id: userId, displayName });

      // Add user to production
      if (!productionUsers.has(productionId)) {
        productionUsers.set(productionId, new Map());
      }
      productionUsers.get(productionId)?.set(socket.id, { id: userId, displayName });

      // Join the production room
      socket.join(`production:${productionId}`);

      // Send the current users in the production to the new user
      const usersInProduction = Array.from(productionUsers.get(productionId)?.values() || []);
      socket.emit(SocketEvents.USERS_LIST, usersInProduction);

      // Notify others in the production
      socket.to(`production:${productionId}`).emit(SocketEvents.USER_JOINED, {
        userId,
        displayName,
        socketId: socket.id
      });

      logger.info({ socketId: socket.id, userId, displayName, productionId }, 'User joined production');
    });

    // Leave a production
    socket.on(SocketEvents.LEAVE_PRODUCTION, ({ productionId }) => {
      logger.debug({ socketId: socket.id, productionId }, 'User leaving production');
      
      // Remove user from production
      productionUsers.get(productionId)?.delete(socket.id);
      if (productionUsers.get(productionId)?.size === 0) {
        productionUsers.delete(productionId);
      }

      // Leave the production room
      socket.leave(`production:${productionId}`);

      // Get user info
      const user = userInfo.get(socket.id);
      if (user) {
        // Notify others in the production
        socket.to(`production:${productionId}`).emit(SocketEvents.USER_LEFT, {
          userId: user.id,
          socketId: socket.id
        });

        logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, productionId }, 'User left production');
      }
    });

    // Join a group
    socket.on(SocketEvents.JOIN_GROUP, async ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User joining group');
      
      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.warn({ socketId: socket.id, groupId }, 'Unknown user tried to join group');
        return;
      }
      
      // Add user to group
      if (!groupUsers.has(groupId)) {
        groupUsers.set(groupId, new Set());
      }
      groupUsers.get(groupId)?.add(socket.id);

      // Join the group room
      socket.join(`group:${groupId}`);
      
      // Get group info from database to get Janus room ID
      try {
        const response = await groupsDb.getById(groupId);
        if (response) {
          const janusRoomId = response.janus_room_id;
          
          // Join the Janus audiobridge room
          try {
            await joinClientToRoom(
              user.id, 
              groupId, 
              janusRoomId, 
              user.displayName, 
              response.settings.muted_by_default
            );
            
            logger.info({ 
              socketId: socket.id, 
              userId: user.id, 
              displayName: user.displayName, 
              groupId, 
              janusRoomId 
            }, 'User joined Janus audiobridge room');
          } catch (err) {
            logger.error({ 
              err, 
              socketId: socket.id, 
              userId: user.id, 
              groupId, 
              janusRoomId 
            }, 'Error joining Janus audiobridge room');
          }
        }
      } catch (err) {
        logger.error({ err, groupId }, 'Error getting group info from database');
      }

      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User joined group');
      
      // If there's a publisher for this group, notify the new user
      const publisher = groupPublishers.get(groupId);
      if (publisher) {
        socket.emit(SocketEvents.PUBLISHER_CHANGED, {
          groupId,
          userId: publisher.userId,
          displayName: publisher.displayName,
          socketId: publisher.socketId
        });
      }
    });

    // Leave a group
    socket.on(SocketEvents.LEAVE_GROUP, async ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User leaving group');
      
      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.warn({ socketId: socket.id, groupId }, 'Unknown user tried to leave group');
        return;
      }
      
      // Remove user from group
      groupUsers.get(groupId)?.delete(socket.id);
      if (groupUsers.get(groupId)?.size === 0) {
        groupUsers.delete(groupId);
      }

      // Leave the group room
      socket.leave(`group:${groupId}`);
      
      // Leave the Janus audiobridge room
      try {
        await leaveClientFromRoom(user.id, groupId);
        logger.info({ socketId: socket.id, userId: user.id, groupId }, 'User left Janus audiobridge room');
      } catch (err) {
        logger.error({ err, socketId: socket.id, userId: user.id, groupId }, 'Error leaving Janus audiobridge room');
      }
      
      // If this user was the publisher, notify others and clear publisher
      const publisher = groupPublishers.get(groupId);
      if (publisher && publisher.socketId === socket.id) {
        groupPublishers.delete(groupId);
        
        // Notify all users in the group that there's no publisher
        io.to(`group:${groupId}`).emit(SocketEvents.PUBLISHER_CHANGED, {
          groupId,
          userId: null,
          displayName: null,
          socketId: null
        });
        
        logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'Publisher left group');
      }

      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User left group');
    });

    // Start talking in a group
    socket.on(SocketEvents.TALKING_START, async ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User starting to talk');
      
      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.warn({ socketId: socket.id, groupId }, 'Unknown user tried to start talking');
        return;
      }

      // Add group to user's talking groups
      if (!talkingUsers.has(socket.id)) {
        talkingUsers.set(socket.id, new Set());
      }
      talkingUsers.get(socket.id)?.add(groupId);
      
      // Set mute state in Janus
      try {
        await setClientMute(user.id, groupId, false);
        logger.debug({ socketId: socket.id, userId: user.id, groupId }, 'User unmuted in Janus');
      } catch (err) {
        logger.error({ err, socketId: socket.id, userId: user.id, groupId }, 'Error unmuting user in Janus');
      }

      // Notify others in the group
      socket.to(`group:${groupId}`).emit(SocketEvents.TALKING_START, {
        userId: user.id,
        displayName: user.displayName,
        socketId: socket.id,
        groupId
      });

      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User started talking');
    });

    // Stop talking in a group
    socket.on(SocketEvents.TALKING_STOP, async ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User stopping talking');
      
      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.warn({ socketId: socket.id, groupId }, 'Unknown user tried to stop talking');
        return;
      }

      // Remove group from user's talking groups
      talkingUsers.get(socket.id)?.delete(groupId);
      if (talkingUsers.get(socket.id)?.size === 0) {
        talkingUsers.delete(socket.id);
      }
      
      // Set mute state in Janus
      try {
        await setClientMute(user.id, groupId, true);
        logger.debug({ socketId: socket.id, userId: user.id, groupId }, 'User muted in Janus');
      } catch (err) {
        logger.error({ err, socketId: socket.id, userId: user.id, groupId }, 'Error muting user in Janus');
      }

      // Notify others in the group
      socket.to(`group:${groupId}`).emit(SocketEvents.TALKING_STOP, {
        userId: user.id,
        socketId: socket.id,
        groupId
      });

      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User stopped talking');
    });
    
    // Become publisher for program sound
    socket.on(SocketEvents.PUBLISHER_CHANGED, async ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User becoming publisher');
      
      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.warn({ socketId: socket.id, groupId }, 'Unknown user tried to become publisher');
        return;
      }
      
      // Check if there's already a publisher
      const existingPublisher = groupPublishers.get(groupId);
      if (existingPublisher) {
        // If this user is already the publisher, do nothing
        if (existingPublisher.socketId === socket.id) {
          return;
        }
        
        // Otherwise, notify the existing publisher that they've been replaced
        io.to(existingPublisher.socketId).emit(SocketEvents.PUBLISHER_CHANGED, {
          groupId,
          userId: null,
          displayName: null,
          socketId: null,
          replaced: true
        });
        
        // Set mute state for the previous publisher in Janus
        try {
          const prevUser = userInfo.get(existingPublisher.socketId);
          if (prevUser) {
            await setClientMute(prevUser.id, groupId, true);
            logger.debug({ 
              socketId: existingPublisher.socketId, 
              userId: prevUser.id, 
              groupId 
            }, 'Previous publisher muted in Janus');
          }
        } catch (err) {
          logger.error({ 
            err, 
            socketId: existingPublisher.socketId, 
            groupId 
          }, 'Error muting previous publisher in Janus');
        }
      }
      
      // Set this user as the publisher
      groupPublishers.set(groupId, {
        socketId: socket.id,
        userId: user.id,
        displayName: user.displayName
      });
      
      // Set mute state in Janus
      try {
        await setClientMute(user.id, groupId, false);
        logger.debug({ socketId: socket.id, userId: user.id, groupId }, 'Publisher unmuted in Janus');
      } catch (err) {
        logger.error({ err, socketId: socket.id, userId: user.id, groupId }, 'Error unmuting publisher in Janus');
      }
      
      // Notify all users in the group about the new publisher
      io.to(`group:${groupId}`).emit(SocketEvents.PUBLISHER_CHANGED, {
        groupId,
        userId: user.id,
        displayName: user.displayName,
        socketId: socket.id
      });
      
      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User became publisher');
    });
    
    // Handle mute toggle for a group
    socket.on('mute_toggle', async ({ groupId, muted }) => {
      logger.debug({ socketId: socket.id, groupId, muted }, 'User toggling group mute');
      
      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.warn({ socketId: socket.id, groupId }, 'Unknown user tried to toggle mute');
        return;
      }
      
      // Track muted groups for this client
      if (!clientMutedGroups.has(user.id)) {
        clientMutedGroups.set(user.id, new Set());
      }
      
      if (muted) {
        // Add to muted groups
        clientMutedGroups.get(user.id)?.add(groupId);
        
        // Suspend audio in Janus
        try {
          await suspendClientAudio(user.id, groupId);
          logger.debug({ socketId: socket.id, userId: user.id, groupId }, 'User suspended audio in Janus');
        } catch (err) {
          logger.error({ err, socketId: socket.id, userId: user.id, groupId }, 'Error suspending audio in Janus');
        }
      } else {
        // Remove from muted groups
        clientMutedGroups.get(user.id)?.delete(groupId);
        
        // Resume audio in Janus
        try {
          // If user is talking or is the publisher, resume unmuted
          const isTalking = talkingUsers.get(socket.id)?.has(groupId);
          const isPublisher = groupPublishers.get(groupId)?.socketId === socket.id;
          
          await resumeClientAudio(user.id, groupId, !(isTalking || isPublisher));
          logger.debug({ 
            socketId: socket.id, 
            userId: user.id, 
            groupId, 
            muted: !(isTalking || isPublisher) 
          }, 'User resumed audio in Janus');
        } catch (err) {
          logger.error({ err, socketId: socket.id, userId: user.id, groupId }, 'Error resuming audio in Janus');
        }
      }
      
      logger.info({ 
        socketId: socket.id, 
        userId: user.id, 
        displayName: user.displayName, 
        groupId, 
        muted 
      }, 'User toggled group mute');
    });

    // ===== JANUS WEBSOCKET HANDLERS =====
    
    // Create a Janus handle
    socket.on(JanusSocketEvents.CREATE_HANDLE, async ({ plugin, id }) => {
      logger.debug({ socketId: socket.id, plugin, id }, 'Creating Janus handle');
      
      try {
        // Get user info
        const user = userInfo.get(socket.id);
        if (!user) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'User not found' });
          return;
        }
        
        if (!plugin) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Plugin name is required' });
          return;
        }
        
        // Extract group ID from the ID string if provided
        let groupId = 0;
        if (id && id.startsWith('group-')) {
          groupId = parseInt(id.substring(6));
        }
        
        // Get group info from database to get Janus room ID
        let janusRoomId = 0;
        if (groupId > 0) {
          try {
            const response = await groupsDb.getById(groupId);
            if (response) {
              janusRoomId = response.janus_room_id;
            }
          } catch (err) {
            logger.error({ err, groupId }, 'Error getting group info from database');
          }
        }
        
        // Get or create a handle for this client and group
        const handle = await getClientGroupHandle(user.id, groupId, janusRoomId);
        
        socket.emit(JanusSocketEvents.HANDLE_CREATED, { 
          success: true, 
          handleId: handle.id 
        });
        
        logger.info({ socketId: socket.id, userId: user.id, handleId: handle.id, groupId }, 'Janus handle created');
      } catch (error) {
        logger.error({ err: error, socketId: socket.id }, 'Error creating Janus handle');
        socket.emit(JanusSocketEvents.ERROR, { 
          error: error.message || 'Failed to create Janus handle' 
        });
      }
    });
    
    // Send a message to a Janus handle
    socket.on(JanusSocketEvents.SEND_MESSAGE, async ({ handleId, message }) => {
      logger.debug({ socketId: socket.id, handleId, messageType: message?.janus }, 'Sending Janus message');
      
      try {
        // Get user info
        const user = userInfo.get(socket.id);
        if (!user) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'User not found' });
          return;
        }
        
        if (!handleId) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Handle ID is required' });
          return;
        }
        
        if (!message) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Message is required' });
          return;
        }
        
        // Extract the request type and group ID
        const requestType = message.body?.request;
        const groupId = message.body?.room ? parseInt(message.body.room) : 0;
        
        let response;
        
        // Process the message based on the request type
        if (requestType === 'join') {
          // Join the room
          response = await joinClientToRoom(
            user.id,
            groupId,
            message.body.room,
            message.body.display || user.displayName,
            message.body.muted !== false
          );
        } 
        else if (requestType === 'configure') {
          // Configure the WebRTC connection
          if (message.jsep) {
            response = await configureClientWebRTC(
              user.id,
              groupId,
              message.jsep,
              message.body.muted !== false
            );
          } else {
            // Just configure mute state
            response = await setClientMute(
              user.id,
              groupId,
              message.body.muted !== false
            );
          }
        }
        else if (requestType === 'leave') {
          // Leave the room
          response = await leaveClientFromRoom(user.id, groupId);
        }
        else {
          // Unknown request type
          logger.warn({ requestType, userId: user.id, groupId }, 'Unknown request type');
          socket.emit(JanusSocketEvents.ERROR, { error: `Unknown request type: ${requestType}` });
          return;
        }
        
        socket.emit(JanusSocketEvents.MESSAGE_RESPONSE, { 
          success: true, 
          data: response.data 
        });
        
        logger.debug({ socketId: socket.id, userId: user.id, handleId, requestType, groupId }, 'Janus message processed successfully');
      } catch (error) {
        logger.error({ err: error, socketId: socket.id, handleId }, 'Error processing Janus message');
        socket.emit(JanusSocketEvents.ERROR, { 
          error: error.message || 'Failed to process Janus message' 
        });
      }
    });
    
    // Send trickle ICE candidates to a Janus handle
    socket.on(JanusSocketEvents.SEND_TRICKLE, async ({ handleId, candidate }) => {
      logger.debug({ socketId: socket.id, handleId, hasCandidate: !!candidate }, 'Sending trickle ICE candidate');
      
      try {
        // Get user info
        const user = userInfo.get(socket.id);
        if (!user) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'User not found' });
          return;
        }
        
        if (!handleId) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Handle ID is required' });
          return;
        }
        
        // Find the group ID for this handle
        let groupId = 0;
        for (const [gid, handle] of clientHandles.get(user.id)?.entries() || []) {
          if (handle.id === handleId) {
            groupId = gid;
            break;
          }
        }
        
        if (groupId === 0) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Handle not found for this user' });
          return;
        }
        
        // Process the trickle candidate
        await processTrickleCandidate(user.id, groupId, candidate);
        
        socket.emit(JanusSocketEvents.TRICKLE_RESPONSE, { success: true });
        
        logger.debug({ socketId: socket.id, userId: user.id, handleId, groupId }, 'Trickle ICE candidate processed');
      } catch (error) {
        logger.error({ err: error, socketId: socket.id, handleId }, 'Error processing trickle ICE candidate');
        socket.emit(JanusSocketEvents.ERROR, { 
          error: error.message || 'Failed to process trickle ICE candidate' 
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.debug({ socketId: socket.id }, 'Socket disconnected');

      // Get user info
      const user = userInfo.get(socket.id);
      if (!user) {
        logger.debug({ socketId: socket.id }, 'Unknown user disconnected');
        return;
      }

      // Notify all productions and groups the user was in
      for (const [productionId, users] of productionUsers.entries()) {
        if (users.has(socket.id)) {
          // Remove user from production
          users.delete(socket.id);
          if (users.size === 0) {
            productionUsers.delete(productionId);
          }

          // Notify others in the production
          socket.to(`production:${productionId}`).emit(SocketEvents.USER_LEFT, {
            userId: user.id,
            socketId: socket.id
          });
          
          logger.info({ socketId: socket.id, userId: user.id, productionId }, 'User disconnected from production');
        }
      }
      
      // Check if user was a publisher in any group
       for (const [groupId, publisher] of groupPublishers.entries()) {
        if (publisher.socketId === socket.id) {
          // Remove publisher
          groupPublishers.delete(groupId);
          
          // Notify all users in the group that there's no publisher
          io.to(`group:${groupId}`).emit(SocketEvents.PUBLISHER_CHANGED, {
            groupId,
            userId: null,
            displayName: null,
            socketId: null
          });
          
          logger.info({ socketId: socket.id, userId: user.id, groupId }, 'Publisher disconnected');
        }
      }

      // Clean up talking status
      talkingUsers.delete(socket.id);
      
      // Clean up Janus handles for this client
      try {
        await cleanupClientHandles(user.id);
        logger.info({ socketId: socket.id, userId: user.id }, 'Cleaned up Janus handles for disconnected user');
      } catch (err) {
        logger.error({ err, socketId: socket.id, userId: user.id }, 'Error cleaning up Janus handles for disconnected user');
      }

      // Clean up user info
      userInfo.delete(socket.id);
      
      // Clean up muted groups
      clientMutedGroups.delete(user.id);
      
      logger.info({ socketId: socket.id, userId: user.id }, 'User fully disconnected');
    });
  });

  // Make the io instance available to the event handlers
  nitroApp.hooks.hook('request:context', (event) => {
    event.context.socketIO = io;
  });

  nitroApp.router.use("/socket.io/", defineEventHandler({
    handler(event) {
      engine.handleRequest(event.node.req, event.node.res);
      event._handled = true;
    },
    websocket: {
      open(peer) {
        // @ts-expect-error private method and property
        engine.prepare(peer._internal.nodeReq);
        // @ts-expect-error private method and property
        engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket);
      }
    }
  }));
  
  logger.info('Socket.IO server initialized');
});