/**
 * Tasks Collection
 *
 * SINGLE RESPONSIBILITY: This file handles ONLY the Tasks collection
 * - Collection instance
 * - Indexes
 * - Security rules
 */

import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import type { Task } from './types';

/**
 * Tasks Collection
 *
 * NAMING CONVENTION: Plural form (TasksCollection, not TaskCollection)
 * WHY: A collection contains multiple documents, so plural makes sense
 * Also matches Meteor conventions (Meteor.users, not Meteor.user)
 */
export const TasksCollection = new Mongo.Collection<Task>('tasks');

// ============================================================================
// SERVER-SIDE CONFIGURATION
// ============================================================================

if (Meteor.isServer) {
  // --------------------------------------------------------------------------
  // INDEXES
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
  // SECURITY
  // --------------------------------------------------------------------------

  /**
   * Deny all client-side database operations
   *
   * WHY: Security through centralized control
   * All write operations must go through Meteor Methods
   */
  TasksCollection.deny({
    insert: () => true,
    update: () => true,
    remove: () => true,
  });

  console.log('✅ Tasks collection indexes and security configured');
}
