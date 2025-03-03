import { groupsDb } from '~/server/database';
import { z } from 'zod';
import { GroupType } from '~/types';

// PUT /api/groups/:id - Update a group
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid group ID' };
    }
    
    const body = await readBody(event);
    
    // Validate input
    const schema = z.object({
      name: z.string().min(1).max(100),
      settings: z.object({
        noise_suppression: z.boolean().optional(),
        echo_cancellation: z.boolean().optional(),
        auto_gain_control: z.boolean().optional(),
        audio_level_events: z.boolean().optional(),
        comfort_noise: z.boolean().optional(),
        muted_by_default: z.boolean().optional()
      }).optional(),
      ui_settings: z.object({
        button_style: z.enum(['round', 'square']).optional(),
        color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional()
      }).optional(),
      type: z.enum([GroupType.INTERCOM, GroupType.PROGRAM]).optional()
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      return { success: false, error: 'Invalid input data' };
    }
    
    const { name, settings, ui_settings, type } = result.data;
    
    // Check if group exists
    const existing = await groupsDb.getById(id);
    if (!existing) {
      return { success: false, error: 'Group not found' };
    }
    
    // Update group
    const updated = await groupsDb.update(id, name, settings, ui_settings, type);
    
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
    console.error(`Error updating group ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to update group' };
  }
});