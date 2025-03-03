import { deleteAudioRoom } from '~/server/utils/janus';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:janus:rooms');

// DELETE /api/janus/rooms/:id - Delete a Janus room
export default defineEventHandler(async (event) => {
  logger.trace('DELETE /api/janus/rooms/:id called');
  try {
    const roomId = parseInt(event.context.params?.id || '0');
    if (isNaN(roomId) || roomId <= 0) {
      logger.warn({ roomId }, 'Invalid room ID');
      return { success: false, error: 'Invalid room ID' };
    }
    
    logger.debug({ roomId }, 'Deleting Janus room');
    const success = await deleteAudioRoom(roomId);
    
    if (success) {
      logger.info({ roomId }, 'Janus room deleted successfully');
      return { success: true };
    } else {
      logger.warn({ roomId }, 'Failed to delete Janus room');
      return { success: false, error: 'Failed to delete Janus room' };
    }
  } catch (error) {
    logger.error({ err: error, roomId: event.context.params?.id }, 'Error deleting Janus room');
    return { success: false, error: error.message || 'Failed to delete Janus room' };
  }
});