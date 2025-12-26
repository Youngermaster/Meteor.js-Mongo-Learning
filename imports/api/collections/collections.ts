/**
 * Collection Definitions
 *
 * This file creates the actual MongoDB collection instances with TypeScript types.
 *
 * IMPORT PATTERN:
 * Notice we explicitly import from 'meteor/mongo' instead of relying on globals.
 * This is a Meteor best practice for ES6 modules.
 */

import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import {
  Project,
  Task,
  ActivityLog,
  User,
} from './types';

// ============================================================================
// COLLECTION INSTANCES
// ============================================================================

/**
 * Projects Collection
 *
 * WHY: We use Mongo.Collection<Project> for type safety
 * TypeScript will now enforce that all documents match the Project interface
 *
 * The generic type parameter tells TypeScript:
 * - What shape documents have when reading
 * - What fields are required when inserting
 * - What fields are available for updates
 */
export const ProjectsCollection = new Mongo.Collection<Project>('projects');

/**
 * Tasks Collection
 *
 * NAMING CONVENTION: Plural form (TasksCollection, not TaskCollection)
 * WHY: A collection contains multiple documents, so plural makes sense
 * Also matches Meteor conventions (Meteor.users, not Meteor.user)
 */
export const TasksCollection = new Mongo.Collection<Task>('tasks');

/**
 * Activity Logs Collection
 *
 * NOTE: This is a write-heavy collection (many inserts, few reads)
 * We'll optimize it differently than read-heavy collections
 */
export const ActivityLogsCollection = new Mongo.Collection<ActivityLog>('activityLogs');

/**
 * Users Collection
 *
 * IMPORTANT: We extend Meteor's built-in users collection
 * Meteor.users is already defined, so we just add our type
 *
 * WHY: Meteor handles authentication, password hashing, and sessions
 * We just extend it with our custom profile fields
 */
export const UsersCollection = Meteor.users as Mongo.Collection<User>;

// ============================================================================
// SERVER-SIDE CONFIGURATION
// ============================================================================

if (Meteor.isServer) {
  /**
   * Database Indexes
   *
   * WHY INDEXES MATTER:
   * Without indexes, MongoDB scans every document (collection scan)
   * With indexes, MongoDB can jump directly to matching documents
   *
   * EXAMPLE:
   * Query: Tasks.find({ projectId: 'abc123' })
   * Without index: Scans ALL tasks (slow if you have 100,000 tasks)
   * With index: Jumps to tasks for 'abc123' (fast even with millions)
   *
   * TRADEOFF:
   * - Indexes speed up reads but slow down writes slightly
   * - Indexes consume disk space and memory
   * - Only index fields you actually query on
   */

  // --------------------------------------------------------------------------
  // PROJECTS INDEXES
  // --------------------------------------------------------------------------

  /**
   * Index: Owner + Status
   *
   * QUERY PATTERN: "Show me all active projects I own"
   * Common in: Dashboard, project list
   *
   * WHY COMPOUND INDEX:
   * We often filter by BOTH ownerId and status together
   * MongoDB can use this index for:
   * - { ownerId: '...' }
   * - { ownerId: '...', status: '...' }
   * But NOT for { status: '...' } alone (order matters!)
   *
   * INDEX DIRECTION:
   * 1 = ascending, -1 = descending
   * For filtering, direction doesn't matter much
   * For sorting, match your typical sort order
   */
  ProjectsCollection.createIndexAsync({ ownerId: 1, status: 1 });

  /**
   * Index: Team Members + Status
   *
   * QUERY PATTERN: "Show me projects where I'm a team member"
   * Common in: User's project list, team collaboration views
   *
   * WHY ARRAY INDEX:
   * teamMemberIds is an array field
   * MongoDB creates a multi-key index - one entry per array element
   * This makes array queries efficient
   */
  ProjectsCollection.createIndexAsync({ teamMemberIds: 1, status: 1 });

  /**
   * Index: Status + Created Date
   *
   * QUERY PATTERN: "Show me recent active projects"
   * Common in: Home page, recent activity feeds
   *
   * WHY -1 for createdAt:
   * We typically want newest first
   * -1 (descending) matches our typical sort order
   */
  ProjectsCollection.createIndexAsync({ status: 1, createdAt: -1 });

  /**
   * Index: Tags
   *
   * QUERY PATTERN: "Show me all projects tagged 'urgent'"
   * Common in: Tag-based filtering
   *
   * WHY ARRAY INDEX:
   * tags is an array field
   * Multi-key index allows efficient tag searches
   */
  ProjectsCollection.createIndexAsync({ tags: 1 });

  /**
   * Index: Priority + Status
   *
   * QUERY PATTERN: "Show me high priority active projects"
   * Common in: Priority-based views, dashboards
   */
  ProjectsCollection.createIndexAsync({ 'metadata.priority': 1, status: 1 });

  // --------------------------------------------------------------------------
  // TASKS INDEXES
  // --------------------------------------------------------------------------

  /**
   * Index: Project + Status + Due Date
   *
   * QUERY PATTERN: "Show me tasks for this project, sorted by due date"
   * Common in: Project detail page, kanban boards
   *
   * WHY THREE FIELDS:
   * This is our most common query pattern
   * MongoDB can use this index for:
   * - { projectId: '...' }
   * - { projectId: '...', status: '...' }
   * - { projectId: '...', status: '...', dueDate: ... }
   *
   * And for sorting by dueDate when filtering by project
   */
  TasksCollection.createIndexAsync({ projectId: 1, status: 1, dueDate: 1 });

  /**
   * Index: Assignee + Status + Due Date
   *
   * QUERY PATTERN: "Show me my tasks, sorted by due date"
   * Common in: User's task list, "My Work" pages
   *
   * WHY SPARSE INDEX:
   * assignedToId is optional (tasks can be unassigned)
   * Sparse index only includes documents where the field exists
   * This saves space and makes the index more efficient
   */
  TasksCollection.createIndexAsync(
    { assignedToId: 1, status: 1, dueDate: 1 },
    { sparse: true }
  );

  /**
   * Index: Due Date + Status
   *
   * QUERY PATTERN: "Show me all overdue tasks"
   * Common in: Overdue reports, deadline alerts
   *
   * WHY SEPARATE FROM COMPOUND:
   * Sometimes we want all overdue tasks regardless of project/assignee
   * This index supports date range queries efficiently
   */
  TasksCollection.createIndexAsync({ dueDate: 1, status: 1 });

  /**
   * Index: Priority + Status + Created Date
   *
   * QUERY PATTERN: "Show me high priority tasks"
   * Common in: Priority views, triage pages
   */
  TasksCollection.createIndexAsync({ priority: 1, status: 1, createdAt: -1 });

  /**
   * Index: Creator + Created Date
   *
   * QUERY PATTERN: "Show me tasks I created"
   * Common in: User activity views, created items list
   */
  TasksCollection.createIndexAsync({ createdBy: 1, createdAt: -1 });

  /**
   * Index: Tags
   *
   * QUERY PATTERN: "Show me tasks tagged 'bug'"
   * Common in: Tag-based filtering
   */
  TasksCollection.createIndexAsync({ tags: 1 });

  // --------------------------------------------------------------------------
  // ACTIVITY LOGS INDEXES
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
  // USERS INDEXES
  // --------------------------------------------------------------------------

  /**
   * Index: Email address
   *
   * NOTE: Meteor creates this automatically for authentication
   * We just document it here for completeness
   *
   * WHY UNIQUE:
   * Each email must belong to only one user
   * Prevents duplicate registrations
   */
  UsersCollection.createIndexAsync({ 'emails.address': 1 }, { unique: true, sparse: true });

  /**
   * Index: Username
   *
   * NOTE: Also created by Meteor automatically
   * Required for username-based login
   */
  UsersCollection.createIndexAsync({ username: 1 }, { unique: true, sparse: true });

  /**
   * Index: User Role
   *
   * QUERY PATTERN: "Show me all admin users"
   * Common in: Admin panels, permission management
   */
  UsersCollection.createIndexAsync({ 'profile.role': 1 });

  // --------------------------------------------------------------------------
  // COLLECTION SECURITY
  // --------------------------------------------------------------------------

  /**
   * Deny all client-side database operations
   *
   * WHY: Security through centralized control
   *
   * By default, Meteor allows client-side inserts/updates/deletes
   * This is DANGEROUS because:
   * 1. Clients can be hacked/manipulated
   * 2. No centralized validation
   * 3. Hard to audit changes
   * 4. Can't enforce business logic
   *
   * SOLUTION: Deny all, use Meteor Methods instead
   * Methods run on server, can't be bypassed, enforce security
   *
   * EXCEPTION: Some apps allow client-side updates for offline support
   * But this requires careful validation rules
   */

  ProjectsCollection.deny({
    insert: () => true,
    update: () => true,
    remove: () => true,
  });

  TasksCollection.deny({
    insert: () => true,
    update: () => true,
    remove: () => true,
  });

  ActivityLogsCollection.deny({
    insert: () => true,
    update: () => true,
    remove: () => true,
  });

  // Users collection security is handled by Meteor Accounts package
  // We still deny most operations except profile updates
  UsersCollection.deny({
    update: () => true,
    remove: () => true,
  });

  /**
   * Index Creation Logging
   *
   * WHY: It's helpful to confirm indexes were created during startup
   * Helps debug performance issues ("Did my index actually get created?")
   */
  console.log('✅ Database indexes created successfully');
}

// ============================================================================
// COLLECTION HELPERS (Optional)
// ============================================================================

/**
 * You can add helper methods to collections for common operations
 * These are available on both client and server
 *
 * Example:
 * TasksCollection.helpers({
 *   isOverdue() {
 *     return this.dueDate && this.dueDate < new Date() && this.status !== 'done';
 *   },
 *   assignedUser() {
 *     return UsersCollection.findOne(this.assignedToId);
 *   }
 * });
 *
 * Usage:
 * const task = TasksCollection.findOne(taskId);
 * if (task.isOverdue()) { ... }
 *
 * NOTE: We don't use helpers in this learning project to keep things explicit
 * But they're useful in production apps for reusable logic
 */
