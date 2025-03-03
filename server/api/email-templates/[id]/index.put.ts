import { emailTemplatesDb } from '~/server/database';
import { z } from 'zod';
import { createLogger } from '~/server/utils/logger';
import { DEFAULT_EMAIL_SUBJECT } from '~/types';

const logger = createLogger('api:email-templates');

// PUT /api/email-templates/:id - Update an email template
export default defineEventHandler(async (event) => {
  logger.trace('PUT /api/email-templates/:id called');
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      logger.warn({ id }, 'Invalid template ID');
      return { success: false, error: 'Invalid template ID' };
    }
    
    const body = await readBody(event);
    logger.debug({ id, body }, 'Received request body');
    
    // Validate input
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(255),
      subject: z.string().min(1).optional(),
      content: z.string().min(1),
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid input data');
      return { success: false, error: 'Invalid input data' };
    }
    
    const { name, description, content } = result.data;
    const subject = result.data.subject || DEFAULT_EMAIL_SUBJECT;
    
    // Check if template exists
    const existing = await emailTemplatesDb.getById(id);
    if (!existing) {
      logger.warn({ id }, 'Template not found');
      return { success: false, error: 'Template not found' };
    }
    
    // Check if template is default
    if (existing.is_default) {
      // For default template, only allow updating content and subject
      logger.debug({ id }, 'Updating default template (content and subject only)');
      const updated = await emailTemplatesDb.updateContent(id, subject, content);
      logger.info({ id, name: updated.name }, 'Default template content and subject updated');
      return { success: true, data: updated };
    }
    
    // Update template
    logger.debug({ id, name, description, subject }, 'Updating email template');
    const updated = await emailTemplatesDb.update(id, name, description, subject, content);
    
    logger.info({ id, name: updated.name }, 'Email template updated successfully');
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error, id: event.context.params?.id }, 'Error updating email template');
    return { success: false, error: error.message || 'Failed to update email template' };
  }
});