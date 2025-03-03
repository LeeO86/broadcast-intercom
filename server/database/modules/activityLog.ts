import { getDb } from '../schema';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('database:activityLog');

// Activity Log
export const activityLogDb = {
  logActivity: async (
    action: 'created' | 'updated' | 'deleted',
    itemType: 'production' | 'group' | 'user' | 'email_template',
    itemId: number,
    itemName: string,
    details?: string,
    productionId?: number,
    productionName?: string | null
  ) => {
    logger.trace(`activityLogDb.logActivity(${action}, ${itemType}, ${itemId}, "${itemName}") called`);
    try {
      const db = await getDb();
      
      // If we have a production ID but no name, try to get the name
      if (productionId && !productionName) {
        try {
          const production = await db.get('SELECT name FROM productions WHERE id = ?', productionId);
          if (production) {
            productionName = production.name;
          }
        } catch (err) {
          logger.warn({ err, productionId }, 'Failed to get production name for activity log');
        }
      }
      
      logger.debug({ action, itemType, itemId, itemName, details, productionId, productionName }, 'Logging activity');
      await db.run(
        `INSERT INTO activity_log (
          action, item_type, item_id, item_name, details, production_id, production_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        action,
        itemType,
        itemId,
        itemName,
        details || null,
        productionId || null,
        productionName || null
      );
      
      logger.debug('Activity logged successfully');
    } catch (error) {
      logger.error({ err: error, action, itemType, itemId }, 'Error logging activity');
    }
  },

  getRecentActivity: async (limit: number = 20) => {
    logger.trace(`activityLogDb.getRecentActivity(${limit}) called`);
    try {
      const db = await getDb();
      const activities = await db.all(
        'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?',
        limit
      );
      
      logger.debug(`Retrieved ${activities.length} recent activities`);
      return activities;
    } catch (error) {
      logger.error({ err: error }, 'Error getting recent activity');
      return [];
    }
  }
};