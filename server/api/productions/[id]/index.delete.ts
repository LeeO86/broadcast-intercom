import { productionsDb } from '~/server/database';

// DELETE /api/productions/:id - Delete a production
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid production ID' };
    }
    
    // Check if production exists
    const existing = await productionsDb.getById(id);
    if (!existing) {
      return { success: false, error: 'Production not found' };
    }
    
    // Delete production
    await productionsDb.delete(id);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting production ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to delete production' };
  }
});