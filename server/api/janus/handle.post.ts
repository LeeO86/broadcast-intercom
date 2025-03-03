// POST /api/janus/handle - Create a new Janus handle
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    if (!body.plugin) {
      return { success: false, error: 'Plugin name is required' };
    }
    
    // Import dynamically to avoid circular dependencies
    const { getHandle } = await import('~/server/utils/janus');
    const handle = await getHandle(body.plugin, body.id);
    
    return { 
      success: true, 
      data: { 
        handleId: handle.id 
      } 
    };
  } catch (error: any) {
    console.error('Error creating Janus handle:', error);
    return { success: false, error: error.message || 'Failed to create Janus handle' };
  }
});