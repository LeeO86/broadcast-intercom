import { groupsDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:groups');

// GET /api/groups - Get all groups
export default defineEventHandler(async (event) => {
  logger.trace('GET /api/groups called');
  try {
    const groups = await groupsDb.getAll();
    logger.debug(`Retrieved ${groups.length} groups`);
    return { success: true, data: groups };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching groups');
    return { success: false, error: error.message || 'Failed to fetch groups' };
  }
});