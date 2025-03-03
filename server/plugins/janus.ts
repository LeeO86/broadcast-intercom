import { initJanus } from '~/server/utils/janus';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('plugins:janus');

export default defineNitroPlugin(async () => {
  logger.trace('Janus plugin initializing');
  try {
    // Initialize Janus connection
    const success = await initJanus();
    
    if (success) {
      logger.info('Janus plugin initialized successfully');
    } else {
      logger.error('Failed to initialize Janus plugin');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error initializing Janus plugin');
  }
});