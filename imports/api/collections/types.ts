/**
 * TypeScript Type Definitions for Collections
 *
 * WHY: Defining types separately from collection instances provides:
 * 1. Reusability across client and server
 * 2. Better IDE autocomplete and type checking
 * 3. Clear documentation of data structures
 * 4. Compile-time safety when working with documents
 */

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User role types for authorization
 *
 * - admin: Full system access, can manage all projects/tasks
 * - manager: Can create projects and manage team members
 * - member: Can be assigned tasks and work on projects
 */
export type UserRole = 'admin' | 'manager' | 'member';

/**
 * User profile information
 *
 * NOTE: This extends Meteor's default user object
 * Meteor stores authentication data in the root user object,
 * but we store custom fields in the profile subdocument
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
}

/**
 * Extended Meteor User type
 *
 * WHY: Meteor's default User type doesn't include our custom profile fields
 * This interface extends it with our application-specific data
 */
export interface User {
  _id?: string;
  username?: string;
  emails?: Array<{
    address: string;
    verified: boolean;
  }>;
  profile?: UserProfile;
  createdAt?: Date;

  // NOTE: services field contains hashed passwords and OAuth tokens
  // We never send this to the client for security reasons
  services?: any;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Project status lifecycle
 *
 * active -> User is currently working on this project
 * completed -> Project finished but kept for reference
 * archived -> Hidden from normal views, long-term storage
 */
export type ProjectStatus = 'active' | 'completed' | 'archived';

/**
 * Priority levels for projects and tasks
 */
export type Priority = 'low' | 'medium' | 'high';

/**
 * Project metadata for quick stats
 *
 * WHY: We denormalize these counts for performance
 * Instead of counting tasks on every query, we maintain these counters
 * and update them when tasks change. This is a common MongoDB pattern.
 *
 * TRADEOFF: Slight complexity in updates vs much faster reads
 */
export interface ProjectMetadata {
  totalTasks: number;
  completedTasks: number;
  priority: Priority;
}

/**
 * Project document structure
 *
 * DESIGN DECISION: We use references (IDs) instead of embedding user/task data
 * WHY: Users and tasks can be large and change frequently
 * Embedding would cause document growth and update complexity
 */
export interface Project {
  _id?: string;
  name: string;
  description: string;

  // Owner reference (one-to-one)
  // The user who created and owns this project
  ownerId: string;

  // Team members reference (one-to-many)
  // WHY: Array of IDs instead of embedded user objects
  // - Users can be on multiple projects
  // - User data might change (name, avatar)
  // - Keeps document size predictable
  teamMemberIds: string[];

  status: ProjectStatus;

  // Tags for categorization and filtering
  // WHY: Array in document instead of separate collection
  // - Small, simple data
  // - Always queried with the project
  // - Benefits from indexing
  tags: string[];

  // Denormalized stats for dashboard performance
  metadata: ProjectMetadata;

  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Task workflow statuses
 *
 * Represents a typical development workflow:
 * todo -> in_progress -> review -> done
 */
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

/**
 * Task document structure
 *
 * RELATIONSHIP DESIGN:
 * - Belongs to one Project (projectId)
 * - Assigned to one User (assignedToId) - optional
 * - Created by one User (createdBy)
 *
 * WHY: We use references instead of embedding:
 * - Projects and users are large, independent entities
 * - Tasks need to be queryable independently
 * - Assignment can change frequently
 */
export interface Task {
  _id?: string;

  // Parent project reference
  // INDEXED: Most queries filter by projectId
  projectId: string;

  title: string;
  description: string;

  // Current assignee (optional - tasks can be unassigned)
  // INDEXED: Common query: "show me my tasks"
  assignedToId?: string;

  // Workflow status
  // INDEXED: Common filter in queries
  status: TaskStatus;

  // Business priority
  // INDEXED: Common sort and filter criteria
  priority: Priority;

  // Due date (optional)
  // INDEXED: For "upcoming tasks" and "overdue" queries
  dueDate?: Date;

  // Time tracking
  // WHY: Optional numbers instead of required
  // - Not all tasks need time tracking
  // - Can be added later in task lifecycle
  estimatedHours?: number;
  actualHours?: number;

  // Tags for flexible categorization
  // WHY: Array instead of separate tags table
  // - Simple, flexible structure
  // - MongoDB handles array indexing well
  // - Tags are always relevant to the task
  tags: string[];

  // Audit fields
  createdBy: string;  // Who created this task
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date; // When status changed to 'done'
}

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

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
 *
 * WHY: MongoDB generates _id on insert, so we shouldn't require it
 * TypeScript's Omit utility removes _id from the type
 */
export type NewProject = Omit<Project, '_id'>;
export type NewTask = Omit<Task, '_id'>;
export type NewActivityLog = Omit<ActivityLog, '_id'>;

/**
 * Type for partial updates
 *
 * WHY: Updates often only change some fields
 * TypeScript's Partial makes all fields optional
 */
export type ProjectUpdate = Partial<Omit<Project, '_id' | 'createdAt'>>;
export type TaskUpdate = Partial<Omit<Task, '_id' | 'createdAt' | 'createdBy'>>;

/**
 * Projection types for limiting fields
 *
 * WHY: Sometimes we only need specific fields for performance
 * These types document common projection patterns
 */
export interface ProjectListItem {
  _id: string;
  name: string;
  status: ProjectStatus;
  metadata: ProjectMetadata;
}

export interface TaskListItem {
  _id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
  assignedToId?: string;
}
