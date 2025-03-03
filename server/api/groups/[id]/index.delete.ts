import { groupsDb } from '~/server/database';

// DELETE /api/groups/:id - Delete a group
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid group ID' };
    }
    
    // Check if group exists
    const existing = await groupsDb.getById(id);
    if (!existing) {
      return { success: false, error: 'Group not found' };
    }
    
    // Store production ID for notification after deletion
    const productionId = existing.production_id;
    
    // Delete group
    await groupsDb.delete(id);
    
    // Notify clients about the deletion
    const io = event.context.socketIO;
    if (io && productionId) {
      io.to(`production:${productionId}`).emit('production_updated', { productionId });
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting group ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to delete group' };
  }
});