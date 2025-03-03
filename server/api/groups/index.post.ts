import { groupsDb, productionsDb } from '~/server/database';
import { createAudioRoom } from '~/server/utils/janus';
import { z } from 'zod';
import { createLogger } from '~/server/utils/logger';
import { DEFAULT_GROUP_SETTINGS, DEFAULT_GROUP_UI_SETTINGS, GroupType } from '~/types';

const logger = createLogger('api:groups');

// POST /api/groups - Create a new group
export default defineEventHandler(async (event) => {
  logger.trace('POST /api/groups called');
  try {
    const body = await readBody(event);
    logger.debug({ body }, 'Received request body');
    
    // Validate input
    const schema = z.object({
      production_id: z.number().int().positive(),
      name: z.string().min(1).max(100),
      type: z.enum([GroupType.INTERCOM, GroupType.PROGRAM]).optional(),
      settings: z.object({
        noise_suppression: z.boolean().optional(),
        echo_cancellation: z.boolean().optional(),
        auto_gain_control: z.boolean().optional(),
        audio_level_events: z.boolean().optional(),
        comfort_noise: z.boolean().optional(),
        muted_by_default: z.boolean().optional()
      }).optional(),
      ui_settings: z.object({
        button_style: z.enum(['round', 'square']).optional(),
        color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional()
      }).optional()
    });
    
    const result = schema.safeParse(body);
    if (!result.success) {
      logger.warn({ errors: result.error.format() }, 'Invalid input data');
      return { success: false, error: 'Invalid input data' };
    }
    
    const { production_id, name, settings, ui_settings } = result.data;
    const type = result.data.type || GroupType.INTERCOM;
    
    // Check if production exists
    const production = await productionsDb.getById(production_id);
    if (!production) {
      logger.warn({ production_id }, 'Production not found');
      return { success: false, error: 'Production not found' };
    }
    
    // Generate a unique Janus room ID (using timestamp + random number)
    const janusRoomId = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
    logger.debug({ janusRoomId, productionName: production.name, groupName: name, type }, 'Generated Janus room ID');
    
    // Create Janus audiobridge room
    await createAudioRoom(janusRoomId, `${production.name} - ${name}`);
    
    // Merge settings with defaults
    const mergedSettings = {
      ...DEFAULT_GROUP_SETTINGS,
      ...settings
    };
    
    // Merge UI settings with defaults
    const mergedUISettings = {
      ...DEFAULT_GROUP_UI_SETTINGS,
      ...ui_settings
    };
    
    // Create group in database
    logger.debug({ production_id, name, janusRoomId, settings: mergedSettings, uiSettings: mergedUISettings, type }, 'Creating group in database');
    const group = await groupsDb.create(production_id, name, janusRoomId, mergedSettings, mergedUISettings, type);
    
    // Notify clients about the new group
    const io = event.context.socketIO;
    if (io) {
      io.to(`production:${production_id}`).emit('production_updated', { productionId: production_id });
    }
    
    logger.info({ id: group.id, name: group.name, production_id, type }, 'Group created successfully');
    return { success: true, data: group };
  } catch (error) {
    logger.error({ err: error }, 'Error creating group');
    return { success: false, error: error.message || 'Failed to create group' };
  }
});