import { getDb } from '../schema';
import { activityLogDb } from './activityLog';
import { emailTemplatesDb } from './emailTemplates';
import { deleteAudioRoom } from '~/server/utils/janus';
import { Production, ProductionWithGroups, DEFAULT_EMAIL_TEMPLATE } from '~/types';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('database:productions');

// Productions
export const productionsDb = {
  getAll: async (): Promise<Production[]> => {
    logger.trace('productionsDb.getAll() called');
    try {
      const db = await getDb();
      const productions = await db.all('SELECT * FROM productions ORDER BY created_at DESC');
      logger.debug(`Retrieved ${productions.length} productions`);
      return productions;
    } catch (error) {
      logger.error({ err: error }, 'Error in getAll productions');
      return [];
    }
  },

  getByCode: async (code: string): Promise<Production | undefined> => {
    logger.trace(`productionsDb.getByCode(${code}) called`);
    try {
      const db = await getDb();
      const production = await db.get(
        'SELECT * FROM productions WHERE access_code = ?',
        code
      );
      logger.debug({ found: !!production }, `Production lookup by code: ${code}`);
      return production;
    } catch (error) {
      logger.error({ err: error, code }, 'Error in getByCode');
      return undefined;
    }
  },

  getById: async (id: number): Promise<Production | undefined> => {
    logger.trace(`productionsDb.getById(${id}) called`);
    try {
      const db = await getDb();
      const production = await db.get('SELECT * FROM productions WHERE id = ?', id);
      logger.debug({ found: !!production }, `Production lookup by id: ${id}`);
      return production;
    } catch (error) {
      logger.error({ err: error, id }, 'Error in getById');
      return undefined;
    }
  },

  create: async (name: string, accessCode: string, emailTemplate: string = DEFAULT_EMAIL_TEMPLATE): Promise<Production> => {
    logger.trace(`productionsDb.create("${name}", "${accessCode}") called`);
    const db = await getDb();
    try {
      // Get default email template
      const defaultTemplate = await emailTemplatesDb.getDefault();
      const templateId = defaultTemplate ? defaultTemplate.id : null;
      
      logger.debug({ name, accessCode, templateId }, 'Inserting new production');
      const result = await db.run(
        'INSERT INTO productions (name, access_code, template_id) VALUES (?, ?, ?)',
        name,
        accessCode,
        templateId
      );
      
      logger.debug({ lastID: result.lastID }, 'Production inserted, retrieving created record');
      const production = await db.get(
        'SELECT * FROM productions WHERE id = ?',
        result.lastID
      );

      if (!production) {
        logger.error({ lastID: result.lastID }, 'Failed to retrieve created production');
        throw new Error('Failed to retrieve created production');
      }

      // Log activity
      try {
        await activityLogDb.logActivity(
          'created',
          'production',
          production.id,
          production.name,
          `Access code: ${production.access_code}`
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log production creation activity');
      }

      logger.info({ id: production.id, name: production.name }, 'Production created successfully');
      return production;
    } catch (error) {
      logger.error({ err: error, name, accessCode }, 'Error creating production');
      throw error;
    }
  },

  update: async (
    id: number,
    name: string,
    accessCode: string,
    templateId?: number
  ): Promise<Production | undefined> => {
    logger.trace(`productionsDb.update(${id}, "${name}", "${accessCode}") called`);
    try {
      const db = await getDb();
      
      // Get original production for activity log
      const original = await db.get('SELECT * FROM productions WHERE id = ?', id);
      if (!original) {
        throw new Error('Production not found');
      }
      
      // Prepare update fields and values
      let updateFields = ['name = ?', 'access_code = ?'];
      let updateValues = [name, accessCode];
      
      // Add template ID if provided
      if (templateId !== undefined) {
        updateFields.push('template_id = ?');
        updateValues.push(templateId);
      }
      
      // Add ID as the last parameter
      updateValues.push(id);
      
      logger.debug({ id, name, accessCode, templateId }, 'Updating production');
      await db.run(
        `UPDATE productions SET ${updateFields.join(', ')} WHERE id = ?`,
        ...updateValues
      );
      
      const production = await db.get('SELECT * FROM productions WHERE id = ?', id);
      
      // Log activity
      try {
        let details = `Changed from "${original.name}" (${original.access_code}) to "${name}" (${accessCode})`;
        if (templateId !== undefined) {
          details += ' with updated email template';
        }
        
        await activityLogDb.logActivity(
          'updated',
          'production',
          id,
          name,
          details
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log production update activity');
      }
      
      logger.info({ id, success: !!production }, 'Production updated');
      return production;
    } catch (error) {
      logger.error({ err: error, id, name, accessCode }, 'Error updating production');
      throw error;
    }
  },

  updateEmailTemplate: async (
    id: number,
    templateId: number
  ): Promise<Production | undefined> => {
    logger.trace(`productionsDb.updateEmailTemplate(${id}, ${templateId}) called`);
    try {
      const db = await getDb();
      
      // Get original production for activity log
      const original = await db.get('SELECT * FROM productions WHERE id = ?', id);
      if (!original) {
        throw new Error('Production not found');
      }
      
      // Check if template exists
      const template = await emailTemplatesDb.getById(templateId);
      if (!template) {
        throw new Error('Email template not found');
      }
      
      logger.debug({ id, templateId }, 'Updating production email template');
      await db.run(
        'UPDATE productions SET template_id = ? WHERE id = ?',
        templateId,
        id
      );
      
      const production = await db.get('SELECT * FROM productions WHERE id = ?', id);
      
      // Log activity
      try {
        await activityLogDb.logActivity(
          'updated',
          'production',
          id,
          original.name,
          `Updated email template to "${template.name}"`
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log production email template update activity');
      }
      
      logger.info({ id, success: !!production }, 'Production email template updated');
      return production;
    } catch (error) {
      logger.error({ err: error, id, templateId }, 'Error updating production email template');
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    logger.trace(`productionsDb.delete(${id}) called`);
    try {
      const db = await getDb();
      
      // Get production details before deletion for activity log
      const production = await db.get('SELECT * FROM productions WHERE id = ?', id);
      if (!production) {
        throw new Error('Production not found');
      }
      
      // Get all groups for this production to clean up Janus rooms
      const groups = await db.all('SELECT * FROM groups WHERE production_id = ?', id);
      
      // Store production details for logging after deletion
      const prodName = production.name;
      const prodAccessCode = production.access_code;
      
      logger.debug({ id }, 'Deleting production');
      await db.run('DELETE FROM productions WHERE id = ?', id);
      
      // Clean up Janus rooms for all groups in this production
      for (const group of groups) {
        try {
          logger.debug({ roomId: group.janus_room_id, groupName: group.name }, 'Cleaning up Janus room for deleted production');
          await deleteAudioRoom(group.janus_room_id);
          logger.info({ roomId: group.janus_room_id, groupName: group.name }, 'Deleted Janus room for group in deleted production');
        } catch (janusError) {
          logger.error({ err: janusError, roomId: group.janus_room_id, groupName: group.name }, 'Failed to delete Janus room for group in deleted production');
        }
      }
      
      // Log activity after deletion
      try {
        await activityLogDb.logActivity(
          'deleted',
          'production',
          id,
          prodName,
          `Access code: ${prodAccessCode}`
        );
        logger.info({ id, name: prodName }, 'Production deletion activity logged');
      } catch (logError) {
        logger.error({ err: logError, id, name: prodName }, 'Failed to log production deletion activity');
      }
      
      logger.info({ id }, 'Production deleted');
    } catch (error) {
      logger.error({ err: error, id }, 'Error deleting production');
      throw error;
    }
  },

  getWithGroups: async (
    id: number
  ): Promise<ProductionWithGroups | undefined> => {
    logger.trace(`productionsDb.getWithGroups(${id}) called`);
    try {
      const db = await getDb();
      const production = await db.get(
        'SELECT * FROM productions WHERE id = ?',
        id
      );

      if (!production) {
        logger.debug({ id }, 'Production not found');
        return undefined;
      }

      const groupsData = await db.all(
        'SELECT * FROM groups WHERE production_id = ?',
        id
      );
      
      // Parse JSON settings for each group
      const groups = groupsData.map(group => {
        try {
          // Parse settings or use defaults
          const settings = group.settings 
            ? JSON.parse(group.settings) 
            : DEFAULT_GROUP_SETTINGS;
          
          // Parse UI settings or use defaults
          const uiSettings = group.ui_settings 
            ? JSON.parse(group.ui_settings) 
            : DEFAULT_GROUP_UI_SETTINGS;
          
          return {
            ...group,
            settings,
            ui_settings: uiSettings
          };
        } catch (err) {
          logger.error({ err, groupId: group.id }, 'Error parsing group settings');
          return {
            ...group,
            settings: DEFAULT_GROUP_SETTINGS,
            ui_settings: DEFAULT_GROUP_UI_SETTINGS
          };
        }
      });
      
      // Get email template
      let emailTemplate = DEFAULT_EMAIL_TEMPLATE;
      if (production.template_id) {
        const template = await emailTemplatesDb.getById(production.template_id);
        if (template) {
          emailTemplate = template.content;
        }
      }

      logger.debug({ id, groupCount: groups.length }, 'Retrieved production with groups');
      return {
        ...production,
        groups,
        email_template: emailTemplate
      };
    } catch (error) {
      logger.error({ err: error, id }, 'Error in getWithGroups');
      return undefined;
    }
  },

  getWithGroupsByCode: async (
    code: string
  ): Promise<ProductionWithGroups | undefined> => {
    logger.trace(`productionsDb.getWithGroupsByCode("${code}") called`);
    try {
      const db = await getDb();
      const production = await db.get(
        'SELECT * FROM productions WHERE access_code = ?',
        code
      );

      if (!production) {
        logger.debug({ code }, 'Production not found by code');
        return undefined;
      }

      const groupsData = await db.all(
        'SELECT * FROM groups WHERE production_id = ?',
        production.id
      );
      
      // Parse JSON settings for each group
      const groups = groupsData.map(group => {
        try {
          // Parse settings or use defaults
          const settings = group.settings 
            ? JSON.parse(group.settings) 
            : DEFAULT_GROUP_SETTINGS;
          
          // Parse UI settings or use defaults
          const uiSettings = group.ui_settings 
            ? JSON.parse(group.ui_settings) 
            : DEFAULT_GROUP_UI_SETTINGS;
          
          return {
            ...group,
            settings,
            ui_settings: uiSettings
          };
        } catch (err) {
          logger.error({ err, groupId: group.id }, 'Error parsing group settings');
          return {
            ...group,
            settings: DEFAULT_GROUP_SETTINGS,
            ui_settings: DEFAULT_GROUP_UI_SETTINGS
          };
        }
      });
      
      // Get email template
      let emailTemplate = DEFAULT_EMAIL_TEMPLATE;
      if (production.template_id) {
        const template = await emailTemplatesDb.getById(production.template_id);
        if (template) {
          emailTemplate = template.content;
        }
      }

      logger.debug({ code, id: production.id, groupCount: groups.length }, 'Retrieved production with groups by code');
      return {
        ...production,
        groups,
        email_template: emailTemplate
      };
    } catch (error) {
      logger.error({ err: error, code }, 'Error in getWithGroupsByCode');
      return undefined;
    }
  }
};