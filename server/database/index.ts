import { activityLogDb } from './modules/activityLog';
import { emailTemplatesDb } from './modules/emailTemplates';
import { productionsDb } from './modules/productions';
import { groupsDb } from './modules/groups';
import { getDb } from './schema';

// Export all database modules
export {
  activityLogDb,
  emailTemplatesDb,
  productionsDb,
  groupsDb,
  getDb
};