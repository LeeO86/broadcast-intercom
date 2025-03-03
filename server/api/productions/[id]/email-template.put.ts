import { productionsDb } from '~/server/database';
import { z } from 'zod';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:productions');

// PUT /api/productions/:id/email-template - Update production email template
export default defineEventHandler(async (event) => {
  logger.trace('PUT /api/productions/:id/email-template called');
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
      email_template: z.string().min(1),
      email_subject: z.string().min(1).optional(),
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid input data');
      return { success: false, error: 'Invalid input data' };
    }
    
    const { email_template, email_subject } = result.data;
    
    // Check if production exists
    const existing = await productionsDb.getById(id);
    if (!existing) {
      logger.warn({ id }, 'Production not found');
      return { success: false, error: 'Production not found' };
    }
    
    // Update production email template
    const updated = await productionsDb.updateEmailTemplate(id, email_template, email_subject);
    
    logger.info({ id, success: !!updated }, 'Production email template updated');
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error, id: event.context.params?.id }, 'Error updating production email template');
    return { success: false, error: error.message || 'Failed to update production email template' };
  }
});