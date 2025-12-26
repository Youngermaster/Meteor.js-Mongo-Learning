# API Reference

Quick reference for all available Meteor Methods and Publications.

---

## 🔧 Meteor Methods

Methods are used for all write operations (Create, Update, Delete) and for fetching computed/aggregated data.

### Projects Methods

#### `projects.insert`
Create a new project.

```typescript
Meteor.call('projects.insert', {
  name: string,
  description: string,
  teamMemberIds: string[],
  status: 'active' | 'completed' | 'archived',
  tags: string[]
}, (error, projectId) => {
  // Handle response
});
```

**Returns:** Project ID (string)
**Requires:** Login, Manager or Admin role

---

#### `projects.update`
Update an existing project.

```typescript
Meteor.call('projects.update', projectId, {
  name?: string,
  description?: string,
  status?: 'active' | 'completed' | 'archived',
  tags?: string[],
  teamMemberIds?: string[],
  priority?: 'low' | 'medium' | 'high'
}, (error) => {
  // Handle response
});
```

**Requires:** Login, Owner or Admin

---

#### `projects.remove`
Delete or archive a project.

```typescript
Meteor.call('projects.remove', projectId, hardDelete, (error) => {
  // Handle response
});
```

**Parameters:**
- `projectId` (string): Project to delete
- `hardDelete` (boolean): If true, permanently delete. If false, archive.

**Requires:** Login, Owner or Admin

---

#### `projects.addTeamMember`
Add a user to project team.

```typescript
Meteor.call('projects.addTeamMember', projectId, userId, (error) => {
  // Handle response
});
```

**Requires:** Login, Owner or Admin

---

#### `projects.removeTeamMember`
Remove a user from project team.

```typescript
Meteor.call('projects.removeTeamMember', projectId, userId, (error) => {
  // Handle response
});
```

**Requires:** Login, Owner or Admin

---

### Tasks Methods

#### `tasks.insert`
Create a new task.

```typescript
Meteor.call('tasks.insert', {
  projectId: string,
  title: string,
  description: string,
  assignedToId?: string,
  priority: 'low' | 'medium' | 'high',
  dueDate?: Date,
  estimatedHours?: number,
  tags: string[]
}, (error, taskId) => {
  // Handle response
});
```

**Returns:** Task ID (string)
**Requires:** Login, Access to project

---

#### `tasks.update`
Update an existing task.

```typescript
Meteor.call('tasks.update', taskId, {
  title?: string,
  description?: string,
  status?: 'todo' | 'in_progress' | 'review' | 'done',
  priority?: 'low' | 'medium' | 'high',
  dueDate?: Date,
  estimatedHours?: number,
  actualHours?: number,
  tags?: string[],
  assignedToId?: string | null
}, (error) => {
  // Handle response
});
```

**Requires:** Login, Owner/Creator or Assignee (limited)

---

#### `tasks.remove`
Delete a task.

```typescript
Meteor.call('tasks.remove', taskId, (error) => {
  // Handle response
});
```

**Requires:** Login, Creator or Admin

---

#### `tasks.assign`
Assign or reassign a task.

```typescript
Meteor.call('tasks.assign', taskId, userId, (error) => {
  // Handle response
});
```

**Parameters:**
- `userId` (string | null): User to assign to, or null to unassign

**Requires:** Login, Project owner or Admin

---

#### `tasks.logTime`
Log time spent on a task.

```typescript
Meteor.call('tasks.logTime', taskId, hoursToAdd, (error) => {
  // Handle response
});
```

**Requires:** Login, Assignee or Project team member

---

### Aggregation Methods

#### `aggregations.getUserStatistics`
Get statistics for current user.

```typescript
Meteor.call('aggregations.getUserStatistics', (error, result) => {
  // result = {
  //   totalTasksAssigned: number,
  //   tasksByStatus: { todo, in_progress, review, done },
  //   tasksByPriority: { low, medium, high },
  //   averageCompletionDays: number,
  //   overdueCount: number
  // }
});
```

**Requires:** Login

---

#### `aggregations.getProjectStatistics`
Get statistics for a project.

```typescript
Meteor.call('aggregations.getProjectStatistics', projectId, (error, result) => {
  // result = {
  //   totalTasks: number,
  //   tasksByStatus: {...},
  //   tasksByAssignee: [...],
  //   completionRate: number,
  //   totalEstimatedHours: number,
  //   totalActualHours: number,
  //   averageEstimatedHours: number
  // }
});
```

**Requires:** Login, Access to project

---

#### `aggregations.getTeamPerformance`
Get team performance metrics.

```typescript
Meteor.call('aggregations.getTeamPerformance', projectId?, (error, result) => {
  // result = [
  //   {
  //     userId, name, tasksTotal, tasksCompleted,
  //     tasksInProgress, averageCompletionDays, onTimeRate
  //   },
  //   ...
  // ]
});
```

**Parameters:**
- `projectId` (string, optional): Limit to specific project

**Requires:** Login, Manager or Admin role

---

#### `aggregations.getActivityTimeline`
Get activity timeline.

```typescript
Meteor.call('aggregations.getActivityTimeline', {
  userId?: string,
  entityId?: string,
  days?: number
}, (error, result) => {
  // result = [
  //   {
  //     date: 'YYYY-MM-DD',
  //     actions: { create, update, delete, complete, assign }
  //   },
  //   ...
  // ]
});
```

**Requires:** Login

---

#### `aggregations.getPriorityDistribution`
Get task priority distribution.

```typescript
Meteor.call('aggregations.getPriorityDistribution', (error, result) => {
  // result = {
  //   high: { todo, in_progress, review },
  //   medium: { todo, in_progress, review },
  //   low: { todo, in_progress, review }
  // }
});
```

**Requires:** Login

---

## 📡 Publications (DDP Subscriptions)

Publications provide real-time reactive data via DDP.

### User Publications

#### `users.current`
Current user's profile.

```typescript
Meteor.subscribe('users.current');
// Returns: Current user's data (no password/services)
```

---

#### `users.projectTeam`
Team members for a project.

```typescript
Meteor.subscribe('users.projectTeam', projectId);
// Returns: Users on the project team
```

---

#### `users.list`
List of all users (for assignment dropdowns).

```typescript
Meteor.subscribe('users.list');
// Returns: All users (limited fields)
// Requires: Manager or Admin role
```

---

### Project Publications

#### `projects.owned`
Projects owned by current user.

```typescript
Meteor.subscribe('projects.owned');
// Returns: Projects where user is owner
```

---

#### `projects.memberOf`
Projects where user is a team member.

```typescript
Meteor.subscribe('projects.memberOf');
// Returns: Projects where user is in team
```

---

#### `projects.single`
Single project by ID.

```typescript
Meteor.subscribe('projects.single', projectId);
// Returns: One project (if user has access)
```

---

#### `projects.all`
All active projects (admin only).

```typescript
Meteor.subscribe('projects.all');
// Returns: All active projects
// Requires: Admin role
```

---

#### `projects.withTasks`
Project with its tasks (composite).

```typescript
Meteor.subscribe('projects.withTasks', projectId);
// Returns: Project + all its tasks
```

---

### Task Publications

#### `tasks.byProject`
Tasks for a specific project.

```typescript
Meteor.subscribe('tasks.byProject', projectId);
// Returns: All tasks in project
```

---

#### `tasks.assignedToMe`
Active tasks assigned to current user.

```typescript
Meteor.subscribe('tasks.assignedToMe');
// Returns: User's tasks (excluding done)
```

---

#### `tasks.assignedToMeAll`
All tasks assigned to current user.

```typescript
Meteor.subscribe('tasks.assignedToMeAll');
// Returns: User's tasks (including done)
```

---

#### `tasks.createdByMe`
Tasks created by current user.

```typescript
Meteor.subscribe('tasks.createdByMe');
// Returns: Tasks where user is creator
```

---

#### `tasks.single`
Single task by ID.

```typescript
Meteor.subscribe('tasks.single', taskId);
// Returns: One task (if user has access)
```

---

#### `tasks.myOverdue`
Current user's overdue tasks.

```typescript
Meteor.subscribe('tasks.myOverdue');
// Returns: User's tasks that are past due
```

---

### Activity Log Publications

#### `activityLogs.mine`
Current user's activity.

```typescript
Meteor.subscribe('activityLogs.mine', limit?);
// Parameters: limit (default: 20, max: 100)
// Returns: User's recent activity
```

---

#### `activityLogs.forProject`
Activity for a project.

```typescript
Meteor.subscribe('activityLogs.forProject', projectId, limit?);
// Parameters: limit (default: 50, max: 200)
// Returns: Project activity timeline
```

---

#### `activityLogs.forTask`
Activity for a task.

```typescript
Meteor.subscribe('activityLogs.forTask', taskId);
// Returns: Task activity history
```

---

#### `activityLogs.dashboard`
Recent activity across all accessible projects.

```typescript
Meteor.subscribe('activityLogs.dashboard', limit?);
// Parameters: limit (default: 20, max: 50)
// Returns: Recent activity from user's projects
```

---

## 🔍 Usage Examples

### React Component Example

```tsx
import { useTracker } from 'meteor/react-meteor-data';
import { ProjectsCollection, TasksCollection } from '/imports/api/collections';

function MyProjects() {
  const { projects, loading } = useTracker(() => {
    const handle = Meteor.subscribe('projects.owned');

    return {
      projects: handle.ready()
        ? ProjectsCollection.find({}, { sort: { createdAt: -1 } }).fetch()
        : [],
      loading: !handle.ready()
    };
  }, []);

  const handleCreateProject = () => {
    Meteor.call('projects.insert', {
      name: 'New Project',
      description: 'Description',
      teamMemberIds: [],
      status: 'active',
      tags: []
    }, (error, projectId) => {
      if (error) {
        alert(error.message);
      } else {
        console.log('Created project:', projectId);
      }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreateProject}>Create Project</button>
      <ul>
        {projects.map(project => (
          <li key={project._id}>{project.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🔐 Permission Summary

| Method/Publication | Anyone | Member | Manager | Admin |
|-------------------|--------|--------|---------|-------|
| projects.insert | ❌ | ❌ | ✅ | ✅ |
| projects.update | ❌ | ❌ | ✅ (own) | ✅ |
| tasks.insert | ❌ | ✅ (team) | ✅ | ✅ |
| tasks.update | ❌ | ✅ (limited) | ✅ | ✅ |
| users.list | ❌ | ❌ | ✅ | ✅ |
| projects.all | ❌ | ❌ | ❌ | ✅ |

---

## 📊 Common Patterns

### Create Project with Tasks

```typescript
// 1. Create project
Meteor.call('projects.insert', projectData, (err, projectId) => {
  if (err) return;

  // 2. Create tasks for the project
  const taskPromises = tasksData.map(taskData =>
    new Promise((resolve, reject) => {
      Meteor.call('tasks.insert', {
        ...taskData,
        projectId
      }, (err, taskId) => {
        if (err) reject(err);
        else resolve(taskId);
      });
    })
  );

  Promise.all(taskPromises).then(() => {
    console.log('Project and tasks created!');
  });
});
```

### Dashboard Data Loading

```typescript
const { projects, tasks, stats, loading } = useTracker(() => {
  const h1 = Meteor.subscribe('projects.owned');
  const h2 = Meteor.subscribe('tasks.assignedToMe');

  const ready = h1.ready() && h2.ready();

  return {
    projects: ready ? ProjectsCollection.find({}).fetch() : [],
    tasks: ready ? TasksCollection.find({}).fetch() : [],
    loading: !ready
  };
}, []);

// Call aggregation separately (not reactive)
useEffect(() => {
  if (!loading) {
    Meteor.call('aggregations.getUserStatistics', (err, result) => {
      setStats(result);
    });
  }
}, [loading]);
```

---

**Need more details?** Check the implementation files:
- Methods: `/imports/api/methods/`
- Publications: `/imports/api/publications/publications.ts`
- Types: `/imports/api/collections/types.ts`
