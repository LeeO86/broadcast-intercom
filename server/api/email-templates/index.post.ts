import { emailTemplatesDb } from '~/server/database';
import { z } from 'zod';
import { createLogger } from '~/server/utils/logger';
import { DEFAULT_EMAIL_SUBJECT } from '~/types';

const logger = createLogger('api:email-templates');

// POST /api/email-templates - Create a new email template
export default defineEventHandler(async (event) => {
  logger.trace('POST /api/email-templates called');
  try {
    const body = await readBody(event);
    logger.debug({ body }, 'Received request body');
    
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
    
    // Create email template
    logger.debug({ name, description, subject }, 'Creating new email template');
    const template = await emailTemplatesDb.create(name, description, subject, content);
    
    logger.info({ id: template.id, name: template.name }, 'Email template created successfully');
    return { success: true, data: template };
  } catch (error) {
    logger.error({ err: error }, 'Error creating email template');
    return { success: false, error: error.message || 'Failed to create email template' };
  }
});