import { activityLogDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:activity');

// GET /api/activity - Get system activity log
export default defineEventHandler(async (event) => {
  logger.trace('GET /api/activity called');
  try {
    // Get limit from query params (default to 20)
    const query = getQuery(event);
    const limit = parseInt(query.limit as string) || 20;
    
    // Get activities from activity log
    const activities = await activityLogDb.getRecentActivity(limit);
    
    logger.debug(`Retrieved ${activities.length} activities`);
    return { success: true, data: activities };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching activity log');
    return { success: false, error: error.message || 'Failed to fetch activity log' };
  }
});