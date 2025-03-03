import { productionsDb } from '~/server/database';
import { z } from 'zod';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:productions');

// POST /api/productions - Create a new production
export default defineEventHandler(async (event) => {
  logger.trace('POST /api/productions called');
  try {
    const body = await readBody(event);
    logger.debug({ body }, 'Received request body');
    
    // Validate input
    const schema = z.object({
      name: z.string().min(1).max(100),
      access_code: z.string()
        .min(16, "Access code must be at least 16 characters long")
        .max(64, "Access code must be at most 64 characters long")
        .regex(/\d/, "Access code must contain at least one number"),
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid input data');
      return { success: false, error: result.error.errors[0]?.message || 'Invalid input data' };
    }
    
    const { name, access_code } = result.data;
    
    // Check if access code already exists
    const existing = await productionsDb.getByCode(access_code);
    if (existing) {
      logger.warn({ access_code }, 'Access code already in use');
      return { success: false, error: 'Access code already in use' };
    }
    
    // Create production
    logger.debug({ name, access_code }, 'Creating new production');
    const production = await productionsDb.create(name, access_code);
    
    if (!production) {
      logger.error('Failed to create production, no result returned');
      return { success: false, error: 'Failed to create production' };
    }
    
    logger.info({ id: production.id, name: production.name }, 'Production created successfully');
    return { success: true, data: production };
  } catch (error) {
    logger.error({ err: error }, 'Error creating production');
    return { success: false, error: error.message || 'Failed to create production' };
  }
});