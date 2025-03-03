import { emailTemplatesDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:email-templates');

// PUT /api/email-templates/:id/default - Set an email template as default
export default defineEventHandler(async (event) => {
  logger.trace('PUT /api/email-templates/:id/default called');
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      logger.warn({ id }, 'Invalid template ID');
      return { success: false, error: 'Invalid template ID' };
    }
    
    // Check if template exists
    const template = await emailTemplatesDb.getById(id);
    if (!template) {
      logger.warn({ id }, 'Template not found');
      return { success: false, error: 'Template not found' };
    }
    
    // Check if template is already default
    if (template.is_default) {
      logger.info({ id, name: template.name }, 'Template is already default');
      return { success: true, data: template };
    }
    
    // Set as default
    logger.debug({ id, name: template.name }, 'Setting email template as default');
    const updated = await emailTemplatesDb.setAsDefault(id);
    
    logger.info({ id, name: updated.name }, 'Email template set as default successfully');
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error, id: event.context.params?.id }, 'Error setting email template as default');
    return { success: false, error: error.message || 'Failed to set email template as default' };
  }
});