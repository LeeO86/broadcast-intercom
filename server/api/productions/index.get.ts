import { productionsDb } from '~/server/database';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('api:productions');

// GET /api/productions - Get all productions
export default defineEventHandler(async (event) => {
  logger.trace('GET /api/productions called');
  try {
    const productions = await productionsDb.getAll();
    logger.debug(`Retrieved ${productions.length} productions`);
    return { success: true, data: productions };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching productions');
    return { success: false, error: error.message || 'Failed to fetch productions' };
  }
});