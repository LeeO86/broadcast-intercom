import { groupsDb } from '~/server/database';

// GET /api/groups/:id - Get a group by ID
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid group ID' };
    }
    
    const group = await groupsDb.getById(id);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }
    
    return { success: true, data: group };
  } catch (error: any) {
    console.error(`Error fetching group ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to fetch group' };
  }
});