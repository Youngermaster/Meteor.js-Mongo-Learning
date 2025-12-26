# Meteor.js Learning Project: Task Management & Team Collaboration System

## Case Study Overview

This project implements a **Task Management & Team Collaboration System** designed to demonstrate Meteor.js and MongoDB best practices. It's a real-world scenario that covers all essential concepts from basic CRUD operations to advanced performance optimizations.

---

## Learning Objectives

By building this system, you'll learn:

1. **CRUD Operations**: Complete Create, Read, Update, Delete examples
2. **MongoDB Best Practices**:
   - Document design patterns
   - Password encryption (bcrypt)
   - Data validation
   - Indexing strategies
3. **Aggregations**: Complex queries for analytics and reporting
4. **DDP (Distributed Data Protocol)**:
   - When to use DDP vs REST
   - Optimized publication/subscription patterns
   - Reactive data flow
5. **Performance Optimizations**:
   - Limiting data sent to client
   - Field projections
   - Efficient queries
   - Proper indexing
6. **TypeScript Integration**: Full type safety across client and server
7. **Security**: Methods validation, user permissions, data access control

---

## System Architecture

### Collections

We'll implement **4 main collections** with different relationships and use cases:

#### 1. **Users Collection** (Built-in Meteor.users)

- Extended with custom profile fields
- Password encryption using bcrypt
- Role-based access (admin, manager, member)

```typescript
{
  _id: string,
  username: string,
  emails: Array<{address: string, verified: boolean}>,
  profile: {
    firstName: string,
    lastName: string,
    avatar?: string,
    role: 'admin' | 'manager' | 'member'
  },
  createdAt: Date,
  services: {...} // Meteor handles password hashing
}
```

#### 2. **Projects Collection**

- One-to-many relationship with Tasks
- Team member assignments
- Demonstrates embedded vs referenced documents

```typescript
{
  _id: string,
  name: string,
  description: string,
  ownerId: string, // Reference to Users
  teamMemberIds: string[], // Array of user IDs
  status: 'active' | 'completed' | 'archived',
  tags: string[],
  createdAt: Date,
  updatedAt: Date,
  metadata: {
    totalTasks: number,
    completedTasks: number,
    priority: 'low' | 'medium' | 'high'
  }
}
```

#### 3. **Tasks Collection**

- Belongs to a Project
- Assigned to a User
- Demonstrates proper indexing and query optimization

```typescript
{
  _id: string,
  projectId: string, // Reference to Projects
  title: string,
  description: string,
  assignedToId?: string, // Reference to Users
  status: 'todo' | 'in_progress' | 'review' | 'done',
  priority: 'low' | 'medium' | 'high',
  dueDate?: Date,
  estimatedHours?: number,
  actualHours?: number,
  tags: string[],
  createdBy: string,
  createdAt: Date,
  updatedAt: Date,
  completedAt?: Date
}
```

#### 4. **ActivityLogs Collection**

- Audit trail of all actions
- Demonstrates write-heavy collection optimization
- Used for aggregation examples

```typescript
{
  _id: string,
  userId: string,
  action: 'create' | 'update' | 'delete' | 'complete' | 'assign',
  entityType: 'project' | 'task',
  entityId: string,
  changes?: object, // What changed
  metadata?: object,
  createdAt: Date
}
```

---

## Security & Best Practices

### 1. **Password Security**

- Never store plain text passwords
- Use Meteor's built-in `Accounts.createUser()` which uses bcrypt
- Implement password strength validation

### 2. **Method Security**

- All database modifications through Meteor Methods
- Input validation using `check()` or schema validation
- User permission checks

### 3. **Publication Security**

- Never publish entire collections
- Filter data based on user permissions
- Use field projections to limit data

### 4. **Data Validation**

- Schema validation at collection level
- Runtime validation in Methods
- TypeScript types for compile-time safety

---

## Key Features to Implement

### 1. **CRUD Operations**

#### Projects CRUD

- Create: New project with team assignments
- Read: List projects (with pagination), get single project
- Update: Modify project details, add/remove team members
- Delete: Soft delete (archive) vs hard delete

#### Tasks CRUD

- Create: New task with assignments
- Read: List tasks (filtered by project, status, assignee)
- Update: Status changes, reassignments
- Delete: Remove tasks

#### Activity Logs

- Create: Automatic logging on actions
- Read: View activity feed

### 2. **Aggregations Examples**

#### User Statistics

```javascript
// Count tasks by status for a user
// Average completion time
// Productivity metrics
```

#### Project Dashboard

```javascript
// Task distribution by status
// Team member workload
// Timeline analytics
```

#### Team Analytics

```javascript
// Top performers
// Task completion rates
// Project velocity
```

### 3. **DDP Optimization**

#### When to Use DDP

- Real-time updates (task status changes)
- Collaborative features (multiple users on same project)
- Live dashboards

#### When NOT to Use DDP

- Historical reports (use Methods instead)
- Large data exports
- One-time data fetches

#### Publication Patterns

```typescript
// GOOD: Limited, filtered data
Meteor.publish("myActiveTasks", function () {
  return Tasks.find(
    { assignedToId: this.userId, status: { $ne: "done" } },
    { limit: 50, sort: { dueDate: 1 } }
  );
});

// BAD: Entire collection
Meteor.publish("allTasks", function () {
  return Tasks.find({}); // Sends everything!
});
```

### 4. **Performance Optimizations**

#### Database Indexes

```javascript
// Compound indexes for common queries
Tasks._ensureIndex({ projectId: 1, status: 1 });
Tasks._ensureIndex({ assignedToId: 1, status: 1, dueDate: 1 });
Projects._ensureIndex({ ownerId: 1, status: 1 });
ActivityLogs._ensureIndex({ createdAt: -1 });
```

#### Field Projections

```typescript
// Only fetch needed fields
Tasks.find({ projectId }, { fields: { title: 1, status: 1, dueDate: 1 } });
```

#### Pagination

```typescript
// Implement skip/limit for large lists
const limit = 20;
const skip = (page - 1) * limit;
Tasks.find({}, { limit, skip, sort: { createdAt: -1 } });
```

#### Reactive Data Limits

```typescript
// Use .count() for counters instead of fetching all docs
const taskCount = Tasks.find({ projectId }).count();
```

---

## Implementation Plan

### Phase 1: Setup (Docker & MongoDB)

1. Docker Compose with MongoDB replica set
2. MongoDB connection configuration
3. Database initialization scripts

### Phase 2: Schema & Collections

1. Define TypeScript interfaces
2. Create collection instances
3. Set up indexes
4. Implement validation schemas

### Phase 3: Server-Side Implementation

1. Meteor Methods for CRUD operations
2. Publications with proper filtering
3. Aggregation pipelines
4. Activity logging hooks

### Phase 4: Seed Data

1. Sample users (with hashed passwords)
2. Sample projects
3. Sample tasks
4. Sample activity logs

### Phase 5: Client-Side (Basic)

1. Simple UI to demonstrate operations
2. Subscription examples
3. Method call examples
4. Reactive data displays

### Phase 6: Documentation & Comments

1. Inline code comments explaining WHY
2. README with setup instructions
3. API documentation
4. Best practices guide

---

## Educational Value

Each implementation will include:

### 1. **Detailed Comments**

```typescript
// WHY: We use a Method instead of allowing direct collection access
// because it gives us:
// 1. Server-side validation
// 2. Security checks (user permissions)
// 3. Ability to run side effects (logging, notifications)
// 4. Consistent API between different clients
```

### 2. **Common Pitfalls**

```typescript
// ANTI-PATTERN: Don't do this
Tasks.find({}).fetch(); // Loads entire collection into MiniMongo!

// CORRECT: Always limit and filter
Tasks.find({ assignedToId: userId }, { limit: 50 }).fetch();
```

### 3. **Performance Notes**

```typescript
// PERFORMANCE TIP: Use reactive counters efficiently
// BAD: Tasks.find({}).count() - triggers reactivity on any change
// GOOD: Use a separate publication for counts
```

### 4. **Security Warnings**

```typescript
// SECURITY: Never trust client data
// Always validate userId on the server, never accept it from client
const userId = this.userId; // From Meteor context
const userId = params.userId; // From client (can be spoofed!)
```

---

## Technologies Used

- **Meteor.js 3.x**: Full-stack framework
- **MongoDB**: Document database
- **TypeScript**: Type safety
- **React**: UI library (minimal, for demonstration)
- **Docker**: MongoDB containerization
- **bcrypt**: Password hashing (via Meteor Accounts)

---

## Success Criteria

After completing this project, you should be able to:

1. Set up a Meteor.js project with TypeScript
2. Design MongoDB schemas following best practices
3. Implement secure CRUD operations
4. Write complex aggregation pipelines
5. Optimize DDP publications for performance
6. Use Methods effectively to prevent security issues
7. Understand when to use reactive vs non-reactive data
8. Implement proper indexing strategies
9. Handle user authentication and authorization
10. Write maintainable, well-documented code

---

## Additional Resources

- [Meteor Guide](https://guide.meteor.com/)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [DDP Specification](https://github.com/meteor/meteor/blob/devel/packages/ddp/DDP.md)
- [Meteor Security Checklist](https://guide.meteor.com/security.html)

---

**Next Steps**: We'll implement each component step by step, with full explanations and documentation. Each file will contain educational comments to help you understand not just WHAT the code does, but WHY we wrote it that way.
