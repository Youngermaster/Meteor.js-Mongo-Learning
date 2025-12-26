/**
 * Activity Log Types
 *
 * SINGLE RESPONSIBILITY: This file contains ONLY activity log-related types
 */

/**
 * Types of actions that can be logged
 *
 * WHY: Limited enum instead of free text
 * - Enables aggregation and reporting
 * - Prevents typos
 * - Documents all possible actions
 */
export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'assign'
  | 'comment';

/**
 * Types of entities that can be acted upon
 */
export type EntityType = 'project' | 'task';

/**
 * Structure for tracking what changed in an update
 *
 * Example:
 * {
 *   field: 'status',
 *   oldValue: 'todo',
 *   newValue: 'in_progress'
 * }
 */
export interface ChangeRecord {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Activity log document structure
 *
 * PURPOSE: Audit trail and activity feed
 * - Track who did what and when
 * - Generate activity timelines
 * - Analytics and reporting
 *
 * DESIGN DECISION: Separate collection instead of embedding in projects/tasks
 * WHY:
 * - Activity logs grow unbounded over time
 * - Different query patterns than main entities
 * - Can apply TTL for automatic cleanup
 * - Won't bloat project/task documents
 */
export interface ActivityLog {
  _id?: string;

  // Who performed the action
  // INDEXED: Common query: "show user's activity"
  userId: string;

  // What action was performed
  // INDEXED: For filtering by action type
  action: ActivityAction;

  // What entity was affected
  // INDEXED: Compound index with entityId for entity timeline
  entityType: EntityType;
  entityId: string;

  // Details about what changed
  // WHY: Optional because not all actions involve changes
  // - 'create' has no previous state
  // - 'delete' only needs to record it happened
  changes?: ChangeRecord[];

  // Additional context (flexible)
  // Examples: comment text, previous assignee, reason for change
  metadata?: Record<string, any>;

  // When it happened
  // INDEXED: Primary sort order (newest first)
  // Also used for TTL-based automatic deletion
  createdAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type for documents without _id (for inserts)
 */
export type NewActivityLog = Omit<ActivityLog, '_id'>;
