import { initJanus, createAudioRoom, getAllRooms } from '~/server/utils/janus';
import { groupsDb, productionsDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('plugins:janus');

export default defineNitroPlugin(async () => {
  logger.trace('Janus plugin initializing');
  try {
    // Initialize Janus connection
    const success = await initJanus();
    
    if (success) {
      logger.info('Janus plugin initialized successfully');
      
      try {
        // Fetch rooms from the database using groupsDb service
        const dbRooms = await groupsDb.getAll();
        
        // Get existing rooms in Janus
        const janusRooms = await getAllRooms();
        const janusRoomIds = janusRooms.map(room => room.id);
        
        // Create missing rooms in Janus
        for (const room of dbRooms) {
          if (!janusRoomIds.includes(room.janus_room_id)) {
            const production = await productionsDb.getById(room.production_id);
            if (!production) {
              logger.warn({ productionId: room.production_id }, 'Production not found');
              continue;
            }
            await createAudioRoom(room.janus_room_id, `${production.name} - ${room.name}`);
            logger.info(`Room ${room.id} created in Janus`);
          } else {
            logger.info(`Room ${room.id} already exists in Janus`);
          }
        }
      } catch (dbError) {
        logger.error({ err: dbError }, 'Error synchronizing rooms with Janus');
      }
    } else {
      logger.error('Failed to initialize Janus plugin');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error initializing Janus plugin');
  }
});