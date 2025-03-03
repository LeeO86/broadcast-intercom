import { productionsDb } from '~/server/database';

// GET /api/productions/code/:code - Get a production by access code
export default defineEventHandler(async (event) => {
  try {
    const code = event.context.params?.code;
    if (!code) {
      return { success: false, error: 'Access code is required' };
    }
    
    const production = await productionsDb.getWithGroupsByCode(code);
    if (!production) {
      return { success: false, error: 'Production not found' };
    }
    
    return { success: true, data: production };
  } catch (error: any) {
    console.error(`Error fetching production with code ${event.context.params?.code}:`, error);
    return { success: false, error: error.message || 'Failed to fetch production' };
  }
});