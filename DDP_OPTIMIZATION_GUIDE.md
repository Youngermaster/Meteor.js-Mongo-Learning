# DDP Optimization Guide

## What is DDP?

**DDP (Distributed Data Protocol)** is Meteor's protocol for real-time data synchronization between server and client. Think of it as a "live query" system where:

- Server publishes data via publications
- Client subscribes to publications
- Data flows automatically when database changes
- Client has a local copy (MiniMongo) that stays in sync

---

## When to Use DDP vs Methods

### ✅ Use DDP (Publications/Subscriptions) When:

1. **Real-time collaboration**
   - Multiple users editing same data
   - Live dashboards
   - Chat/messaging
   - Notifications

2. **Small, frequently changing datasets**
   - Current user's active tasks
   - Project team members
   - Live status indicators

3. **Data needs to stay in sync**
   - Shopping cart
   - Form auto-save
   - Live search results

### ❌ Use Methods Instead When:

1. **One-time data fetches**
   - Report generation
   - Historical data
   - Export/download

2. **Large datasets**
   - Complete user list (hundreds/thousands)
   - Full transaction history
   - Archive data

3. **Computed/aggregated data**
   - Analytics dashboards
   - Statistics
   - Complex joins

4. **Write operations**
   - ALWAYS use Methods for inserts/updates/deletes
   - Never allow client-side database access

---

## DDP Performance Anti-Patterns

### ❌ ANTI-PATTERN 1: Publishing Entire Collections

```typescript
// BAD: Sends ALL tasks to EVERY client
Meteor.publish('allTasks', function() {
  return TasksCollection.find({});
});
```

**Problem:** If you have 10,000 tasks, every connected client gets 10,000 documents!

**Impact:**
- High memory usage on client
- Slow initial load
- Unnecessary data transfer
- Privacy/security risk

### ✅ SOLUTION: Filter and Limit

```typescript
// GOOD: Only send user's active tasks
Meteor.publish('myActiveTasks', function() {
  if (!this.userId) return this.ready();

  return TasksCollection.find(
    {
      assignedToId: this.userId,
      status: { $ne: 'done' }  // Exclude completed
    },
    {
      limit: 50,  // Safety limit
      sort: { dueDate: 1 }
    }
  );
});
```

---

### ❌ ANTI-PATTERN 2: No Field Projections

```typescript
// BAD: Sends all fields (including large/sensitive ones)
Meteor.publish('users', function() {
  return Meteor.users.find({});
});
```

**Problem:**
- Sends password hashes (security risk!)
- Sends unnecessary data (bloated payloads)
- Wastes bandwidth

### ✅ SOLUTION: Project Only Needed Fields

```typescript
// GOOD: Only send public profile data
Meteor.publish('users.public', function() {
  return Meteor.users.find(
    {},
    {
      fields: {
        username: 1,
        'profile.firstName': 1,
        'profile.lastName': 1,
        'profile.avatar': 1,
        // Everything else excluded (including services with passwords)
      },
      limit: 100
    }
  );
});
```

---

### ❌ ANTI-PATTERN 3: Over-Subscribing

```typescript
// BAD: Component subscribes on every render
function TaskList() {
  TasksCollection.find({}).fetch();  // Missing subscription!
  // or
  Meteor.subscribe('allTasks');  // No cleanup!
}
```

**Problem:**
- Memory leaks
- Multiple redundant subscriptions
- Wasted resources

### ✅ SOLUTION: Proper Subscription Management

```typescript
// GOOD: Use useTracker hook (React)
import { useTracker } from 'meteor/react-meteor-data';

function TaskList() {
  const { tasks, loading } = useTracker(() => {
    const handle = Meteor.subscribe('myActiveTasks');

    return {
      tasks: handle.ready()
        ? TasksCollection.find({}).fetch()
        : [],
      loading: !handle.ready()
    };
  }, []); // Empty deps = subscribe once on mount, cleanup on unmount

  if (loading) return <div>Loading...</div>;
  return <ul>{tasks.map(t => <li key={t._id}>{t.title}</li>)}</ul>;
}
```

---

### ❌ ANTI-PATTERN 4: Publishing Related Data Inefficiently

```typescript
// BAD: N+1 problem - separate publications for each entity
Meteor.subscribe('project', projectId);
Meteor.subscribe('tasks', projectId);
Meteor.subscribe('users', projectId);
// Each requires separate DDP messages
```

### ✅ SOLUTION: Composite Publication

```typescript
// GOOD: Single publication with all related data
Meteor.publish('project.detail', function(projectId) {
  check(projectId, String);

  if (!this.userId) return this.ready();

  const project = ProjectsCollection.findOne(projectId);
  if (!project) return this.ready();

  // Check access...

  // Return array of cursors - Meteor sends them as one subscription
  return [
    ProjectsCollection.find({ _id: projectId }),
    TasksCollection.find({ projectId }, { limit: 200 }),
    Meteor.users.find(
      { _id: { $in: [project.ownerId, ...project.teamMemberIds] } },
      { fields: { username: 1, 'profile.firstName': 1, 'profile.lastName': 1 } }
    )
  ];
});

// Client: Single subscription
Meteor.subscribe('project.detail', projectId);
```

---

## Optimized Publication Patterns

### Pattern 1: Pagination

```typescript
// Server
Meteor.publish('tasks.paginated', function(page = 1, pageSize = 20) {
  check(page, Number);
  check(pageSize, Number);

  const limit = Math.min(pageSize, 100); // Cap at 100
  const skip = (page - 1) * limit;

  return TasksCollection.find(
    { assignedToId: this.userId },
    {
      skip,
      limit,
      sort: { createdAt: -1 }
    }
  );
});

// Client
const [page, setPage] = useState(1);
const { tasks } = useTracker(() => {
  const handle = Meteor.subscribe('tasks.paginated', page, 20);
  return {
    tasks: handle.ready() ? TasksCollection.find({}).fetch() : []
  };
}, [page]);
```

### Pattern 2: Filtered Subscriptions

```typescript
// Server: Multiple focused publications
Meteor.publish('tasks.byStatus', function(status: TaskStatus) {
  check(status, String);

  return TasksCollection.find(
    { assignedToId: this.userId, status },
    { limit: 50 }
  );
});

Meteor.publish('tasks.highPriority', function() {
  return TasksCollection.find(
    {
      assignedToId: this.userId,
      priority: 'high',
      status: { $ne: 'done' }
    },
    { limit: 20 }
  );
});

// Client: Subscribe to what you need
const { tasks } = useTracker(() => {
  const handle = Meteor.subscribe('tasks.byStatus', 'in_progress');
  return { tasks: TasksCollection.find({ status: 'in_progress' }).fetch() };
}, []);
```

### Pattern 3: Count-Only Publications

```typescript
// Server: Publish count without all documents
Meteor.publish('tasks.counts', function() {
  if (!this.userId) return this.ready();

  let initializing = true;

  // Function to count and publish
  const publishCounts = () => {
    const counts = {
      todo: TasksCollection.find({ assignedToId: this.userId, status: 'todo' }).count(),
      inProgress: TasksCollection.find({ assignedToId: this.userId, status: 'in_progress' }).count(),
      review: TasksCollection.find({ assignedToId: this.userId, status: 'review' }).count(),
      done: TasksCollection.find({ assignedToId: this.userId, status: 'done' }).count(),
    };

    if (!initializing) {
      this.changed('taskCounts', this.userId, counts);
    } else {
      this.added('taskCounts', this.userId, counts);
      initializing = false;
    }
  };

  // Publish initial counts
  publishCounts();

  // Watch for changes
  const observer = TasksCollection.find({ assignedToId: this.userId }).observe({
    added: publishCounts,
    changed: publishCounts,
    removed: publishCounts,
  });

  this.ready();

  this.onStop(() => {
    observer.stop();
  });
});

// Client
const { counts } = useTracker(() => {
  Meteor.subscribe('tasks.counts');
  const doc = TaskCounts.findOne(Meteor.userId());
  return { counts: doc || { todo: 0, inProgress: 0, review: 0, done: 0 } };
}, []);
```

---

## Subscription Lifecycle Management

### React Hook Pattern

```typescript
import { useTracker } from 'meteor/react-meteor-data';
import { useEffect } from 'react';

// Custom hook for subscription
function useSubscription(publicationName: string, ...args: any[]) {
  useEffect(() => {
    const handle = Meteor.subscribe(publicationName, ...args);

    // Cleanup on unmount
    return () => {
      handle.stop();
    };
  }, [publicationName, ...args]);
}

// Usage
function MyComponent({ projectId }) {
  useSubscription('project.detail', projectId);

  const { project } = useTracker(() => ({
    project: ProjectsCollection.findOne(projectId)
  }), [projectId]);

  return <div>{project?.name}</div>;
}
```

---

## Performance Monitoring

### Check Subscription Payload Size

```typescript
// In browser console:
Meteor.connection._stream.socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.msg === 'added' || data.msg === 'changed') {
    console.log('DDP message size:', event.data.length, 'bytes');
    console.log('Collection:', data.collection);
  }
});
```

### Monitor Active Subscriptions

```typescript
// Server-side (add to server/main.ts)
Meteor.publish(null, function() {
  if (this.userId) {
    console.log(`User ${this.userId} connected`);
  }

  this.onStop(() => {
    console.log(`User ${this.userId} disconnected`);
  });
});
```

---

## Key Takeaways

1. **Always Filter**: Never publish entire collections
2. **Always Limit**: Set reasonable max document counts
3. **Project Fields**: Only send fields clients need
4. **Security First**: Check permissions in every publication
5. **Manage Lifecycle**: Clean up subscriptions properly
6. **Use Methods for Writes**: Never allow direct client DB access
7. **Paginate Large Datasets**: Don't load everything at once
8. **Cache Strategically**: Let MiniMongo cache, don't duplicate
9. **Monitor Performance**: Check payload sizes and query counts
10. **Use Indexes**: Ensure DB indexes support your queries

---

## Example: Optimized Dashboard

```typescript
// Server: Efficient dashboard publication
Meteor.publish('dashboard.data', function() {
  if (!this.userId) return this.ready();

  // Get user's projects (limited)
  const projects = ProjectsCollection.find(
    {
      $or: [
        { ownerId: this.userId },
        { teamMemberIds: this.userId }
      ],
      status: 'active'
    },
    {
      limit: 10,
      sort: { createdAt: -1 },
      fields: {
        name: 1,
        status: 1,
        'metadata.totalTasks': 1,
        'metadata.completedTasks': 1
      }
    }
  );

  // Get user's active tasks (limited)
  const tasks = TasksCollection.find(
    {
      assignedToId: this.userId,
      status: { $ne: 'done' }
    },
    {
      limit: 20,
      sort: { dueDate: 1 },
      fields: {
        title: 1,
        status: 1,
        priority: 1,
        dueDate: 1,
        projectId: 1
      }
    }
  );

  return [projects, tasks];
});

// Client: Single subscription for entire dashboard
const { projects, tasks, loading } = useTracker(() => {
  const handle = Meteor.subscribe('dashboard.data');

  return {
    projects: handle.ready() ? ProjectsCollection.find({}).fetch() : [],
    tasks: handle.ready() ? TasksCollection.find({}).fetch() : [],
    loading: !handle.ready()
  };
}, []);
```

---

**Remember:** DDP is powerful for real-time features, but it's not a replacement for traditional request-response patterns (Methods). Use the right tool for the job!
