import { emailTemplatesDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:email-templates');

// GET /api/email-templates/:id - Get an email template by ID
export default defineEventHandler(async (event) => {
  logger.trace('GET /api/email-templates/:id called');
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      logger.warn({ id }, 'Invalid template ID');
      return { success: false, error: 'Invalid template ID' };
    }
    
    const template = await emailTemplatesDb.getById(id);
    if (!template) {
      logger.warn({ id }, 'Template not found');
      return { success: false, error: 'Template not found' };
    }
    
    logger.debug({ id, name: template.name }, 'Retrieved email template');
    return { success: true, data: template };
  } catch (error) {
    logger.error({ err: error, id: event.context.params?.id }, 'Error fetching email template');
    return { success: false, error: error.message || 'Failed to fetch email template' };
  }
});