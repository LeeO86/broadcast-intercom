import { emailTemplatesDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:email-templates');

// GET /api/email-templates - Get all email templates
export default defineEventHandler(async (event) => {
  logger.trace('GET /api/email-templates called');
  try {
    const templates = await emailTemplatesDb.getAll();
    logger.debug(`Retrieved ${templates.length} email templates`);
    return { success: true, data: templates };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching email templates');
    return { success: false, error: error.message || 'Failed to fetch email templates' };
  }
});