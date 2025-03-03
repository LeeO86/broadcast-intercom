import { groupsDb, productionsDb } from '~/server/database';

// GET /api/groups/production/:id - Get all groups for a production
export default defineEventHandler(async (event) => {
  try {
    const productionId = parseInt(event.context.params?.id || '0');
    if (isNaN(productionId) || productionId <= 0) {
      return { success: false, error: 'Invalid production ID' };
    }
    
    // Check if production exists
    const production = await productionsDb.getById(productionId);
    if (!production) {
      return { success: false, error: 'Production not found' };
    }
    
    const groups = await groupsDb.getByProductionId(productionId);
    
    return { success: true, data: groups };
  } catch (error: any) {
    console.error(`Error fetching groups for production ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to fetch groups' };
  }
});