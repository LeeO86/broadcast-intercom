// POST /api/janus/trickle - Send trickle ICE candidates to a Janus handle
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    if (!body.handleId) {
      return { success: false, error: 'Handle ID is required' };
    }
    
    // Import dynamically to avoid circular dependencies
    const { getHandle } = await import('~/server/utils/janus');
    
    // Get the handle by ID
    const handle = await getHandle('', body.handleId);
    
    // Send the trickle candidate
    await handle.sendTrickle(body.candidate);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error sending trickle ICE candidate:', error);
    return { success: false, error: error.message || 'Failed to send trickle ICE candidate' };
  }
});