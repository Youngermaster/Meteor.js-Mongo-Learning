/**
 * Project Types
 *
 * SINGLE RESPONSIBILITY: This file contains ONLY project-related types
 */

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
 *
 * NOTE: This is shared between Projects and Tasks
 * We define it here as the "source of truth" since projects are hierarchically higher
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
// UTILITY TYPES
// ============================================================================

/**
 * Type for documents without _id (for inserts)
 *
 * WHY: MongoDB generates _id on insert, so we shouldn't require it
 * TypeScript's Omit utility removes _id from the type
 */
export type NewProject = Omit<Project, '_id'>;

/**
 * Type for partial updates
 *
 * WHY: Updates often only change some fields
 * TypeScript's Partial makes all fields optional
 */
export type ProjectUpdate = Partial<Omit<Project, '_id' | 'createdAt'>>;

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
