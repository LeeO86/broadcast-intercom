import { Database } from 'sqlite';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { DEFAULT_GROUP_SETTINGS, DEFAULT_GROUP_UI_SETTINGS, DEFAULT_EMAIL_TEMPLATE, DEFAULT_EMAIL_SUBJECT, GroupType } from '~/types';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('database:schema');

// Database instance
let db: Database | null = null;

// Initialize database
export async function initializeDatabase() {
  logger.trace('initializeDatabase() called');
  try {
    if (db) {
      logger.debug('Database already initialized');
      return db;
    }
    
    logger.debug('Opening database connection');
    db = await open({
      filename: 'data/intercom.db',
      driver: sqlite3.Database,
    });
    
    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    // Create tables if they don't exist
    logger.debug('Creating tables if they don\'t exist');
    
    // Productions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS productions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        access_code TEXT NOT NULL UNIQUE,
        template_id INTEGER,
        email_template TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Groups table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        production_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        janus_room_id INTEGER NOT NULL,
        settings TEXT,
        ui_settings TEXT,
        type TEXT DEFAULT '${GroupType.INTERCOM}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (production_id) REFERENCES productions(id) ON DELETE CASCADE
      )
    `);
    
    // Email templates table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create triggers for changed_at
    logger.debug('Creating triggers for changed_at');
    
    // Productions trigger
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_productions_changed_at
      AFTER UPDATE ON productions
      BEGIN
        UPDATE productions SET changed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    
    // Groups trigger
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_groups_changed_at
      AFTER UPDATE ON groups
      BEGIN
        UPDATE groups SET changed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    
    // Email templates trigger
    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_email_templates_changed_at
      AFTER UPDATE ON email_templates
      BEGIN
        UPDATE email_templates SET changed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `);
    
    // Check if email_templates table has subject column
    logger.debug('Checking email_templates table schema');
    const emailTemplatesColumns = await db.all('PRAGMA table_info(email_templates)');
    if (!emailTemplatesColumns.some(col => col.name === 'subject')) {
      logger.info('Adding subject column to email_templates table');
      await db.exec('ALTER TABLE email_templates ADD COLUMN subject TEXT');
      
      // Update existing templates with default subject
      await db.exec(`UPDATE email_templates SET subject = '${DEFAULT_EMAIL_SUBJECT}'`);
    }
    
    // Check if we need to create a default email template
    logger.debug('Checking for default email template');
    const defaultTemplate = await db.get('SELECT * FROM email_templates WHERE is_default = 1');
    if (!defaultTemplate) {
      logger.info('Creating default email template');
      await db.run(`
        INSERT INTO email_templates (name, description, subject, content, is_default)
        VALUES (?, ?, ?, ?, 1)
      `, 
      'Default Template', 
      'Default email template for inviting users to productions',
      DEFAULT_EMAIL_SUBJECT,
      DEFAULT_EMAIL_TEMPLATE
      );
    }
    
    // Check if productions table has template_id column
    logger.debug('Checking productions table schema');
    const productionsColumns = await db.all('PRAGMA table_info(productions)');
    if (productionsColumns.length > 0) {
      // Table exists, check for template_id column
      if (!productionsColumns.some(col => col.name === 'template_id')) {
        logger.info('Adding template_id column to productions table');
        await db.exec('ALTER TABLE productions ADD COLUMN template_id INTEGER DEFAULT NULL');
      }
      
      // Check for created_at and changed_at columns
      if (!productionsColumns.some(col => col.name === 'created_at')) {
        logger.info('Adding created_at column to productions table');
        await db.exec('ALTER TABLE productions ADD COLUMN created_at TEXT DEFAULT NULL');
        await db.exec('UPDATE productions SET created_at = CURRENT_TIMESTAMP');
      }
      if (!productionsColumns.some(col => col.name === 'changed_at')) {
        logger.info('Adding changed_at column to productions table');
        await db.exec('ALTER TABLE productions ADD COLUMN changed_at TEXT DEFAULT NULL');
        await db.exec('UPDATE productions SET changed_at = CURRENT_TIMESTAMP');
      }
    }
    
    // Check if groups table has the required columns
    logger.debug('Checking groups table schema');
    const groupsColumns = await db.all('PRAGMA table_info(groups)');
    if (groupsColumns.length > 0) {
      // Table exists, check for created_at and changed_at columns
      if (!groupsColumns.some(col => col.name === 'created_at')) {
        logger.info('Adding created_at column to groups table');
        await db.exec('ALTER TABLE groups ADD COLUMN created_at TEXT DEFAULT NULL');
        await db.exec('UPDATE groups SET created_at = CURRENT_TIMESTAMP');
      }
      if (!groupsColumns.some(col => col.name === 'changed_at')) {
        logger.info('Adding changed_at column to groups table');
        await db.exec('ALTER TABLE groups ADD COLUMN changed_at TEXT DEFAULT NULL');
        await db.exec('UPDATE groups SET changed_at = CURRENT_TIMESTAMP');
      }
      
      // Check for type column
      if (!groupsColumns.some(col => col.name === 'type')) {
        logger.info('Adding type column to groups table');
        await db.exec(`ALTER TABLE groups ADD COLUMN type TEXT DEFAULT '${GroupType.INTERCOM}'`);
        await db.exec(`UPDATE groups SET type = '${GroupType.INTERCOM}'`);
      }
    }
    
    // Check if activity_log table exists
    logger.debug('Checking if activity_log table exists');
    const activityLogExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_log'");
    if (!activityLogExists) {
      logger.info('Creating activity_log table');
      await db.exec(`
        CREATE TABLE activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_id INTEGER NOT NULL,
          item_name TEXT NOT NULL,
          details TEXT,
          production_id INTEGER,
          production_name TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Drop users table if it exists
    logger.debug('Checking if users table exists to drop it');
    const usersTableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (usersTableExists) {
      logger.info('Dropping users table');
      await db.exec('DROP TABLE IF EXISTS users');
    }
    
    logger.debug('Schema check and update completed');
  } catch (error) {
    logger.error({ err: error }, 'Error checking and updating schema');
    throw error;
  }
}

// Get database instance
export async function getDb() {
  if (!db) {
    logger.trace('getDb() called, initializing database');
    await initializeDatabase();
  }
  return db;
}

// Export database instance
export default { getDb };