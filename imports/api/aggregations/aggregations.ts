/**
 * MongoDB Aggregation Pipeline Examples
 *
 * WHY AGGREGATIONS:
 * - Complex data transformations
 * - Analytics and reporting
 * - Data that doesn't fit DDP patterns (not reactive, computed)
 * - Performance: Aggregation runs on database server (faster than client-side processing)
 *
 * WHEN TO USE:
 * ✅ Statistics and dashboards (counts, averages, grouping)
 * ✅ Reports (complex queries with multiple stages)
 * ✅ Data transformations (reshaping, joining)
 * ✅ One-time queries (not real-time data)
 *
 * WHEN NOT TO USE:
 * ❌ Simple queries (use .find() instead)
 * ❌ Real-time data (use publications instead)
 * ❌ CRUD operations (use methods instead)
 *
 * AGGREGATION PIPELINE:
 * Think of it like Unix pipes: data flows through stages
 * db.collection.aggregate([stage1, stage2, stage3])
 *
 * COMMON STAGES:
 * - $match: Filter documents (like .find())
 * - $group: Group by field and compute aggregates
 * - $project: Select/transform fields
 * - $sort: Sort results
 * - $limit: Limit results
 * - $lookup: Join with another collection
 * - $unwind: Deconstruct array fields
 */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { TasksCollection } from '../tasks';
import { ProjectsCollection } from '../projects';
import { ActivityLogsCollection } from '../activityLogs';
import { UsersCollection } from '../users';

// ============================================================================
// AGGREGATION HELPER FUNCTIONS
// ============================================================================

/**
 * Get user statistics
 *
 * EXAMPLE USE: User profile page, personal dashboard
 *
 * RETURNS:
 * {
 *   totalTasksAssigned: 15,
 *   tasksByStatus: { todo: 5, in_progress: 7, review: 1, done: 2 },
 *   tasksByPriority: { low: 3, medium: 10, high: 2 },
 *   averageCompletionTime: 3.5, // days
 *   overdueCount: 2
 * }
 *
 * @param userId - User to get stats for
 */
export async function getUserStatistics(userId: string) {
  check(userId, String);

  // AGGREGATION 1: Count tasks by status
  // STAGES:
  // 1. $match: Filter to user's tasks
  // 2. $group: Group by status and count
  const tasksByStatus = await TasksCollection.rawCollection()
    .aggregate([
      {
        // Stage 1: Filter to this user's tasks
        $match: {
          assignedToId: userId,
        },
      },
      {
        // Stage 2: Group by status
        // _id: The field to group by
        // count: Accumulator - counts documents in each group
        $group: {
          _id: '$status', // Group by status field
          count: { $sum: 1 }, // Count each document as 1
        },
      },
      {
        // Stage 3: Sort by status for consistent output
        $sort: { _id: 1 },
      },
    ])
    .toArray();

  // Transform array to object for easier access
  const statusCounts = tasksByStatus.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      return acc;
    },
    { todo: 0, in_progress: 0, review: 0, done: 0 }
  );

  // AGGREGATION 2: Count tasks by priority
  const tasksByPriority = await TasksCollection.rawCollection()
    .aggregate([
      { $match: { assignedToId: userId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const priorityCounts = tasksByPriority.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  // AGGREGATION 3: Average completion time
  // CHALLENGE: Calculate days between createdAt and completedAt
  // ONLY for completed tasks
  const completionTimes = await TasksCollection.rawCollection()
    .aggregate([
      {
        $match: {
          assignedToId: userId,
          status: 'done',
          completedAt: { $exists: true },
        },
      },
      {
        // Stage: Project - create calculated fields
        $project: {
          // Calculate difference in milliseconds
          completionTime: {
            $subtract: ['$completedAt', '$createdAt'],
          },
        },
      },
      {
        // Stage: Group - calculate average
        $group: {
          _id: null, // null means group all documents together
          avgTime: { $avg: '$completionTime' },
        },
      },
    ])
    .toArray();

  // Convert milliseconds to days
  const avgCompletionMs = completionTimes[0]?.avgTime || 0;
  const avgCompletionDays = avgCompletionMs / (1000 * 60 * 60 * 24);

  // AGGREGATION 4: Count overdue tasks
  const overdueCount = await TasksCollection.find({
    assignedToId: userId,
    status: { $nin: ['done'] },
    dueDate: { $lt: new Date() },
  }).countAsync();

  // Total tasks assigned
  const totalTasks = await TasksCollection.find({ assignedToId: userId }).countAsync();

  return {
    totalTasksAssigned: totalTasks,
    tasksByStatus: statusCounts,
    tasksByPriority: priorityCounts,
    averageCompletionDays: Math.round(avgCompletionDays * 10) / 10, // Round to 1 decimal
    overdueCount,
  };
}

/**
 * Get project dashboard statistics
 *
 * EXAMPLE USE: Project detail page dashboard
 *
 * RETURNS:
 * {
 *   totalTasks: 50,
 *   tasksByStatus: {...},
 *   tasksByAssignee: [{userId: 'abc', count: 10, name: 'John'}, ...],
 *   completionRate: 0.6, // 60% of tasks done
 *   averageEstimatedHours: 5.5,
 *   totalActualHours: 120
 * }
 *
 * @param projectId - Project to get stats for
 */
export async function getProjectStatistics(projectId: string) {
  check(projectId, String);

  // Total tasks in project
  const totalTasks = await TasksCollection.find({ projectId }).countAsync();

  // Tasks by status
  const tasksByStatus = await TasksCollection.rawCollection()
    .aggregate([
      { $match: { projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  const statusCounts = tasksByStatus.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      return acc;
    },
    { todo: 0, in_progress: 0, review: 0, done: 0 }
  );

  // AGGREGATION: Tasks by assignee (with user info)
  // ADVANCED: Uses $lookup to join with users collection
  const tasksByAssignee = await TasksCollection.rawCollection()
    .aggregate([
      {
        $match: { projectId, assignedToId: { $exists: true } },
      },
      {
        $group: {
          _id: '$assignedToId',
          count: { $sum: 1 },
        },
      },
      {
        // STAGE: $lookup - Join with users collection
        // Similar to SQL JOIN
        $lookup: {
          from: 'users', // Collection to join with
          localField: '_id', // Field from tasks (assignedToId)
          foreignField: '_id', // Field from users
          as: 'user', // Output array field name
        },
      },
      {
        // STAGE: $unwind - Deconstruct the user array
        // $lookup returns an array, we want a single object
        $unwind: '$user',
      },
      {
        // STAGE: $project - Select and format output fields
        $project: {
          userId: '$_id',
          count: 1,
          name: {
            $concat: [
              '$user.profile.firstName',
              ' ',
              '$user.profile.lastName',
            ],
          },
        },
      },
      {
        $sort: { count: -1 }, // Most tasks first
      },
    ])
    .toArray();

  // Completion rate
  const completedTasks = statusCounts.done;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // AGGREGATION: Sum of estimated and actual hours
  const hourStats = await TasksCollection.rawCollection()
    .aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalEstimated: { $sum: '$estimatedHours' },
          totalActual: { $sum: '$actualHours' },
          avgEstimated: { $avg: '$estimatedHours' },
        },
      },
    ])
    .toArray();

  const hours = hourStats[0] || { totalEstimated: 0, totalActual: 0, avgEstimated: 0 };

  return {
    totalTasks,
    tasksByStatus: statusCounts,
    tasksByAssignee,
    completionRate: Math.round(completionRate * 100) / 100,
    totalEstimatedHours: hours.totalEstimated || 0,
    totalActualHours: hours.totalActual || 0,
    averageEstimatedHours: Math.round((hours.avgEstimated || 0) * 10) / 10,
  };
}

/**
 * Get team performance analytics
 *
 * EXAMPLE USE: Manager dashboard, team reports
 *
 * RETURNS: Array of user performance metrics
 * [
 *   {
 *     userId: 'abc',
 *     name: 'John Doe',
 *     tasksCompleted: 25,
 *     tasksInProgress: 5,
 *     averageCompletionDays: 2.5,
 *     onTimeRate: 0.8 // 80% completed before due date
 *   },
 *   ...
 * ]
 *
 * @param projectId - Optional: Limit to specific project
 */
export async function getTeamPerformance(projectId?: string) {
  if (projectId) check(projectId, String);

  // Build match criteria
  const matchCriteria: any = {};
  if (projectId) {
    matchCriteria.projectId = projectId;
  }

  // COMPLEX AGGREGATION: Multi-stage pipeline
  const performance = await TasksCollection.rawCollection()
    .aggregate([
      {
        // Stage 1: Filter tasks (optionally by project)
        $match: {
          ...matchCriteria,
          assignedToId: { $exists: true },
        },
      },
      {
        // Stage 2: Group by user
        $group: {
          _id: '$assignedToId',
          tasksTotal: { $sum: 1 },
          tasksCompleted: {
            // Conditional sum: only count if status is 'done'
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
          },
          tasksInProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] },
          },
          // Calculate average completion time
          completedTasks: {
            $push: {
              $cond: [
                { $eq: ['$status', 'done'] },
                {
                  created: '$createdAt',
                  completed: '$completedAt',
                  dueDate: '$dueDate',
                },
                '$$REMOVE', // Don't include if not completed
              ],
            },
          },
        },
      },
      {
        // Stage 3: Join with users for names
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        // Stage 4: Project final shape
        $project: {
          userId: '$_id',
          name: {
            $concat: [
              '$user.profile.firstName',
              ' ',
              '$user.profile.lastName',
            ],
          },
          tasksTotal: 1,
          tasksCompleted: 1,
          tasksInProgress: 1,
          completedTasks: 1,
        },
      },
      {
        $sort: { tasksCompleted: -1 }, // Top performers first
      },
    ])
    .toArray();

  // Post-processing: Calculate average completion time
  // WHY NOT IN AGGREGATION: Date math is complex, easier in JavaScript
  const results = performance.map((user) => {
    const completed = user.completedTasks.filter(
      (t: any) => t.created && t.completed
    );

    let avgCompletionDays = 0;
    let onTimeCount = 0;

    if (completed.length > 0) {
      const totalMs = completed.reduce((sum: number, task: any) => {
        const diff = task.completed.getTime() - task.created.getTime();

        // Check if completed before due date
        if (task.dueDate && task.completed <= task.dueDate) {
          onTimeCount++;
        }

        return sum + diff;
      }, 0);

      avgCompletionDays = totalMs / completed.length / (1000 * 60 * 60 * 24);
    }

    const onTimeRate = completed.length > 0 ? onTimeCount / completed.length : 0;

    return {
      userId: user.userId,
      name: user.name,
      tasksTotal: user.tasksTotal,
      tasksCompleted: user.tasksCompleted,
      tasksInProgress: user.tasksInProgress,
      averageCompletionDays: Math.round(avgCompletionDays * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
    };
  });

  return results;
}

/**
 * Get activity timeline for a project or user
 *
 * EXAMPLE USE: Activity feed, audit logs
 *
 * RETURNS:
 * [
 *   {
 *     date: '2024-01-15',
 *     actions: {
 *       create: 5,
 *       update: 12,
 *       delete: 1,
 *       complete: 3
 *     }
 *   },
 *   ...
 * ]
 *
 * @param options - Filter by userId or entityId
 */
export async function getActivityTimeline(options: {
  userId?: string;
  entityId?: string;
  days?: number;
}) {
  const { userId, entityId, days = 30 } = options;

  // Calculate date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Build match criteria
  const matchCriteria: any = {
    createdAt: { $gte: startDate },
  };
  if (userId) matchCriteria.userId = userId;
  if (entityId) matchCriteria.entityId = entityId;

  // AGGREGATION: Group by date and action type
  const timeline = await ActivityLogsCollection.rawCollection()
    .aggregate([
      { $match: matchCriteria },
      {
        // Stage: $project - Extract date without time
        $project: {
          // Create a date string (YYYY-MM-DD) for grouping
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          action: 1,
        },
      },
      {
        // Stage: Group by date
        $group: {
          _id: '$date',
          // Count each action type
          creates: {
            $sum: { $cond: [{ $eq: ['$action', 'create'] }, 1, 0] },
          },
          updates: {
            $sum: { $cond: [{ $eq: ['$action', 'update'] }, 1, 0] },
          },
          deletes: {
            $sum: { $cond: [{ $eq: ['$action', 'delete'] }, 1, 0] },
          },
          completes: {
            $sum: { $cond: [{ $eq: ['$action', 'complete'] }, 1, 0] },
          },
          assigns: {
            $sum: { $cond: [{ $eq: ['$action', 'assign'] }, 1, 0] },
          },
        },
      },
      {
        $sort: { _id: -1 }, // Most recent first
      },
    ])
    .toArray();

  return timeline.map((day) => ({
    date: day._id,
    actions: {
      create: day.creates,
      update: day.updates,
      delete: day.deletes,
      complete: day.completes,
      assign: day.assigns,
    },
  }));
}

/**
 * Get task priority distribution across all projects
 *
 * EXAMPLE USE: Strategic planning, capacity analysis
 *
 * WHY: Understand if team is focused on the right priorities
 */
export async function getPriorityDistribution() {
  const distribution = await TasksCollection.rawCollection()
    .aggregate([
      {
        $match: {
          status: { $ne: 'done' }, // Only active tasks
        },
      },
      {
        $group: {
          _id: {
            priority: '$priority',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.priority': -1, '_id.status': 1 },
      },
    ])
    .toArray();

  // Transform to nested structure
  const result: any = {
    high: { todo: 0, in_progress: 0, review: 0 },
    medium: { todo: 0, in_progress: 0, review: 0 },
    low: { todo: 0, in_progress: 0, review: 0 },
  };

  distribution.forEach((item) => {
    const priority = item._id.priority;
    const status = item._id.status;
    if (result[priority] && result[priority][status] !== undefined) {
      result[priority][status] = item.count;
    }
  });

  return result;
}

// ============================================================================
// METEOR METHODS FOR AGGREGATIONS
// ============================================================================

/**
 * Expose aggregations as Meteor Methods
 *
 * WHY METHODS INSTEAD OF PUBLICATIONS:
 * - Aggregations are not reactive (no real-time updates needed)
 * - Computationally expensive (run once, not continuously)
 * - Return computed data, not raw documents
 * - Client calls when needed (on-demand)
 */

Meteor.methods({
  /**
   * Get statistics for current user
   */
  async 'aggregations.getUserStatistics'() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    return await getUserStatistics(this.userId);
  },

  /**
   * Get project dashboard statistics
   */
  async 'aggregations.getProjectStatistics'(projectId: string) {
    check(projectId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    // SECURITY: Verify access to project
    const project = ProjectsCollection.findOne(projectId);
    if (!project) {
      throw new Meteor.Error('not-found', 'Project not found');
    }

    const hasAccess =
      project.ownerId === this.userId ||
      project.teamMemberIds.includes(this.userId);

    const user = UsersCollection.findOne(this.userId);
    const isAdmin = user?.profile?.role === 'admin';

    if (!hasAccess && !isAdmin) {
      throw new Meteor.Error('not-authorized', 'No access to this project');
    }

    return await getProjectStatistics(projectId);
  },

  /**
   * Get team performance metrics
   */
  async 'aggregations.getTeamPerformance'(projectId?: string) {
    if (projectId) check(projectId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    // SECURITY: Check role (managers and admins only)
    const user = UsersCollection.findOne(this.userId);
    if (user?.profile?.role === 'member') {
      throw new Meteor.Error(
        'not-authorized',
        'Only managers and admins can view team performance'
      );
    }

    return await getTeamPerformance(projectId);
  },

  /**
   * Get activity timeline
   */
  async 'aggregations.getActivityTimeline'(options: {
    userId?: string;
    entityId?: string;
    days?: number;
  }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    // If requesting another user's activity, must be admin
    if (options.userId && options.userId !== this.userId) {
      const user = UsersCollection.findOne(this.userId);
      if (user?.profile?.role !== 'admin') {
        throw new Meteor.Error('not-authorized', 'Cannot view other users activity');
      }
    }

    return await getActivityTimeline(options);
  },

  /**
   * Get priority distribution
   */
  async 'aggregations.getPriorityDistribution'() {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'Must be logged in');
    }

    return await getPriorityDistribution();
  },
});

/**
 * KEY AGGREGATION CONCEPTS DEMONSTRATED:
 *
 * 1. $match: Filtering documents (like WHERE in SQL)
 * 2. $group: Grouping and aggregating (like GROUP BY in SQL)
 * 3. $project: Selecting and transforming fields (like SELECT in SQL)
 * 4. $lookup: Joining collections (like JOIN in SQL)
 * 5. $unwind: Deconstructing arrays
 * 6. $sort: Sorting results (like ORDER BY in SQL)
 * 7. $sum, $avg, $min, $max: Aggregation operators
 * 8. $cond: Conditional logic
 * 9. $dateToString: Date formatting
 * 10. rawCollection(): Direct MongoDB driver access for aggregations
 *
 * PERFORMANCE TIPS:
 *
 * 1. Put $match as early as possible (filter before processing)
 * 2. Use indexes for $match fields
 * 3. Limit results with $limit when possible
 * 4. Be careful with $lookup (can be slow on large collections)
 * 5. Consider caching results for expensive aggregations
 * 6. Use $project to reduce document size early in pipeline
 */
