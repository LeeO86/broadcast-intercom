import { getDb } from '../schema';
import { activityLogDb } from './activityLog';
import { DEFAULT_EMAIL_SUBJECT } from '~/types';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('database:emailTemplates');

// Email Templates
export const emailTemplatesDb = {
  getAll: async () => {
    logger.trace('emailTemplatesDb.getAll() called');
    try {
      const db = await getDb();
      const templates = await db.all(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        ORDER BY 
          t.is_default DESC, t.name ASC
      `);
      
      logger.debug(`Retrieved ${templates.length} email templates`);
      return templates;
    } catch (error) {
      logger.error({ err: error }, 'Error in getAll email templates');
      return [];
    }
  },
  
  getById: async (id: number) => {
    logger.trace(`emailTemplatesDb.getById(${id}) called`);
    try {
      const db = await getDb();
      const template = await db.get(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        WHERE 
          t.id = ?
      `, [id]);
      
      logger.debug({ id, found: !!template }, 'Email template lookup by ID');
      return template;
    } catch (error) {
      logger.error({ err: error, id }, 'Error in getById for email template');
      return undefined;
    }
  },
  
  getDefault: async () => {
    logger.trace('emailTemplatesDb.getDefault() called');
    try {
      const db = await getDb();
      const template = await db.get(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        WHERE 
          t.is_default = 1
      `);
      
      logger.debug({ found: !!template }, 'Default email template lookup');
      return template;
    } catch (error) {
      logger.error({ err: error }, 'Error in getDefault for email template');
      return undefined;
    }
  },
  
  create: async (name: string, description: string, subject: string, content: string) => {
    logger.trace(`emailTemplatesDb.create("${name}", "${description}") called`);
    try {
      const db = await getDb();
      
      logger.debug({ name, description, subject }, 'Creating new email template');
      const result = await db.run(
        'INSERT INTO email_templates (name, description, subject, content) VALUES (?, ?, ?, ?)',
        name,
        description,
        subject,
        content
      );
      
      logger.debug({ lastID: result.lastID }, 'Email template inserted, retrieving created record');
      const template = await db.get(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        WHERE 
          t.id = ?
      `, [result.lastID]);
      
      if (!template) {
        logger.error({ lastID: result.lastID }, 'Failed to retrieve created email template');
        throw new Error('Failed to retrieve created email template');
      }
      
      // Log activity
      try {
        await activityLogDb.logActivity(
          'created',
          'email_template',
          template.id,
          template.name,
          `Description: ${description}`
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log email template creation activity');
      }
      
      logger.info({ id: template.id, name: template.name }, 'Email template created successfully');
      return template;
    } catch (error) {
      logger.error({ err: error, name, description }, 'Error creating email template');
      throw error;
    }
  },
  
  update: async (id: number, name: string, description: string, subject: string, content: string) => {
    logger.trace(`emailTemplatesDb.update(${id}, "${name}", "${description}") called`);
    try {
      const db = await getDb();
      
      // Get original template for activity log
      const original = await db.get('SELECT * FROM email_templates WHERE id = ?', id);
      if (!original) {
        throw new Error('Email template not found');
      }
      
      logger.debug({ id, name, description, subject }, 'Updating email template');
      await db.run(
        'UPDATE email_templates SET name = ?, description = ?, subject = ?, content = ? WHERE id = ?',
        name,
        description,
        subject,
        content,
        id
      );
      
      const template = await db.get(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        WHERE 
          t.id = ?
      `, [id]);
      
      // Log activity
      try {
        await activityLogDb.logActivity(
          'updated',
          'email_template',
          id,
          name,
          `Changed from "${original.name}" to "${name}"`
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log email template update activity');
      }
      
      logger.info({ id, success: !!template }, 'Email template updated');
      return template;
    } catch (error) {
      logger.error({ err: error, id, name, description }, 'Error updating email template');
      throw error;
    }
  },
  
  updateContent: async (id: number, subject: string, content: string) => {
    logger.trace(`emailTemplatesDb.updateContent(${id}) called`);
    try {
      const db = await getDb();
      
      // Get original template for activity log
      const original = await db.get('SELECT * FROM email_templates WHERE id = ?', id);
      if (!original) {
        throw new Error('Email template not found');
      }
      
      logger.debug({ id, subject }, 'Updating email template content');
      await db.run(
        'UPDATE email_templates SET subject = ?, content = ? WHERE id = ?',
        subject,
        content,
        id
      );
      
      const template = await db.get(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        WHERE 
          t.id = ?
      `, [id]);
      
      // Log activity
      try {
        await activityLogDb.logActivity(
          'updated',
          'email_template',
          id,
          original.name,
          'Updated template content and subject'
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log email template content update activity');
      }
      
      logger.info({ id: template.id, name: template.name }, 'Email template content updated successfully');
      return template;
    } catch (error) {
      logger.error({ err: error, id }, 'Error updating email template content');
      throw error;
    }
  },
  
  setAsDefault: async (id: number) => {
    logger.trace(`emailTemplatesDb.setAsDefault(${id}) called`);
    try {
      const db = await getDb();
      
      // Get original template for activity log
      const original = await db.get('SELECT * FROM email_templates WHERE id = ?', id);
      if (!original) {
        throw new Error('Email template not found');
      }
      
      // Begin transaction
      await db.run('BEGIN TRANSACTION');
      
      try {
        // Clear default flag from all templates
        await db.run('UPDATE email_templates SET is_default = 0');
        
        // Set this template as default
        await db.run('UPDATE email_templates SET is_default = 1 WHERE id = ?', [id]);
        
        // Commit transaction
        await db.run('COMMIT');
      } catch (err) {
        // Rollback on error
        await db.run('ROLLBACK');
        throw err;
      }
      
      // Get the updated template
      const template = await db.get(`
        SELECT 
          t.*,
          (SELECT COUNT(*) FROM productions WHERE template_id = t.id) as usage_count
        FROM 
          email_templates t
        WHERE 
          t.id = ?
      `, [id]);
      
      // Log activity
      try {
        await activityLogDb.logActivity(
          'updated',
          'email_template',
          template.id,
          template.name,
          'Set as default email template'
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log email template set as default activity');
      }
      
      logger.info({ id: template.id, name: template.name }, 'Email template set as default successfully');
      return template;
    } catch (error) {
      logger.error({ err: error, id }, 'Error setting email template as default');
      throw error;
    }
  },
  
  delete: async (id: number) => {
    logger.trace(`emailTemplatesDb.delete(${id}) called`);
    try {
      const db = await getDb();
      
      // Get template for activity log
      const template = await db.get('SELECT * FROM email_templates WHERE id = ?', id);
      if (!template) {
        throw new Error('Email template not found');
      }
      
      // Check if template is default
      if (template.is_default) {
        throw new Error('Cannot delete the default template');
      }
      
      // Check if template is in use
      const usageCount = await db.get('SELECT COUNT(*) as count FROM productions WHERE template_id = ?', [id]);
      if (usageCount.count > 0) {
        throw new Error('Cannot delete a template that is in use');
      }
      
      // Delete template
      await db.run('DELETE FROM email_templates WHERE id = ?', [id]);
      
      // Log activity
      try {
        await activityLogDb.logActivity(
          'deleted',
          'email_template',
          id,
          template.name,
          `Deleted email template: ${template.description}`
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log email template deletion activity');
      }
      
      logger.info({ id, name: template.name }, 'Email template deleted successfully');
    } catch (error) {
      logger.error({ err: error, id }, 'Error deleting email template');
      throw error;
    }
  }
};