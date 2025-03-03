import { emailTemplatesDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:email-templates');

// DELETE /api/email-templates/:id - Delete an email template
export default defineEventHandler(async (event) => {
  logger.trace('DELETE /api/email-templates/:id called');
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
    
    // Check if template is default
    if (template.is_default) {
      logger.warn({ id, name: template.name }, 'Cannot delete default template');
      return { success: false, error: 'Cannot delete the default template' };
    }
    
    // Check if template is in use
    if (template.usage_count > 0) {
      logger.warn({ id, name: template.name, usageCount: template.usage_count }, 'Cannot delete template in use');
      return { success: false, error: 'Cannot delete a template that is in use' };
    }
    
    // Delete template
    logger.debug({ id, name: template.name }, 'Deleting email template');
    await emailTemplatesDb.delete(id);
    
    logger.info({ id, name: template.name }, 'Email template deleted successfully');
    return { success: true };
  } catch (error) {
    logger.error({ err: error, id: event.context.params?.id }, 'Error deleting email template');
    return { success: false, error: error.message || 'Failed to delete email template' };
  }
});