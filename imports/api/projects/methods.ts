/**
 * Projects Methods
 *
 * WHY METHODS INSTEAD OF DIRECT DATABASE ACCESS:
 * 1. Security: Run on server, can't be bypassed by malicious clients
 * 2. Validation: Centralized input validation
 * 3. Business Logic: Enforce rules (permissions, side effects, etc.)
 * 4. Auditability: Single place to log all changes
 * 5. Consistency: Same API for all clients (web, mobile, etc.)
 *
 * NAMING CONVENTION: 'collection.action'
 * Examples: 'projects.insert', 'projects.update', 'tasks.delete'
 * WHY: Clear, hierarchical, prevents naming collisions
 */

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { ProjectsCollection, Project, NewProject, ProjectStatus, Priority } from './index';
import { TasksCollection } from '../tasks';
import { ActivityLogsCollection } from '../activityLogs';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has permission to modify a project
 *
 * PERMISSION RULES:
 * - Owner can always modify their project
 * - Admins can modify any project
 * - Team members cannot modify (only view)
 *
 * WHY: Centralized permission logic, reused across methods
 */
function canModifyProject(userId: string | null, project: Project): boolean {
  if (!userId) return false;

  const user = Meteor.users.findOne(userId);
  if (!user) return false;

  // Admin can modify anything
  if (user.profile?.role === 'admin') return true;

  // Owner can modify their own project
  if (project.ownerId === userId) return true;

  return false;
}

/**
 * Log activity for audit trail
 *
 * WHY: Separate function for reusability
 * Called after every project modification
 */
function logActivity(
  userId: string,
  action: 'create' | 'update' | 'delete',
  projectId: string,
  changes?: any
) {
  ActivityLogsCollection.insert({
    userId,
    action,
    entityType: 'project',
    entityId: projectId,
    changes,
    createdAt: new Date(),
  });
}

// ============================================================================
// METEOR METHODS
// ============================================================================

Meteor.methods({
  /**
   * Create a new project
   *
   * SECURITY CONSIDERATIONS:
   * - Must be logged in
   * - Can only create projects for yourself (ownerId comes from server)
   * - Role must be manager or admin
   *
   * @param projectData - Project details (without _id, ownerId, dates)
   * @returns New project ID
   */
  'projects.insert'(
    projectData: Omit<NewProject, '_id' | 'ownerId' | 'createdAt' | 'metadata'>
  ): string {
    // SECURITY: Check authentication
    // WHY: this.userId is set by Meteor's DDP connection
    // Can't be spoofed by client - it's based on authentication token
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to create projects');
    }

    // SECURITY: Check user role
    const user = Meteor.users.findOne(this.userId);
    if (!user?.profile?.role || user.profile.role === 'member') {
      throw new Meteor.Error(
        'not-authorized',
        'Only managers and admins can create projects'
      );
    }

    // VALIDATION: Validate input types and constraints
    // WHY: check() throws if data doesn't match pattern
    // This prevents malformed data from entering the database
    try {
      check(projectData, {
        name: String,
        description: String,
        teamMemberIds: [String], // Array of strings
        status: Match.OneOf('active', 'completed', 'archived'),
        tags: [String],
      });
    } catch (error) {
      throw new Meteor.Error('validation-error', 'Invalid project data');
    }

    // VALIDATION: Business rules
    if (projectData.name.trim().length < 3) {
      throw new Meteor.Error('validation-error', 'Project name must be at least 3 characters');
    }

    if (projectData.name.length > 100) {
      throw new Meteor.Error('validation-error', 'Project name must be less than 100 characters');
    }

    // VALIDATION: Verify team members exist
    // WHY: Prevent broken references
    const teamMemberCount = Meteor.users.find({
      _id: { $in: projectData.teamMemberIds },
    }).count();

    if (teamMemberCount !== projectData.teamMemberIds.length) {
      throw new Meteor.Error('validation-error', 'One or more team members not found');
    }

    // CONSTRUCT: Build complete project document
    // NOTE: ownerId, createdAt, and metadata are set server-side
    // WHY: Client can't control these - prevents security issues
    const project: NewProject = {
      ...projectData,
      ownerId: this.userId, // SECURITY: Always from authenticated user
      metadata: {
        totalTasks: 0,
        completedTasks: 0,
        priority: 'medium' as Priority, // Default priority
      },
      createdAt: new Date(), // Server time, not client time
    };

    // INSERT: Add to database
    const projectId = ProjectsCollection.insert(project);

    // AUDIT: Log the creation
    logActivity(this.userId, 'create', projectId);

    // Return the new ID so client can navigate to it
    return projectId;
  },

  /**
   * Update an existing project
   *
   * IMPORTANT PATTERN: Partial updates with $set
   * WHY: We don't replace the entire document, just update specified fields
   * This prevents accidentally deleting fields
   *
   * @param projectId - Project to update
   * @param updates - Fields to update
   */
  'projects.update'(
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      tags?: string[];
      teamMemberIds?: string[];
      priority?: Priority;
    }
  ): void {
    // VALIDATION: Check input types
    check(projectId, String);
    check(updates, {
      name: Match.Maybe(String),
      description: Match.Maybe(String),
      status: Match.Maybe(Match.OneOf('active', 'completed', 'archived')),
      tags: Match.Maybe([String]),
      teamMemberIds: Match.Maybe([String]),
      priority: Match.Maybe(Match.OneOf('low', 'medium', 'high')),
    });

    // SECURITY: Must be logged in
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    // FETCH: Get existing project
    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      throw new Meteor.Error('not-found', 'Project not found');
    }

    // SECURITY: Check permissions
    if (!canModifyProject(this.userId, project)) {
      throw new Meteor.Error(
        'not-authorized',
        'You do not have permission to modify this project'
      );
    }

    // VALIDATION: If changing name, check length
    if (updates.name !== undefined) {
      if (updates.name.trim().length < 3) {
        throw new Meteor.Error('validation-error', 'Project name must be at least 3 characters');
      }
      if (updates.name.length > 100) {
        throw new Meteor.Error(
          'validation-error',
          'Project name must be less than 100 characters'
        );
      }
    }

    // VALIDATION: If changing team members, verify they exist
    if (updates.teamMemberIds) {
      const memberCount = Meteor.users.find({
        _id: { $in: updates.teamMemberIds },
      }).count();

      if (memberCount !== updates.teamMemberIds.length) {
        throw new Meteor.Error('validation-error', 'One or more team members not found');
      }
    }

    // BUILD UPDATE OBJECT
    // WHY: Use $set to update only specified fields
    // Also set updatedAt automatically
    const updateObject: any = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };

    // Handle priority update (nested in metadata)
    if (updates.priority) {
      updateObject.$set['metadata.priority'] = updates.priority;
      delete updateObject.$set.priority; // Remove from root
    }

    // UPDATE: Apply changes to database
    ProjectsCollection.update(projectId, updateObject);

    // AUDIT: Log what changed
    logActivity(this.userId, 'update', projectId, updates);
  },

  /**
   * Delete (or archive) a project
   *
   * DESIGN DECISION: Soft delete vs hard delete
   * - Soft delete: Change status to 'archived' (keeps data, can restore)
   * - Hard delete: Actually remove from database (permanent)
   *
   * WHY SOFT DELETE BY DEFAULT:
   * - Accidental deletions can be recovered
   * - Maintains referential integrity (tasks still reference project)
   * - Preserves history for auditing
   *
   * @param projectId - Project to delete
   * @param hard - If true, permanently delete. If false, archive.
   */
  'projects.remove'(projectId: string, hard: boolean = false): void {
    check(projectId, String);
    check(hard, Boolean);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      throw new Meteor.Error('not-found', 'Project not found');
    }

    // SECURITY: Only owner or admin can delete
    if (!canModifyProject(this.userId, project)) {
      throw new Meteor.Error(
        'not-authorized',
        'You do not have permission to delete this project'
      );
    }

    if (hard) {
      // HARD DELETE: Permanently remove
      // WARNING: This breaks references from tasks
      // In production, you'd want to either:
      // 1. Delete all related tasks first
      // 2. Prevent deletion if tasks exist
      // 3. Use cascade delete patterns

      const taskCount = TasksCollection.find({ projectId }).count();
      if (taskCount > 0) {
        throw new Meteor.Error(
          'validation-error',
          `Cannot delete project with ${taskCount} tasks. Archive instead or delete tasks first.`
        );
      }

      ProjectsCollection.remove(projectId);
      logActivity(this.userId, 'delete', projectId);
    } else {
      // SOFT DELETE: Archive
      // This is safer and reversible
      ProjectsCollection.update(projectId, {
        $set: {
          status: 'archived' as ProjectStatus,
          updatedAt: new Date(),
        },
      });
      logActivity(this.userId, 'update', projectId, { status: 'archived' });
    }
  },

  /**
   * Add team member to project
   *
   * WHY SEPARATE METHOD:
   * Common operation that deserves its own endpoint
   * Clearer than generic update
   * Easier to add business logic (notifications, validation)
   *
   * @param projectId - Project to modify
   * @param userId - User to add to team
   */
  'projects.addTeamMember'(projectId: string, userIdToAdd: string): void {
    check(projectId, String);
    check(userIdToAdd, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      throw new Meteor.Error('not-found', 'Project not found');
    }

    if (!canModifyProject(this.userId, project)) {
      throw new Meteor.Error('not-authorized', 'You do not have permission to modify this project');
    }

    // VALIDATION: User exists
    const userToAdd = Meteor.users.findOne(userIdToAdd);
    if (!userToAdd) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    // VALIDATION: Not already a team member
    if (project.teamMemberIds.includes(userIdToAdd)) {
      throw new Meteor.Error('validation-error', 'User is already a team member');
    }

    // UPDATE: Use $addToSet to add to array
    // WHY $addToSet vs $push:
    // - $addToSet: Only adds if not already present (prevents duplicates)
    // - $push: Always adds (can create duplicates)
    ProjectsCollection.update(projectId, {
      $addToSet: { teamMemberIds: userIdToAdd },
      $set: { updatedAt: new Date() },
    });

    logActivity(this.userId, 'update', projectId, {
      action: 'added team member',
      userId: userIdToAdd,
    });
  },

  /**
   * Remove team member from project
   *
   * @param projectId - Project to modify
   * @param userId - User to remove from team
   */
  'projects.removeTeamMember'(projectId: string, userIdToRemove: string): void {
    check(projectId, String);
    check(userIdToRemove, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }

    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      throw new Meteor.Error('not-found', 'Project not found');
    }

    if (!canModifyProject(this.userId, project)) {
      throw new Meteor.Error('not-authorized', 'You do not have permission to modify this project');
    }

    // VALIDATION: Can't remove owner
    if (project.ownerId === userIdToRemove) {
      throw new Meteor.Error('validation-error', 'Cannot remove project owner from team');
    }

    // UPDATE: Use $pull to remove from array
    ProjectsCollection.update(projectId, {
      $pull: { teamMemberIds: userIdToRemove },
      $set: { updatedAt: new Date() },
    });

    logActivity(this.userId, 'update', projectId, {
      action: 'removed team member',
      userId: userIdToRemove,
    });
  },

  /**
   * Update project task counters
   *
   * WHY SEPARATE METHOD:
   * Called automatically when tasks are created/updated/deleted
   * Maintains denormalized counters in project.metadata
   *
   * TRADEOFF:
   * - Pro: Fast dashboard queries (no need to count tasks)
   * - Con: Must keep counters in sync (complexity)
   *
   * NOTE: This is an internal method, not typically called by clients
   *
   * @param projectId - Project to update counters for
   */
  'projects.updateTaskCounters'(projectId: string): void {
    check(projectId, String);

    // NOTE: We don't check permissions here because this is called
    // by other methods after they've already checked permissions

    const totalTasks = TasksCollection.find({ projectId }).count();
    const completedTasks = TasksCollection.find({
      projectId,
      status: 'done',
    }).count();

    ProjectsCollection.update(projectId, {
      $set: {
        'metadata.totalTasks': totalTasks,
        'metadata.completedTasks': completedTasks,
        updatedAt: new Date(),
      },
    });
  },
});

/**
 * COMMON PATTERNS TO NOTE:
 *
 * 1. Always check authentication first (this.userId)
 * 2. Validate inputs with check()
 * 3. Fetch entity and verify it exists
 * 4. Check permissions
 * 5. Validate business rules
 * 6. Perform database operation
 * 7. Log activity for audit trail
 *
 * This pattern repeats across all methods and provides:
 * - Security (authentication + authorization)
 * - Data integrity (validation)
 * - Auditability (logging)
 * - Error handling (meaningful error messages)
 */
