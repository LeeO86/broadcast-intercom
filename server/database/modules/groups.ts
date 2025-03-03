import { getDb } from '../schema';
import { activityLogDb } from './activityLog';
import { deleteAudioRoom } from '~/server/utils/janus';
import { Group, GroupSettings, GroupUISettings, DEFAULT_GROUP_SETTINGS, DEFAULT_GROUP_UI_SETTINGS, GroupType } from '~/types';
import { createLogger } from '~/server/utils/logger';

const logger = createLogger('database:groups');

// Groups
export const groupsDb = {
  getAll: async (): Promise<Group[]> => {
    logger.trace('groupsDb.getAll() called');
    try {
      const db = await getDb();
      const groupsData = await db.all('SELECT * FROM groups');
      
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
            ui_settings: uiSettings,
            type: group.type || GroupType.INTERCOM
          };
        } catch (err) {
          logger.error({ err, groupId: group.id }, 'Error parsing group settings');
          return {
            ...group,
            settings: DEFAULT_GROUP_SETTINGS,
            ui_settings: DEFAULT_GROUP_UI_SETTINGS,
            type: group.type || GroupType.INTERCOM
          };
        }
      });
      
      logger.debug(`Retrieved ${groups.length} groups`);
      return groups;
    } catch (error) {
      logger.error({ err: error }, 'Error in getAll groups');
      return [];
    }
  },

  getByProductionId: async (productionId: number): Promise<Group[]> => {
    logger.trace(`groupsDb.getByProductionId(${productionId}) called`);
    try {
      const db = await getDb();
      const groupsData = await db.all(
        'SELECT * FROM groups WHERE production_id = ?',
        productionId
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
            ui_settings: uiSettings,
            type: group.type || GroupType.INTERCOM
          };
        } catch (err) {
          logger.error({ err, groupId: group.id }, 'Error parsing group settings');
          return {
            ...group,
            settings: DEFAULT_GROUP_SETTINGS,
            ui_settings: DEFAULT_GROUP_UI_SETTINGS,
            type: group.type || GroupType.INTERCOM
          };
        }
      });
      
      logger.debug({ productionId, count: groups.length }, 'Retrieved groups by production ID');
      return groups;
    } catch (error) {
      logger.error({ err: error, productionId }, 'Error in getByProductionId');
      return [];
    }
  },

  getById: async (id: number): Promise<Group | undefined> => {
    logger.trace(`groupsDb.getById(${id}) called`);
    try {
      const db = await getDb();
      const group = await db.get('SELECT * FROM groups WHERE id = ?', id);
      
      if (!group) {
        logger.debug({ id, found: false }, 'Group lookup by ID');
        return undefined;
      }
      
      try {
        // Parse settings or use defaults
        const settings = group.settings 
          ? JSON.parse(group.settings) 
          : DEFAULT_GROUP_SETTINGS;
        
        // Parse UI settings or use defaults
        const uiSettings = group.ui_settings 
          ? JSON.parse(group.ui_settings) 
          : DEFAULT_GROUP_UI_SETTINGS;
        
        const result = {
          ...group,
          settings,
          ui_settings: uiSettings,
          type: group.type || GroupType.INTERCOM
        };
        
        logger.debug({ id, found: true }, 'Group lookup by ID');
        return result;
      } catch (err) {
        logger.error({ err, groupId: group.id }, 'Error parsing group settings');
        return {
          ...group,
          settings: DEFAULT_GROUP_SETTINGS,
          ui_settings: DEFAULT_GROUP_UI_SETTINGS,
          type: group.type || GroupType.INTERCOM
        };
      }
    } catch (error) {
      logger.error({ err: error, id }, 'Error in getById for group');
      return undefined;
    }
  },

  create: async (
    productionId: number,
    name: string,
    janusRoomId: number,
    settings: GroupSettings = DEFAULT_GROUP_SETTINGS,
    uiSettings: GroupUISettings = DEFAULT_GROUP_UI_SETTINGS,
    type: GroupType = GroupType.INTERCOM
  ): Promise<Group> => {
    logger.trace(`groupsDb.create(${productionId}, "${name}", ${janusRoomId}, type=${type}) called`);
    const db = await getDb();
    try {
      // Get production name for activity log
      const production = await db.get('SELECT name FROM productions WHERE id = ?', productionId);
      if (!production) {
        throw new Error('Production not found');
      }
      
      // Stringify settings objects
      const settingsJson = JSON.stringify(settings);
      const uiSettingsJson = JSON.stringify(uiSettings);
      
      logger.debug({ productionId, name, janusRoomId, settings, uiSettings, type }, 'Inserting new group');
      const result = await db.run(
        `INSERT INTO groups (
          production_id, name, janus_room_id, settings, ui_settings, type
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        productionId,
        name,
        janusRoomId,
        settingsJson,
        uiSettingsJson,
        type
      );
      
      logger.debug({ lastID: result.lastID }, 'Group inserted, retrieving created record');
      const groupData = await db.get(
        'SELECT * FROM groups WHERE id = ?',
        result.lastID
      );

      if (!groupData) {
        logger.error({ lastID: result.lastID }, 'Failed to retrieve created group');
        throw new Error('Failed to retrieve created group');
      }
      
      // Parse the settings back to objects
      const group = {
        ...groupData,
        settings,
        ui_settings: uiSettings,
        type
      };

      // Log activity
      try {
        await activityLogDb.logActivity(
          'created',
          'group',
          group.id,
          group.name,
          `Janus room ID: ${janusRoomId}, Type: ${type}`,
          productionId,
          production.name
        );
      } catch (logError) {
        logger.error({ err: logError }, 'Failed to log group creation activity');
      }

      logger.info({ id: group.id, name: group.name, productionId, type }, 'Group created successfully');
      return group;
    } catch (error) {
      logger.error({ err: error, productionId, name, janusRoomId, type }, 'Error creating group');
      throw error;
    }
  },

  update: async (
    id: number, 
    name: string,
    settings?: GroupSettings,
    uiSettings?: GroupUISettings,
    type?: GroupType
  ): Promise<Group | undefined> => {
    logger.trace(`groupsDb.update(${id}, "${name}", type=${type}) called`);
    try {
      const db = await getDb();
      
      // Get original group for activity log
      const original = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!original) {
        throw new Error('Group not found');
      }
      
      // Get production name for activity log
      const production = await db.get('SELECT name FROM productions WHERE id = ?', original.production_id);
      
      // Prepare update fields and values
      let updateFields = ['name = ?'];
      let updateValues = [name];
      
      // Add settings if provided
      if (settings) {
        updateFields.push('settings = ?');
        updateValues.push(JSON.stringify(settings));
      }
      
      // Add UI settings if provided
      if (uiSettings) {
        updateFields.push('ui_settings = ?');
        updateValues.push(JSON.stringify(uiSettings));
      }
      
      // Add type if provided
      if (type) {
        updateFields.push('type = ?');
        updateValues.push(type);
      }
      
      // Add ID as the last parameter
      updateValues.push(id);
      
      logger.debug({ id, name, settings, uiSettings, type }, 'Updating group');
      await db.run(
        `UPDATE groups SET ${updateFields.join(', ')} WHERE id = ?`,
        ...updateValues
      );
      
      // Get updated group
      const groupData = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!groupData) {
        throw new Error('Failed to retrieve updated group');
      }
      
      // Parse settings
      try {
        const parsedSettings = groupData.settings 
          ? JSON.parse(groupData.settings) 
          : DEFAULT_GROUP_SETTINGS;
        
        const parsedUiSettings = groupData.ui_settings 
          ? JSON.parse(groupData.ui_settings) 
          : DEFAULT_GROUP_UI_SETTINGS;
        
        const group = {
          ...groupData,
          settings: parsedSettings,
          ui_settings: parsedUiSettings,
          type: groupData.type || GroupType.INTERCOM
        };
        
        // Log activity
        try {
          let details = `Changed from "${original.name}" to "${name}"`;
          if (settings || uiSettings) {
            details += ' with updated settings';
          }
          if (type && type !== original.type) {
            details += `, type changed from "${original.type}" to "${type}"`;
          }
          
          await activityLogDb.logActivity(
            'updated',
            'group',
            id,
            name,
            details,
            original.production_id,
            production ? production.name : null
          );
        } catch (logError) {
          logger.error({ err: logError }, 'Failed to log group update activity');
        }
        
        logger.info({ id, success: true }, 'Group updated');
        return group;
      } catch (err) {
        logger.error({ err, groupId: groupData.id }, 'Error parsing updated group settings');
        return {
          ...groupData,
          settings: DEFAULT_GROUP_SETTINGS,
          ui_settings: DEFAULT_GROUP_UI_SETTINGS,
          type: groupData.type || GroupType.INTERCOM
        };
      }
    } catch (error) {
      logger.error({ err: error, id, name }, 'Error updating group');
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    logger.trace(`groupsDb.delete(${id}) called`);
    try {
      const db = await getDb();
      
      // Get group details before deletion for activity log
      const group = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Get production name for activity log
      const production = await db.get('SELECT name FROM productions WHERE id = ?', group.production_id);
      
      // Store group details for logging after deletion
      const groupName = group.name;
      const groupRoomId = group.janus_room_id;
      const groupProdId = group.production_id;
      const groupType = group.type || GroupType.INTERCOM;
      const prodName = production ? production.name : null;
      
      logger.debug({ id }, 'Deleting group');
      await db.run('DELETE FROM groups WHERE id = ?', id);
      
      // Clean up Janus room
      try {
        logger.debug({ roomId: groupRoomId, groupName }, 'Cleaning up Janus room for deleted group');
        await deleteAudioRoom(groupRoomId);
        logger.info({ roomId: groupRoomId, groupName }, 'Deleted Janus room for deleted group');
      } catch (janusError) {
        logger.error({ err: janusError, roomId: groupRoomId, groupName }, 'Failed to delete Janus room for deleted group');
      }
      
      // Log activity after deletion
      try {
        await activityLogDb.logActivity(
          'deleted',
          'group',
          id,
          groupName,
          `Janus room ID: ${groupRoomId}, Type: ${groupType}`,
          groupProdId,
          prodName
        );
        logger.info({ id, name: groupName }, 'Group deletion activity logged');
      } catch (logError) {
        logger.error({ err: logError, id, name: groupName }, 'Failed to log group deletion activity');
      }
      
      logger.info({ id }, 'Group deleted');
    } catch (error) {
      logger.error({ err: error, id }, 'Error deleting group');
      throw error;
    }
  },
  
  updateSettings: async (
    id: number,
    settings: GroupSettings
  ): Promise<Group | undefined> => {
    logger.trace(`groupsDb.updateSettings(${id}) called`);
    try {
      const db = await getDb();
      
      // Get original group for activity log
      const original = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!original) {
        throw new Error('Group not found');
      }
      
      // Stringify settings
      const settingsJson = JSON.stringify(settings);
      
      logger.debug({ id, settings }, 'Updating group settings');
      await db.run(
        'UPDATE groups SET settings = ? WHERE id = ?',
        settingsJson,
        id
      );
      
      // Get updated group
      const groupData = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!groupData) {
        throw new Error('Failed to retrieve updated group');
      }
      
      // Parse settings
      try {
        const parsedSettings = groupData.settings 
          ? JSON.parse(groupData.settings) 
          : DEFAULT_GROUP_SETTINGS;
        
        const parsedUiSettings = groupData.ui_settings 
          ? JSON.parse(groupData.ui_settings) 
          : DEFAULT_GROUP_UI_SETTINGS;
        
        const group = {
          ...groupData,
          settings: parsedSettings,
          ui_settings: parsedUiSettings,
          type: groupData.type || GroupType.INTERCOM
        };
        
        // Log activity
        try {
          await activityLogDb.logActivity(
            'updated',
            'group',
            id,
            groupData.name,
            'Updated audio settings',
            groupData.production_id
          );
        } catch (logError) {
          logger.error({ err: logError }, 'Failed to log group settings update activity');
        }
        
        logger.info({ id, success: true }, 'Group settings updated');
        return group;
      } catch (err) {
        logger.error({ err, groupId: groupData.id }, 'Error parsing updated group settings');
        return {
          ...groupData,
          settings: DEFAULT_GROUP_SETTINGS,
          ui_settings: DEFAULT_GROUP_UI_SETTINGS,
          type: groupData.type || GroupType.INTERCOM
        };
      }
    } catch (error) {
      logger.error({ err: error, id }, 'Error updating group settings');
      throw error;
    }
  },
  
  updateUISettings: async (
    id: number,
    uiSettings: GroupUISettings
  ): Promise<Group | undefined> => {
    logger.trace(`groupsDb.updateUISettings(${id}) called`);
    try {
      const db = await getDb();
      
      // Get original group for activity log
      const original = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!original) {
        throw new Error('Group not found');
      }
      
      // Stringify UI settings
      const uiSettingsJson = JSON.stringify(uiSettings);
      
      logger.debug({ id, uiSettings }, 'Updating group UI settings');
      await db.run(
        'UPDATE groups SET ui_settings = ? WHERE id = ?',
        uiSettingsJson,
        id
      );
      
      // Get updated group
      const groupData = await db.get('SELECT * FROM groups WHERE id = ?', id);
      if (!groupData) {
        throw new Error('Failed to retrieve updated group');
      }
      
      // Parse settings
      try {
        const parsedSettings = groupData.settings 
          ? JSON.parse(groupData.settings) 
          : DEFAULT_GROUP_SETTINGS;
        
        const parsedUiSettings = groupData.ui_settings 
          ? JSON.parse(groupData.ui_settings) 
          : DEFAULT_GROUP_UI_SETTINGS;
        
        const group = {
          ...groupData,
          settings: parsedSettings,
          ui_settings: parsedUiSettings,
          type: groupData.type || GroupType.INTERCOM
        };
        
        // Log activity
        try {
          await activityLogDb.logActivity(
            'updated',
            'group',
            id,
            groupData.name,
            'Updated UI settings',
            groupData.production_id
          );
        } catch (logError) {
          logger.error({ err: logError }, 'Failed to log group UI settings update activity');
        }
        
        logger.info({ id, success: true }, 'Group UI settings updated');
        return group;
      } catch (err) {
        logger.error({ err, groupId: groupData.id }, 'Error parsing updated group UI settings');
        return {
          ...groupData,
          settings: DEFAULT_GROUP_SETTINGS,
          ui_settings: DEFAULT_GROUP_UI_SETTINGS,
          type: groupData.type || GroupType.INTERCOM
        };
      }
    } catch (error) {
      logger.error({ err: error, id }, 'Error updating group UI settings');
      throw error;
    }
  }
};