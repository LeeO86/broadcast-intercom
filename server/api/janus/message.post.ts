// POST /api/janus/message - Send a message to a Janus handle
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    if (!body.handleId) {
      return { success: false, error: 'Handle ID is required' };
    }
    
    if (!body.message) {
      return { success: false, error: 'Message is required' };
    }
    
    // Import dynamically to avoid circular dependencies
    const { getHandle } = await import('~/server/utils/janus');
    
    // Get the handle by ID
    const handle = await getHandle('', body.handleId);
    
    // Send the message
    const response = await handle.sendWithTransaction(body.message);
    
    return { success: true, data: response };
  } catch (error: any) {
    console.error('Error sending Janus message:', error);
    return { success: false, error: error.message || 'Failed to send Janus message' };
  }
});