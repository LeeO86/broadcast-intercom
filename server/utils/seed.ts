import { productionsDb, groupsDb } from '~/server/database';
import { createAudioRoom } from '~/server/utils/janus';
import { createLogger } from './logger';
import { DEFAULT_EMAIL_TEMPLATE, GroupType } from '~/types';

const logger = createLogger('seed');

/**
 * Seeds the database with initial data if it's empty
 */
export async function seedDatabase() {
  logger.trace('seedDatabase() called');
  try {
    // Check if we have any productions
    const productions = await productionsDb.getAll();
    
    if (productions.length === 0) {
      logger.info('Database is empty, seeding with initial data');
      
      try {
        // Generate a secure access code for the demo production
        const generateAccessCode = () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = '';
          
          // Generate a code that's 16-20 characters long
          const length = Math.floor(Math.random() * 5) + 16;
          
          // Ensure at least one number
          let hasNumber = false;
          
          for (let i = 0; i < length; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            code += char;
            
            // Check if the character is a number
            if (!hasNumber && /\d/.test(char)) {
              hasNumber = true;
            }
          }
          
          // If no number was added, replace a random character with a number
          if (!hasNumber) {
            const position = Math.floor(Math.random() * code.length);
            const numbers = '23456789';
            const randomNumber = numbers.charAt(Math.floor(Math.random() * numbers.length));
            code = code.substring(0, position) + randomNumber + code.substring(position + 1);
          }
          
          return code;
        };
        
        // Create a demo production with a secure access code
        const accessCode = generateAccessCode();
        logger.debug('Creating demo production');
        const production = await productionsDb.create(
          'Demo Production', 
          accessCode,
          DEFAULT_EMAIL_TEMPLATE
        );
        
        if (production) {
          logger.info({ id: production.id, name: production.name }, 'Created demo production');
          
          // Create two intercom groups for the demo production
          const janusRoomId1 = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
          logger.debug({ roomId: janusRoomId1, name: 'Camera' }, 'Creating first group');
          await createAudioRoom(janusRoomId1, `${production.name} - Camera`);
          const group1 = await groupsDb.create(production.id, 'Camera', janusRoomId1);
          
          const janusRoomId2 = janusRoomId1 + 1;
          logger.debug({ roomId: janusRoomId2, name: 'Director' }, 'Creating second group');
          await createAudioRoom(janusRoomId2, `${production.name} - Director`);
          const group2 = await groupsDb.create(production.id, 'Director', janusRoomId2);
          
          // Create a program sound group
          const janusRoomId3 = janusRoomId2 + 1;
          logger.debug({ roomId: janusRoomId3, name: 'Program Sound', type: GroupType.PROGRAM }, 'Creating program sound group');
          await createAudioRoom(janusRoomId3, `${production.name} - Program Sound`);
          const group3 = await groupsDb.create(
            production.id, 
            'Program Sound', 
            janusRoomId3, 
            undefined, 
            undefined, 
            GroupType.PROGRAM
          );
          
          logger.info({ 
            group1: { id: group1.id, name: group1.name, type: GroupType.INTERCOM },
            group2: { id: group2.id, name: group2.name, type: GroupType.INTERCOM },
            group3: { id: group3.id, name: group3.name, type: GroupType.PROGRAM }
          }, 'Created demo groups');
        }
        
        logger.info('Database seeding completed successfully');
      } catch (error) {
        logger.error({ err: error }, 'Error during database seeding');
      }
    } else {
      logger.info(`Database already contains ${productions.length} productions, skipping seeding`);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error checking database for seeding');
  }
}