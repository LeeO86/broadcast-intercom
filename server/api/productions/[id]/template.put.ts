import { productionsDb, emailTemplatesDb } from '~/server/database';
import { z } from 'zod';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:productions');

// PUT /api/productions/:id/template - Update production email template
export default defineEventHandler(async (event) => {
  logger.trace('PUT /api/productions/:id/template called');
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      logger.warn({ id }, 'Invalid production ID');
      return { success: false, error: 'Invalid production ID' };
    }
    
    const body = await readBody(event);
    logger.debug({ id, body }, 'Received request body');
    
    // Validate input
    const schema = z.object({
      template_id: z.number().int().positive(),
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid input data');
      return { success: false, error: 'Invalid input data' };
    }
    
    const { template_id } = result.data;
    
    // Check if production exists
    const production = await productionsDb.getById(id);
    if (!production) {
      logger.warn({ id }, 'Production not found');
      return { success: false, error: 'Production not found' };
    }
    
    // Check if template exists
    const template = await emailTemplatesDb.getById(template_id);
    if (!template) {
      logger.warn({ template_id }, 'Email template not found');
      return { success: false, error: 'Email template not found' };
    }
    
    // Update production with template ID
    logger.debug({ id, template_id }, 'Updating production template');
    const updated = await productionsDb.updateEmailTemplate(id, template_id);
    
    logger.info({ id, template_id, templateName: template.name }, 'Production email template updated successfully');
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error, id: event.context.params?.id }, 'Error updating production template');
    return { success: false, error: error.message || 'Failed to update production template' };
  }
});