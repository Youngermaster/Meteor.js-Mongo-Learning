/**
 * Task Types
 *
 * SINGLE RESPONSIBILITY: This file contains ONLY task-related types
 */

// Import Priority from projects (shared type)
import type { Priority } from '../projects/types';

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
// UTILITY TYPES
// ============================================================================

/**
 * Type for documents without _id (for inserts)
 */
export type NewTask = Omit<Task, '_id'>;

/**
 * Type for partial updates
 */
export type TaskUpdate = Partial<Omit<Task, '_id' | 'createdAt' | 'createdBy'>>;

/**
 * Projection types for limiting fields
 */
export interface TaskListItem {
  _id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
  assignedToId?: string;
}

// Re-export Priority for convenience
export type { Priority };
