/**
 * Tasks Methods
 *
 * Handles all CRUD operations for tasks with proper validation,
 * security checks, and activity logging.
 *
 * SPECIAL CONSIDERATIONS FOR TASKS:
 * - Tasks belong to projects (must validate project exists)
 * - Tasks can be assigned to users (must validate user exists)
 * - Status changes trigger side effects (update project counters, log completion time)
 * - Tasks have lifecycle hooks (creation, assignment, completion)
 */

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import {
  TasksCollection,
  ProjectsCollection,
  ActivityLogsCollection,
  Task,
  NewTask,
  TaskStatus,
  Priority,
} from '../collections';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has permission to modify a task
 *
 * PERMISSION RULES:
 * - Project owner can modify any task in their project
 * - Task assignee can modify their own task (limited updates)
 * - Task creator can modify their task
 * - Admins can modify any task
 */
function canModifyTask(userId: string | null, task: Task): boolean {
  if (!userId) return false;

  const user = Meteor.users.findOne(userId);
  if (!user) return false;

  // Admin can modify anything
  if (user.profile?.role === 'admin') return true;

  // Task creator can modify
  if (task.createdBy === userId) return true;

  // Check if user is project owner
  const project = ProjectsCollection.findOne(task.projectId);
  if (project?.ownerId === userId) return true;

  // Assignee can modify their own task (checked separately in specific methods)
  if (task.assignedToId === userId) return true;

  return false;
}

/**
 * Check if user can view tasks in a project
 *
 * VISIBILITY RULES:
 * - Project owner can see all tasks
 * - Team members can see tasks in their projects
 * - Admins can see all tasks
 */
function canViewProjectTasks(userId: string | null, projectId: string): boolean {
  if (!userId) return false;

  const user = Meteor.users.findOne(userId);
  if (!user) return false;

  if (user.profile?.role === 'admin') return true;

  const project = ProjectsCollection.findOne(projectId);
  if (!project) return false;

  // Owner can see all tasks
  if (project.ownerId === userId) return true;

  // Team members can see tasks
  if (project.teamMemberIds.includes(userId)) return true;

  return false;
}

/**
 * Log activity for audit trail
 */
function logTaskActivity(
  userId: string,
  action: 'create' | 'update' | 'delete' | 'complete' | 'assign',
  taskId: string,
  changes?: any
) {
  ActivityLogsCollection.insert({
    userId,
    action,
    entityType: 'task',
    entityId: taskId,
    changes,
    createdAt: new Date(),
  });
}

// ============================================================================
// METEOR METHODS
// ============================================================================

Meteor.methods({
  /**
   * Create a new task
   *
   * REQUIRED FIELDS:
   * - projectId: Must be a valid project
   * - title: 3-200 characters
   * - description: Up to 2000 characters
   *
   * OPTIONAL FIELDS:
   * - assignedToId: User to assign task to
   * - priority: low | medium | high
   * - dueDate: Deadline for task
   * - estimatedHours: Time estimate
   * - tags: Array of tag strings
   *
   * SIDE EFFECTS:
   * - Updates project task counter
   * - Logs activity
   *
   * @param taskData - Task details
   * @returns New task ID
   */
  'tasks.insert'(
    taskData: Omit<NewTask, '_id' | 'createdBy' | 'createdAt' | 'status'>
  ): string {
    // SECURITY: Must be logged in
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to create tasks');
    }

    // VALIDATION: Input types
    check(taskData, {
      projectId: String,
      title: String,
      description: String,
      assignedToId: Match.Maybe(String),
      priority: Match.OneOf('low', 'medium', 'high'),
      dueDate: Match.Maybe(Date),
      estimatedHours: Match.Maybe(Number),
      tags: [String],
    });

    // VALIDATION: Title length
    if (taskData.title.trim().length < 3) {
      throw new Meteor.Error('validation-error', 'Task title must be at least 3 characters');
    }
    if (taskData.title.length > 200) {
      throw new Meteor.Error('validation-error', 'Task title must be less than 200 characters');
    }

    // VALIDATION: Description length
    if (taskData.description.length > 2000) {
      throw new Meteor.Error(
        'validation-error',
        'Task description must be less than 2000 characters'
      );
    }

    // VALIDATION: Project exists and user has access
    const project = ProjectsCollection.findOne(taskData.projectId);
    if (!project) {
      throw new Meteor.Error('not-found', 'Project not found');
    }

    if (!canViewProjectTasks(this.userId, taskData.projectId)) {
      throw new Meteor.Error(
        'not-authorized',
        'You do not have permission to create tasks in this project'
      );
    }

    // VALIDATION: If assigned, user must exist and be on project team
    if (taskData.assignedToId) {
      const assignee = Meteor.users.findOne(taskData.assignedToId);
      if (!assignee) {
        throw new Meteor.Error('not-found', 'Assigned user not found');
      }

      // Check if assignee is project owner or team member
      const isOnTeam =
        project.ownerId === taskData.assignedToId ||
        project.teamMemberIds.includes(taskData.assignedToId);

      if (!isOnTeam) {
        throw new Meteor.Error(
          'validation-error',
          'Can only assign tasks to project owner or team members'
        );
      }
    }

    // VALIDATION: Estimated hours must be positive
    if (taskData.estimatedHours !== undefined && taskData.estimatedHours <= 0) {
      throw new Meteor.Error('validation-error', 'Estimated hours must be greater than 0');
    }

    // VALIDATION: Due date must be in the future
    if (taskData.dueDate && taskData.dueDate < new Date()) {
      // NOTE: This is a soft validation - we allow it but could warn
      // In a real app, you might allow past dates for migrated data
      console.warn('Task created with due date in the past');
    }

    // CONSTRUCT: Build complete task document
    const task: NewTask = {
      ...taskData,
      createdBy: this.userId, // SECURITY: Always from authenticated user
      status: 'todo', // All new tasks start as 'todo'
      createdAt: new Date(),
    };

    // INSERT: Add to database
    const taskId = TasksCollection.insert(task);

    // SIDE EFFECT: Update project task counter
    // WHY: We maintain denormalized counts for fast dashboard queries
    Meteor.call('projects.updateTaskCounters', taskData.projectId);

    // AUDIT: Log creation
    logTaskActivity(this.userId, 'create', taskId);

    // If task was assigned, log that too
    if (taskData.assignedToId) {
      logTaskActivity(this.userId, 'assign', taskId, {
        assignedTo: taskData.assignedToId,
      });
    }

    return taskId;
  },

  /**
   * Update an existing task
   *
   * SPECIAL CASES:
   * - Status change to 'done' sets completedAt timestamp
   * - Assignment change logs activity
   * - Assignees can only update certain fields (not reassign)
   *
   * @param taskId - Task to update
   * @param updates - Fields to update
   */
  'tasks.update'(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      dueDate?: Date;
      estimatedHours?: number;
      actualHours?: number;
      tags?: string[];
      assignedToId?: string | null; // null to unassign
    }
  ): void {
    check(taskId, String);
    check(updates, {
      title: Match.Maybe(String),
      description: Match.Maybe(String),
      status: Match.Maybe(Match.OneOf('todo', 'in_progress', 'review', 'done')),
      priority: Match.Maybe(Match.OneOf('low', 'medium', 'high')),
      dueDate: Match.Maybe(Date),
      estimatedHours: Match.Maybe(Number),
      actualHours: Match.Maybe(Number),
      tags: Match.Maybe([String]),
      assignedToId: Match.Maybe(Match.OneOf(String, null)),
    });

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    // FETCH: Get existing task
    const task = TasksCollection.findOne(taskId);
    if (!task) {
      throw new Meteor.Error('not-found', 'Task not found');
    }

    // SECURITY: Check permissions
    const user = Meteor.users.findOne(this.userId);
    const isAssignee = task.assignedToId === this.userId;
    const canFullyModify = canModifyTask(this.userId, task);

    if (!canFullyModify && !isAssignee) {
      throw new Meteor.Error(
        'not-authorized',
        'You do not have permission to modify this task'
      );
    }

    // PERMISSION: Assignees can only update certain fields
    if (isAssignee && !canFullyModify) {
      const allowedFields = ['status', 'actualHours', 'description'];
      const attemptedFields = Object.keys(updates);
      const unauthorizedFields = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (unauthorizedFields.length > 0) {
        throw new Meteor.Error(
          'not-authorized',
          `Assignees can only update: ${allowedFields.join(', ')}`
        );
      }
    }

    // VALIDATION: Title length
    if (updates.title !== undefined) {
      if (updates.title.trim().length < 3) {
        throw new Meteor.Error('validation-error', 'Task title must be at least 3 characters');
      }
      if (updates.title.length > 200) {
        throw new Meteor.Error('validation-error', 'Task title must be less than 200 characters');
      }
    }

    // VALIDATION: Description length
    if (updates.description !== undefined && updates.description.length > 2000) {
      throw new Meteor.Error(
        'validation-error',
        'Task description must be less than 2000 characters'
      );
    }

    // VALIDATION: If reassigning, validate new assignee
    if (updates.assignedToId !== undefined && updates.assignedToId !== null) {
      const project = ProjectsCollection.findOne(task.projectId);
      if (!project) {
        throw new Meteor.Error('not-found', 'Project not found');
      }

      const newAssignee = Meteor.users.findOne(updates.assignedToId);
      if (!newAssignee) {
        throw new Meteor.Error('not-found', 'Assigned user not found');
      }

      const isOnTeam =
        project.ownerId === updates.assignedToId ||
        project.teamMemberIds.includes(updates.assignedToId);

      if (!isOnTeam) {
        throw new Meteor.Error(
          'validation-error',
          'Can only assign tasks to project owner or team members'
        );
      }
    }

    // BUILD UPDATE OBJECT
    const updateObject: any = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };

    // SPECIAL CASE: Status change to 'done'
    if (updates.status === 'done' && task.status !== 'done') {
      updateObject.$set.completedAt = new Date();

      // Log completion separately
      logTaskActivity(this.userId, 'complete', taskId, {
        previousStatus: task.status,
      });

      // Update project counters (completed count increased)
      Meteor.call('projects.updateTaskCounters', task.projectId);
    }

    // SPECIAL CASE: Status change from 'done' to something else
    if (task.status === 'done' && updates.status && updates.status !== 'done') {
      updateObject.$unset = { completedAt: '' };

      // Update project counters (completed count decreased)
      Meteor.call('projects.updateTaskCounters', task.projectId);
    }

    // UPDATE: Apply changes
    TasksCollection.update(taskId, updateObject);

    // AUDIT: Log assignment change
    if (updates.assignedToId !== undefined && updates.assignedToId !== task.assignedToId) {
      logTaskActivity(this.userId, 'assign', taskId, {
        previousAssignee: task.assignedToId,
        newAssignee: updates.assignedToId,
      });
    }

    // AUDIT: Log general update
    if (Object.keys(updates).length > 0) {
      logTaskActivity(this.userId, 'update', taskId, updates);
    }
  },

  /**
   * Delete a task
   *
   * SIDE EFFECTS:
   * - Updates project task counter
   * - Logs deletion
   *
   * IMPORTANT: This is a hard delete (permanent)
   * Tasks don't have a soft delete/archive because they belong to projects
   * If you want to keep old tasks, archive the project instead
   *
   * @param taskId - Task to delete
   */
  'tasks.remove'(taskId: string): void {
    check(taskId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const task = TasksCollection.findOne(taskId);
    if (!task) {
      throw new Meteor.Error('not-found', 'Task not found');
    }

    // SECURITY: Check permissions
    // NOTE: Assignees cannot delete tasks, only modify them
    const canDelete =
      canModifyTask(this.userId, task) && task.assignedToId !== this.userId;

    const user = Meteor.users.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';
    const isCreator = task.createdBy === this.userId;

    if (!isAdmin && !isCreator) {
      throw new Meteor.Error(
        'not-authorized',
        'Only task creator or admin can delete tasks'
      );
    }

    // Store project ID before deleting
    const projectId = task.projectId;

    // DELETE: Remove from database
    TasksCollection.remove(taskId);

    // SIDE EFFECT: Update project task counter
    Meteor.call('projects.updateTaskCounters', projectId);

    // AUDIT: Log deletion
    logTaskActivity(this.userId, 'delete', taskId, {
      taskTitle: task.title,
      projectId,
    });
  },

  /**
   * Assign or reassign a task to a user
   *
   * WHY SEPARATE METHOD:
   * - Common operation
   * - Additional validation needed
   * - Specific audit logging
   * - Can trigger notifications (not implemented here)
   *
   * @param taskId - Task to assign
   * @param userId - User to assign to (or null to unassign)
   */
  'tasks.assign'(taskId: string, userIdToAssign: string | null): void {
    check(taskId, String);
    check(userIdToAssign, Match.OneOf(String, null));

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const task = TasksCollection.findOne(taskId);
    if (!task) {
      throw new Meteor.Error('not-found', 'Task not found');
    }

    if (!canModifyTask(this.userId, task)) {
      throw new Meteor.Error(
        'not-authorized',
        'You do not have permission to assign this task'
      );
    }

    // VALIDATION: If assigning (not unassigning), validate user
    if (userIdToAssign) {
      const project = ProjectsCollection.findOne(task.projectId);
      if (!project) {
        throw new Meteor.Error('not-found', 'Project not found');
      }

      const assignee = Meteor.users.findOne(userIdToAssign);
      if (!assignee) {
        throw new Meteor.Error('not-found', 'User not found');
      }

      const isOnTeam =
        project.ownerId === userIdToAssign ||
        project.teamMemberIds.includes(userIdToAssign);

      if (!isOnTeam) {
        throw new Meteor.Error(
          'validation-error',
          'Can only assign to project owner or team members'
        );
      }
    }

    // Store old assignee for logging
    const previousAssignee = task.assignedToId;

    // UPDATE: Change assignment
    TasksCollection.update(taskId, {
      $set: {
        assignedToId: userIdToAssign || undefined,
        updatedAt: new Date(),
      },
    });

    // AUDIT: Log assignment change
    logTaskActivity(this.userId, 'assign', taskId, {
      previousAssignee,
      newAssignee: userIdToAssign,
    });

    // TODO: Send notification to newly assigned user
    // This would typically integrate with email or push notification system
  },

  /**
   * Update task time tracking
   *
   * WHY SEPARATE METHOD:
   * - Assignees might not have full update permissions
   * - Specific use case (time logging)
   * - Could integrate with time tracking systems
   *
   * @param taskId - Task to update
   * @param actualHours - Hours to add to actual time
   */
  'tasks.logTime'(taskId: string, hoursToAdd: number): void {
    check(taskId, String);
    check(hoursToAdd, Number);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    if (hoursToAdd <= 0) {
      throw new Meteor.Error('validation-error', 'Hours must be greater than 0');
    }

    const task = TasksCollection.findOne(taskId);
    if (!task) {
      throw new Meteor.Error('not-found', 'Task not found');
    }

    // PERMISSION: Assignee or project team can log time
    const isAssignee = task.assignedToId === this.userId;
    const canModify = canModifyTask(this.userId, task);

    if (!isAssignee && !canModify) {
      throw new Meteor.Error(
        'not-authorized',
        'You do not have permission to log time on this task'
      );
    }

    // UPDATE: Increment actual hours
    // WHY $inc instead of $set:
    // - $inc adds to existing value (accumulates time)
    // - $set would replace (would lose previous time logs)
    TasksCollection.update(taskId, {
      $inc: { actualHours: hoursToAdd },
      $set: { updatedAt: new Date() },
    });

    logTaskActivity(this.userId, 'update', taskId, {
      action: 'logged time',
      hours: hoursToAdd,
    });
  },
});

/**
 * PATTERNS DEMONSTRATED:
 *
 * 1. Relationship Validation: Always validate foreign keys (projectId, assignedToId)
 * 2. Permission Granularity: Different users have different capabilities (owner vs assignee)
 * 3. Side Effects: Update denormalized data (project counters)
 * 4. Lifecycle Hooks: Special logic for status transitions
 * 5. Atomic Operations: Use $inc, $addToSet, $pull for safe concurrent updates
 * 6. Audit Trail: Log all significant changes
 * 7. Business Rules: Encode domain logic (can't assign outside team)
 */
