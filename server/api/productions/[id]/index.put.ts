import { productionsDb } from '~/server/database';
import { z } from 'zod';

// PUT /api/productions/:id - Update a production
export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0');
    if (isNaN(id) || id <= 0) {
      return { success: false, error: 'Invalid production ID' };
    }
    
    const body = await readBody(event);
    
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
      return { success: false, error: result.error.errors[0]?.message || 'Invalid input data' };
    }
    
    const { name, access_code } = result.data;
    
    // Check if production exists
    const existing = await productionsDb.getById(id);
    if (!existing) {
      return { success: false, error: 'Production not found' };
    }
    
    // Check if access code is already in use by another production
    const existingWithCode = await productionsDb.getByCode(access_code);
    if (existingWithCode && existingWithCode.id !== id) {
      return { success: false, error: 'Access code already in use' };
    }
    
    // Update production
    const updated = await productionsDb.update(id, name, access_code);
    
    // Notify clients about the update
    const io = event.context.socketIO;
    if (io) {
      io.to(`production:${id}`).emit('production_updated', { productionId: id });
    }
    
    return { success: true, data: updated };
  } catch (error: any) {
    console.error(`Error updating production ${event.context.params?.id}:`, error);
    return { success: false, error: error.message || 'Failed to update production' };
  }
});