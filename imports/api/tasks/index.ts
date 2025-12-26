/**
 * Tasks Module
 *
 * Barrel export for all task-related functionality
 *
 * import { TasksCollection, Task, TaskStatus } from '/imports/api/tasks';
 */

// Export types
export type {
  Task,
  TaskStatus,
  Priority,
  NewTask,
  TaskUpdate,
  TaskListItem,
} from './types';

// Export collection
export { TasksCollection } from './collection';
