import { initializeDatabase } from '~/server/database/schema';
import { seedDatabase } from '~/server/utils/seed';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('plugins:database');

export default defineNitroPlugin(async () => {
  logger.trace('Database plugin initializing');
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Seed database with initial data if needed
    await seedDatabase();
    logger.info('Database seeding completed');
  } catch (error) {
    logger.error({ err: error }, 'Error initializing database plugin');
  }
});