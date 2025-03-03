import { groupsDb } from '~/server/database';
import { z } from 'zod';
import { GroupUISettings } from '~/types';

// PUT /api/groups/:id/ui-settings - Update group UI settings
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid group ID' };
    }
    
    const body = await readBody(event);
    
    // Validate input
    const schema = z.object({
      button_style: z.enum(['round', 'square']).optional(),
      color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional()
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      return { success: false, error: 'Invalid input data' };
    }
    
    // Check if group exists
    const existing = await groupsDb.getById(id);
    if (!existing) {
      return { success: false, error: 'Group not found' };
    }
    
    // Merge existing UI settings with new UI settings
    const updatedUISettings: GroupUISettings = {
      ...existing.ui_settings,
      ...result.data
    };
    
    // Update group UI settings
    const updated = await groupsDb.updateUISettings(id, updatedUISettings);
    
    // Notify clients about the update
    const io = event.context.socketIO;
    if (io) {
      io.to(`group:${id}`).emit('group_updated', { groupId: id });
      
      // Also notify the production room since group changes affect the production
      if (existing.production_id) {
        io.to(`production:${existing.production_id}`).emit('production_updated', { productionId: existing.production_id });
      }
    }
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error(`Error updating group UI settings ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to update group UI settings' };
  }
});