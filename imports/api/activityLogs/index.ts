/**
 * Activity Logs Module
 *
 * Barrel export for all activity log-related functionality
 *
 * import { ActivityLogsCollection, ActivityLog, ActivityAction } from '/imports/api/activityLogs';
 */

// Export types
export type {
  ActivityLog,
  ActivityAction,
  EntityType,
  ChangeRecord,
  NewActivityLog,
} from './types';

// Export collection
export { ActivityLogsCollection } from './collection';
