/**
 * Collections Module Entry Point
 *
 * This barrel export file provides a clean import interface:
 *
 * Instead of:
 *   import { ProjectsCollection } from './collections/collections';
 *   import { Project } from './collections/types';
 *
 * You can do:
 *   import { ProjectsCollection, Project } from './collections';
 *
 * WHY: Cleaner imports, easier refactoring, better organization
 */

// Export all collection instances
export {
  ProjectsCollection,
  TasksCollection,
  ActivityLogsCollection,
  UsersCollection,
} from './collections';

// Export all types
export type {
  // User types
  User,
  UserProfile,
  UserRole,

  // Project types
  Project,
  ProjectStatus,
  ProjectMetadata,
  NewProject,
  ProjectUpdate,
  ProjectListItem,

  // Task types
  Task,
  TaskStatus,
  Priority,
  NewTask,
  TaskUpdate,
  TaskListItem,

  // Activity log types
  ActivityLog,
  ActivityAction,
  EntityType,
  ChangeRecord,
  NewActivityLog,
} from './types';
