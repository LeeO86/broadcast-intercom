import type { NitroApp } from "nitropack";
import { Server as Engine } from "engine.io";
import { Server } from 'socket.io';
import { SocketEvents } from '~/types';
import { createLogger } from '~/server/utils/logger';
import { getHandle } from '~/server/utils/janus';
import { v4 as uuidv4 } from 'uuid';

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
    socket.on(SocketEvents.JOIN_GROUP, ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User joining group');
      
      // Add user to group
      if (!groupUsers.has(groupId)) {
        groupUsers.set(groupId, new Set());
      }
      groupUsers.get(groupId)?.add(socket.id);

      // Join the group room
      socket.join(`group:${groupId}`);

      // Get user info
      const user = userInfo.get(socket.id);
      if (user) {
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
      }
    });

    // Leave a group
    socket.on(SocketEvents.LEAVE_GROUP, ({ groupId }) => {
      logger.debug({ socketId: socket.id, groupId }, 'User leaving group');
      
      // Remove user from group
      groupUsers.get(groupId)?.delete(socket.id);
      if (groupUsers.get(groupId)?.size === 0) {
        groupUsers.delete(groupId);
      }

      // Leave the group room
      socket.leave(`group:${groupId}`);

      // Get user info
      const user = userInfo.get(socket.id);
      if (user) {
        logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User left group');
        
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
      }
    });

    // Start talking in a group
    socket.on(SocketEvents.TALKING_START, ({ groupId }) => {
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
    socket.on(SocketEvents.TALKING_STOP, ({ groupId }) => {
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

      // Notify others in the group
      socket.to(`group:${groupId}`).emit(SocketEvents.TALKING_STOP, {
        userId: user.id,
        socketId: socket.id,
        groupId
      });

      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User stopped talking');
    });
    
    // Become publisher for program sound
    socket.on(SocketEvents.PUBLISHER_CHANGED, ({ groupId }) => {
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
      }
      
      // Set this user as the publisher
      groupPublishers.set(groupId, {
        socketId: socket.id,
        userId: user.id,
        displayName: user.displayName
      });
      
      // Notify all users in the group about the new publisher
      io.to(`group:${groupId}`).emit(SocketEvents.PUBLISHER_CHANGED, {
        groupId,
        userId: user.id,
        displayName: user.displayName,
        socketId: socket.id
      });
      
      logger.info({ socketId: socket.id, userId: user.id, displayName: user.displayName, groupId }, 'User became publisher');
    });

    // ===== JANUS WEBSOCKET HANDLERS =====
    
    // Create a Janus handle
    socket.on(JanusSocketEvents.CREATE_HANDLE, async ({ plugin, id }) => {
      logger.debug({ socketId: socket.id, plugin, id }, 'Creating Janus handle');
      
      try {
        if (!plugin) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Plugin name is required' });
          return;
        }
        
        const handle = await getHandle(plugin, id);
        
        socket.emit(JanusSocketEvents.HANDLE_CREATED, { 
          success: true, 
          handleId: handle.id 
        });
        
        logger.info({ socketId: socket.id, handleId: handle.id, plugin }, 'Janus handle created');
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
        if (!handleId) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Handle ID is required' });
          return;
        }
        
        if (!message) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Message is required' });
          return;
        }
        
        // Get the handle by ID
        const handle = await getHandle('', handleId);
        
        // Send the message
        const response = await handle.sendWithTransaction(message);
        
        socket.emit(JanusSocketEvents.MESSAGE_RESPONSE, { 
          success: true, 
          data: response 
        });
        
        logger.debug({ socketId: socket.id, handleId, response }, 'Janus message sent successfully');
      } catch (error) {
        logger.error({ err: error, socketId: socket.id, handleId }, 'Error sending Janus message');
        socket.emit(JanusSocketEvents.ERROR, { 
          error: error.message || 'Failed to send Janus message' 
        });
      }
    });
    
    // Send trickle ICE candidates to a Janus handle
    socket.on(JanusSocketEvents.SEND_TRICKLE, async ({ handleId, candidate }) => {
      logger.debug({ socketId: socket.id, handleId, hasCandidate: !!candidate }, 'Sending trickle ICE candidate');
      
      try {
        if (!handleId) {
          socket.emit(JanusSocketEvents.ERROR, { error: 'Handle ID is required' });
          return;
        }
        
        // Get the handle by ID
        const handle = await getHandle('', handleId);
        
        // Send the trickle candidate
        await handle.sendTrickle(candidate);
        
        socket.emit(JanusSocketEvents.TRICKLE_RESPONSE, { success: true });
        
        logger.debug({ socketId: socket.id, handleId }, 'Trickle ICE candidate sent successfully');
      } catch (error) {
        logger.error({ err: error, socketId: socket.id, handleId }, 'Error sending trickle ICE candidate');
        socket.emit(JanusSocketEvents.ERROR, { 
          error: error.message || 'Failed to send trickle ICE candidate' 
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
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

      // Clean up user info
      userInfo.delete(socket.id);
      
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