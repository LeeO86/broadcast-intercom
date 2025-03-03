import { productionsDb } from '~/server/database';

// GET /api/productions/:id - Get a production by ID
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid production ID' };
    }
    
    const production = await productionsDb.getWithGroups(id);
    if (!production) {
      return { success: false, error: 'Production not found' };
    }
    
    return { success: true, data: production };
  } catch (error: any) {
    console.error(`Error fetching production ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to fetch production' };
  }
});