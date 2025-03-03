import { getAllRooms } from '~/server/utils/janus';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:janus:rooms');

// GET /api/janus/rooms - Get all Janus rooms (for admin purposes)
export default defineEventHandler(async (event) => {
  logger.trace('GET /api/janus/rooms called');
  try {
    const rooms = await getAllRooms();
    logger.debug(`Retrieved ${rooms.length} Janus rooms`);
    return { success: true, data: rooms };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching Janus rooms');
    return { success: false, error: error.message || 'Failed to fetch Janus rooms' };
  }
});