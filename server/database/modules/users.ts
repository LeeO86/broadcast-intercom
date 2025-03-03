import { getDb } from '../schema';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('database:users');

// Users
export const usersDb = {
  getAll: async () => {
    logger.trace('usersDb.getAll() called');
    try {
      const db = await getDb();
      const users = await db.all('SELECT * FROM users ORDER BY display_name');
      logger.debug(`Retrieved ${users.length} users`);
      return users;
    } catch (error) {
      logger.error({ err: error }, 'Error in getAll users');
      return [];
    }
  },

  getById: async (id: number) => {
    logger.trace(`usersDb.getById(${id}) called`);
    try {
      const db = await getDb();
      const user = await db.get('SELECT * FROM users WHERE id = ?', id);
      logger.debug({ id, found: !!user }, 'User lookup by ID');
      return user;
    } catch (error) {
      logger.error({ err: error, id }, 'Error in getById for user');
      return undefined;
    }
  },

  create: async (displayName: string) => {
    logger.trace(`usersDb.create("${displayName}") called`);
    const db = await getDb();
    try {
      logger.debug({ displayName }, 'Inserting new user');
      const result = await db.run(
        'INSERT INTO users (display_name) VALUES (?)',
        displayName
      );
      
      logger.debug({ lastID: result.lastID }, 'User inserted, retrieving created record');
      const user = await db.get(
        'SELECT * FROM users WHERE id = ?',
        result.lastID
      );

      if (!user) {
        logger.error({ lastID: result.lastID }, 'Failed to retrieve created user');
        throw new Error('Failed to retrieve created user');
      }

      logger.info({ id: user.id, displayName }, 'User created successfully');
      return user;
    } catch (error) {
      logger.error({ err: error, displayName }, 'Error creating user');
      throw error;
    }
  },

  update: async (
    id: number,
    displayName: string
  ) => {
    logger.trace(`usersDb.update(${id}, "${displayName}") called`);
    try {
      const db = await getDb();
      logger.debug({ id, displayName }, 'Updating user');
      await db.run(
        'UPDATE users SET display_name = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?',
        displayName,
        id
      );
      
      const user = await db.get('SELECT * FROM users WHERE id = ?', id);
      logger.info({ id, success: !!user }, 'User updated');
      return user;
    } catch (error) {
      logger.error({ err: error, id, displayName }, 'Error updating user');
      throw error;
    }
  },

  updateLastActive: async (id: number) => {
    logger.trace(`usersDb.updateLastActive(${id}) called`);
    try {
      const db = await getDb();
      logger.debug({ id }, 'Updating user last_active');
      await db.run(
        'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
        id
      );
      logger.debug({ id }, 'User last_active updated');
    } catch (error) {
      logger.error({ err: error, id }, 'Error updating last_active for user');
      throw error;
    }
  },

  delete: async (id: number) => {
    logger.trace(`usersDb.delete(${id}) called`);
    try {
      const db = await getDb();
      logger.debug({ id }, 'Deleting user');
      await db.run('DELETE FROM users WHERE id = ?', id);
      logger.info({ id }, 'User deleted');
    } catch (error) {
      logger.error({ err: error, id }, 'Error deleting user');
      throw error;
    }
  },
};