/**
 * Activity Logs Collection
 *
 * SINGLE RESPONSIBILITY: This file handles ONLY the ActivityLogs collection
 * - Collection instance
 * - Indexes (including TTL for auto-cleanup)
 * - Security rules
 */

import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import type { ActivityLog } from './types';

/**
 * Activity Logs Collection
 *
 * NOTE: This is a write-heavy collection (many inserts, few reads)
 * We'll optimize it differently than read-heavy collections
 */
export const ActivityLogsCollection = new Mongo.Collection<ActivityLog>('activityLogs');

// ============================================================================
// SERVER-SIDE CONFIGURATION
// ============================================================================

if (Meteor.isServer) {
  // --------------------------------------------------------------------------
  // INDEXES
  // --------------------------------------------------------------------------

  /**
   * Index: Created Date (descending)
   *
   * QUERY PATTERN: "Show me recent activity"
   * Common in: Activity feeds, timelines
   *
   * WHY -1 (descending):
   * Activity feeds always show newest first
   * Descending index matches our query sort order
   *
   * PERFORMANCE TIP:
   * For time-series data like logs, always index the timestamp
   * This is THE most common query pattern
   */
  ActivityLogsCollection.createIndexAsync({ createdAt: -1 });

  /**
   * Index: User + Created Date
   *
   * QUERY PATTERN: "Show me this user's activity"
   * Common in: User activity pages, audit trails
   */
  ActivityLogsCollection.createIndexAsync({ userId: 1, createdAt: -1 });

  /**
   * Index: Entity Type + Entity ID + Created Date
   *
   * QUERY PATTERN: "Show me activity for this project"
   * Common in: Entity activity timelines, change history
   *
   * WHY THREE FIELDS:
   * We need both entityType and entityId because:
   * - Same ID might exist in projects and tasks
   * - We often want activity for a specific entity instance
   */
  ActivityLogsCollection.createIndexAsync({
    entityType: 1,
    entityId: 1,
    createdAt: -1,
  });

  /**
   * Index: Action + Created Date
   *
   * QUERY PATTERN: "Show me all 'delete' actions"
   * Common in: Audit reports, security monitoring
   */
  ActivityLogsCollection.createIndexAsync({ action: 1, createdAt: -1 });

  /**
   * TTL Index: Auto-delete old logs
   *
   * WHY TTL (Time To Live) INDEX:
   * Activity logs grow unbounded - eventually impacting performance
   * TTL index automatically deletes documents after a specified time
   *
   * HOW IT WORKS:
   * MongoDB checks this index periodically (every 60 seconds)
   * Deletes documents where: createdAt + expireAfterSeconds < now
   *
   * CONFIGURED TIME: 90 days (7,776,000 seconds)
   * Adjust based on your retention requirements
   *
   * IMPORTANT:
   * - Only works on Date fields
   * - Can only have one TTL index per collection
   * - Deletion is not instant, happens in background
   */
  ActivityLogsCollection.createIndexAsync(
    { createdAt: 1 },
    {
      name: 'ttl_index',
      expireAfterSeconds: 60 * 60 * 24 * 90, // 90 days
    }
  );

  // --------------------------------------------------------------------------
  // SECURITY
  // --------------------------------------------------------------------------

  /**
   * Deny all client-side database operations
   *
   * WHY: Activity logs are append-only from the server
   * Clients should never directly insert, update, or delete logs
   */
  ActivityLogsCollection.deny({
    insert: () => true,
    update: () => true,
    remove: () => true,
  });

  console.log('✅ ActivityLogs collection indexes and security configured');
}
