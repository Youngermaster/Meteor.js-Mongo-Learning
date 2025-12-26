/**
 * Meteor Publications
 *
 * WHY PUBLICATIONS:
 * In Meteor, publications control what data is sent to clients via DDP.
 * They're like "live queries" - data updates automatically when DB changes.
 *
 * DDP (Distributed Data Protocol):
 * - Websocket-based protocol for real-time data sync
 * - Automatically sends updates when subscribed data changes
 * - Maintains a client-side cache (MiniMongo) that mirrors server data
 *
 * WHEN TO USE DDP (Publications):
 * ✅ Real-time dashboards (task status updates)
 * ✅ Collaborative editing (multiple users on same project)
 * ✅ Live notifications/feeds
 * ✅ Small datasets that change frequently
 *
 * WHEN NOT TO USE DDP:
 * ❌ Large datasets (use pagination or Methods instead)
 * ❌ One-time data fetches (use Methods)
 * ❌ Historical reports (use Methods with aggregation)
 * ❌ File downloads/exports (use HTTP endpoints)
 *
 * PERFORMANCE CRITICAL:
 * - Always limit results
 * - Always use field projections
 * - Always filter by user permissions
 * - Consider indexes for query patterns
 */

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { ProjectsCollection } from '../projects';
import { TasksCollection } from '../tasks';
import { ActivityLogsCollection } from '../activityLogs';
import { UsersCollection } from '../users';

// ============================================================================
// PUBLICATIONS ONLY RUN ON SERVER
// ============================================================================

if (Meteor.isServer) {
  // ==========================================================================
  // USER PUBLICATIONS
  // ==========================================================================

  /**
   * Publish current user's profile data
   *
   * WHY: User needs their own data for UI (name, role, avatar)
   *
   * SECURITY: Only publishes the logged-in user's data
   *
   * FIELDS: Limited to safe fields (no password hashes, no services)
   */
  Meteor.publish('users.current', function () {
    // this.userId is set by Meteor's DDP authentication
    // It's null if user is not logged in
    if (!this.userId) {
      // return this.ready() to close the subscription without error
      return this.ready();
    }

    // SECURITY: Only return current user's data
    return UsersCollection.find(
      { _id: this.userId },
      {
        fields: {
          username: 1,
          emails: 1,
          profile: 1,
          createdAt: 1,
          // NOTE: services field is automatically excluded by Meteor
          // It contains password hashes and OAuth tokens
        },
      }
    );
  });

  /**
   * Publish team member data for a project
   *
   * WHY: Need user names/avatars to display in project team lists
   *
   * SECURITY: Only if user has access to the project
   *
   * PERFORMANCE: Field projection (only name and avatar)
   *
   * @param projectId - Project to get team members for
   */
  Meteor.publish('users.projectTeam', function (projectId: string) {
    check(projectId, String);

    if (!this.userId) {
      return this.ready();
    }

    // SECURITY: Verify user has access to this project
    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      return this.ready();
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    if (!hasAccess) {
      const user = UsersCollection.findOne(this.userId);
      const isAdmin = user?.profile?.role === 'admin';
      if (!isAdmin) {
        return this.ready();
      }
    }

    // Get all team members (owner + team)
    const teamUserIds = [project.ownerId, ...project.teamMemberIds];

    // PERFORMANCE: Only return needed fields
    return UsersCollection.find(
      { _id: { $in: teamUserIds } },
      {
        fields: {
          username: 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          'profile.avatar': 1,
          'profile.role': 1,
        },
      }
    );
  });

  /**
   * Publish list of all users (for assignment dropdowns)
   *
   * WHY: Managers/admins need to see all users to assign tasks
   *
   * SECURITY: Only for managers and admins
   *
   * PERFORMANCE:
   * - Limited fields (just identification data)
   * - Could add pagination for large teams
   */
  Meteor.publish('users.list', function () {
    if (!this.userId) {
      return this.ready();
    }

    const user = UsersCollection.findOne(this.userId);
    if (!user?.profile?.role) {
      return this.ready();
    }

    // SECURITY: Only managers and admins can see all users
    if (user.profile.role === 'member') {
      return this.ready();
    }

    return UsersCollection.find(
      {},
      {
        fields: {
          username: 1,
          emails: 1,
          'profile.firstName': 1,
          'profile.lastName': 1,
          'profile.avatar': 1,
          'profile.role': 1,
        },
        sort: { username: 1 },
        limit: 100, // SAFETY: Prevent sending thousands of users
      }
    );
  });

  // ==========================================================================
  // PROJECT PUBLICATIONS
  // ==========================================================================

  /**
   * Publish projects owned by current user
   *
   * WHY: User's "My Projects" page
   *
   * PERFORMANCE:
   * - Filtered by ownerId (indexed)
   * - Sorted by most recent first
   * - Limited to prevent excessive data
   */
  Meteor.publish('projects.owned', function () {
    if (!this.userId) {
      return this.ready();
    }

    return ProjectsCollection.find(
      {
        ownerId: this.userId,
        status: { $in: ['active', 'completed'] }, // Exclude archived
      },
      {
        sort: { createdAt: -1 },
        limit: 50, // PERFORMANCE: Reasonable limit
      }
    );
  });

  /**
   * Publish projects where user is a team member
   *
   * WHY: User's "Team Projects" page
   *
   * PERFORMANCE:
   * - teamMemberIds is indexed (multi-key index)
   * - MongoDB efficiently finds projects containing userId
   */
  Meteor.publish('projects.memberOf', function () {
    if (!this.userId) {
      return this.ready();
    }

    return ProjectsCollection.find(
      {
        teamMemberIds: this.userId, // MongoDB matches if array contains this value
        status: { $in: ['active', 'completed'] },
      },
      {
        sort: { createdAt: -1 },
        limit: 50,
      }
    );
  });

  /**
   * Publish a single project by ID
   *
   * WHY: Project detail page
   *
   * SECURITY: Only if user has access (owner, team member, or admin)
   *
   * @param projectId - Project to publish
   */
  Meteor.publish('projects.single', function (projectId: string) {
    check(projectId, String);

    if (!this.userId) {
      return this.ready();
    }

    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      return this.ready();
    }

    // SECURITY: Check access
    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      return this.ready();
    }

    return ProjectsCollection.find({ _id: projectId });
  });

  /**
   * Publish all active projects (admin only)
   *
   * WHY: Admin dashboard
   *
   * SECURITY: Only admins
   */
  Meteor.publish('projects.all', function () {
    if (!this.userId) {
      return this.ready();
    }

    const user = UsersCollection.findOne(this.userId);
    if (user?.profile?.role !== 'admin') {
      return this.ready();
    }

    return ProjectsCollection.find(
      { status: 'active' },
      {
        sort: { createdAt: -1 },
        limit: 100, // Even admins shouldn't load everything
      }
    );
  });

  // ==========================================================================
  // TASK PUBLICATIONS
  // ==========================================================================

  /**
   * Publish tasks for a specific project
   *
   * WHY: Project detail page, kanban board
   *
   * SECURITY: Only if user has access to the project
   *
   * PERFORMANCE:
   * - Compound index: { projectId: 1, status: 1, dueDate: 1 }
   * - This query uses that index efficiently
   *
   * @param projectId - Project to get tasks for
   */
  Meteor.publish('tasks.byProject', function (projectId: string) {
    check(projectId, String);

    if (!this.userId) {
      return this.ready();
    }

    // SECURITY: Verify access to project
    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      return this.ready();
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      return this.ready();
    }

    // Return all tasks for this project
    return TasksCollection.find(
      { projectId },
      {
        sort: { createdAt: -1 },
        limit: 200, // Reasonable limit per project
      }
    );
  });

  /**
   * Publish tasks assigned to current user
   *
   * WHY: User's "My Tasks" page
   *
   * OPTIMIZATION: This is a HOT query path (frequently accessed)
   * - Compound index: { assignedToId: 1, status: 1, dueDate: 1 }
   * - Sparse index (only tasks with assignedToId)
   *
   * REAL-TIME VALUE: High!
   * When someone assigns you a task, it appears immediately
   */
  Meteor.publish('tasks.assignedToMe', function () {
    if (!this.userId) {
      return this.ready();
    }

    return TasksCollection.find(
      {
        assignedToId: this.userId,
        status: { $ne: 'done' }, // Exclude completed tasks
      },
      {
        sort: { dueDate: 1 }, // Soonest due date first
        limit: 100,
      }
    );
  });

  /**
   * Publish tasks assigned to current user (including completed)
   *
   * WHY: User's task history / "All My Tasks" page
   *
   * DIFFERENCE from assignedToMe: Includes completed tasks
   */
  Meteor.publish('tasks.assignedToMeAll', function () {
    if (!this.userId) {
      return this.ready();
    }

    return TasksCollection.find(
      { assignedToId: this.userId },
      {
        sort: { createdAt: -1 },
        limit: 200, // Larger limit for history view
      }
    );
  });

  /**
   * Publish tasks created by current user
   *
   * WHY: User's "Tasks I Created" page
   */
  Meteor.publish('tasks.createdByMe', function () {
    if (!this.userId) {
      return this.ready();
    }

    return TasksCollection.find(
      { createdBy: this.userId },
      {
        sort: { createdAt: -1 },
        limit: 100,
      }
    );
  });

  /**
   * Publish a single task by ID
   *
   * WHY: Task detail page/modal
   *
   * SECURITY: Only if user has access to the parent project
   *
   * @param taskId - Task to publish
   */
  Meteor.publish('tasks.single', function (taskId: string) {
    check(taskId, String);

    if (!this.userId) {
      return this.ready();
    }

    const task = TasksCollection.findOne(taskId);
    if (!task) {
      return this.ready();
    }

    // Check project access
    const project = ProjectsCollection.findOne(task.projectId);
    if (!project) {
      return this.ready();
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      return this.ready();
    }

    return TasksCollection.find({ _id: taskId });
  });

  /**
   * Publish overdue tasks for current user
   *
   * WHY: Dashboard "Overdue" section
   *
   * PERFORMANCE:
   * - Index: { dueDate: 1, status: 1 }
   * - Efficient date range query
   *
   * REAL-TIME VALUE: Medium
   * Tasks become overdue automatically when date passes
   */
  Meteor.publish('tasks.myOverdue', function () {
    if (!this.userId) {
      return this.ready();
    }

    return TasksCollection.find(
      {
        assignedToId: this.userId,
        status: { $nin: ['done'] },
        dueDate: { $lt: new Date() }, // Due date in the past
      },
      {
        sort: { dueDate: 1 }, // Oldest overdue first
        limit: 50,
      }
    );
  });

  // ==========================================================================
  // ACTIVITY LOG PUBLICATIONS
  // ==========================================================================

  /**
   * Publish recent activity for current user
   *
   * WHY: User's activity feed / "What I did recently"
   *
   * PERFORMANCE:
   * - Index: { userId: 1, createdAt: -1 }
   * - Efficient for time-series queries
   *
   * TTL NOTE: Activity logs older than 90 days are auto-deleted
   */
  Meteor.publish('activityLogs.mine', function (limit: number = 20) {
    check(limit, Number);

    if (!this.userId) {
      return this.ready();
    }

    // VALIDATION: Reasonable limit
    const safeLimit = Math.min(limit, 100);

    return ActivityLogsCollection.find(
      { userId: this.userId },
      {
        sort: { createdAt: -1 },
        limit: safeLimit,
      }
    );
  });

  /**
   * Publish activity for a specific project
   *
   * WHY: Project activity timeline
   *
   * SECURITY: Only if user has access to project
   *
   * @param projectId - Project to get activity for
   */
  Meteor.publish('activityLogs.forProject', function (projectId: string, limit: number = 50) {
    check(projectId, String);
    check(limit, Number);

    if (!this.userId) {
      return this.ready();
    }

    // SECURITY: Check project access
    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      return this.ready();
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      return this.ready();
    }

    const safeLimit = Math.min(limit, 200);

    return ActivityLogsCollection.find(
      {
        entityType: 'project',
        entityId: projectId,
      },
      {
        sort: { createdAt: -1 },
        limit: safeLimit,
      }
    );
  });

  /**
   * Publish activity for a specific task
   *
   * WHY: Task history / "What changed on this task"
   *
   * @param taskId - Task to get activity for
   */
  Meteor.publish('activityLogs.forTask', function (taskId: string) {
    check(taskId, String);

    if (!this.userId) {
      return this.ready();
    }

    // SECURITY: Check task access via project
    const task = TasksCollection.findOne(taskId);
    if (!task) {
      return this.ready();
    }

    const project = ProjectsCollection.findOne(task.projectId);
    if (!project) {
      return this.ready();
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      return this.ready();
    }

    return ActivityLogsCollection.find(
      {
        entityType: 'task',
        entityId: taskId,
      },
      {
        sort: { createdAt: -1 },
        limit: 100, // Tasks typically have less activity than projects
      }
    );
  });

  /**
   * Publish recent activity across all projects user has access to
   *
   * WHY: Dashboard "Recent Activity" feed
   *
   * PERFORMANCE CONSIDERATION:
   * This is potentially expensive because it needs to:
   * 1. Find all projects user has access to
   * 2. Find all tasks in those projects
   * 3. Find activity for those entities
   *
   * OPTIMIZATION: We limit aggressively and could cache project/task IDs
   */
  Meteor.publish('activityLogs.dashboard', function (limit: number = 20) {
    check(limit, Number);

    if (!this.userId) {
      return this.ready();
    }

    const safeLimit = Math.min(limit, 50);

    // Get projects user has access to
    const projects = ProjectsCollection.find({
      $or: [
        { ownerId: this.userId },
        { teamMemberIds: this.userId },
      ],
    }).fetch();

    const projectIds = projects.map((p) => p._id);

    // Get tasks in those projects
    const tasks = TasksCollection.find({
      projectId: { $in: projectIds },
    }).fetch();

    const taskIds = tasks.map((t) => t._id);

    // Get activity for projects and tasks
    return ActivityLogsCollection.find(
      {
        $or: [
          { entityType: 'project', entityId: { $in: projectIds } },
          { entityType: 'task', entityId: { $in: taskIds } },
        ],
      },
      {
        sort: { createdAt: -1 },
        limit: safeLimit,
      }
    );
  });

  // ==========================================================================
  // COMPOSITE PUBLICATIONS
  // ==========================================================================

  /**
   * Publish project with its tasks (composite subscription)
   *
   * WHY: Project detail page needs both project and tasks
   * Instead of two subscriptions, combine them
   *
   * BENEFIT: Single subscription handle, atomic loading state
   *
   * @param projectId - Project to publish with tasks
   */
  Meteor.publish('projects.withTasks', function (projectId: string) {
    check(projectId, String);

    if (!this.userId) {
      return this.ready();
    }

    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      return this.ready();
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      return this.ready();
    }

    // Return array of cursors - Meteor merges them into one subscription
    return [
      ProjectsCollection.find({ _id: projectId }),
      TasksCollection.find({ projectId }, { limit: 200 }),
    ];
  });
}

/**
 * PUBLICATION PATTERNS DEMONSTRATED:
 *
 * 1. Security First: Every publication checks authentication and authorization
 * 2. Field Projections: Limit fields to what's needed (especially for users)
 * 3. Limits: Always set reasonable limits to prevent memory issues
 * 4. Indexes: Queries match our index structure for performance
 * 5. this.ready(): Return empty subscription instead of throwing errors
 * 6. Composite Publications: Return multiple cursors for related data
 * 7. Parameter Validation: Use check() to validate all parameters
 * 8. DDP Use Cases: Focus on real-time, small datasets
 *
 * ANTI-PATTERNS TO AVOID:
 *
 * ❌ Publishing entire collections: Meteor.publish('all', () => Collection.find({}))
 * ❌ No limits: Can send thousands of documents to client
 * ❌ No field filtering: Sends unnecessary data, privacy risk
 * ❌ No security checks: Anyone can subscribe to anything
 * ❌ Complex joins: Use Methods with aggregation instead
 * ❌ Large datasets: Use pagination with Methods instead
 */
