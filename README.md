# Meteor.js + MongoDB Learning Project

A comprehensive learning project demonstrating Meteor.js and MongoDB best practices through a real-world **Task Management & Team Collaboration System**.

---

## 🎯 What You'll Learn

This project is designed to teach you:

✅ **CRUD Operations** - Complete create, read, update, delete examples
✅ **MongoDB Best Practices** - Schema design, indexing, aggregations
✅ **Security** - Password encryption, input validation, authorization
✅ **DDP Optimization** - Efficient publications and subscriptions
✅ **TypeScript** - Full type safety across client and server
✅ **Real-time Features** - Reactive data with Meteor's DDP protocol
✅ **Performance** - Indexing strategies, query optimization, pagination
✅ **Architecture** - Proper code organization and separation of concerns

---

## 📚 Project Structure (Feature-Based Architecture)

```
meteorjs-learning/
├── CASE_STUDY.md              # Detailed case study and learning objectives
├── DDP_OPTIMIZATION_GUIDE.md  # DDP performance best practices
├── REFACTORING_GUIDE.md       # Feature-based architecture explanation
├── README.md                  # This file
│
├── docker-compose.yml         # MongoDB + Mongo Express setup
├── docker/
│   └── mongo-init.js         # MongoDB initialization script
│
├── imports/
│   └── api/
│       ├── users/             # User domain
│       │   ├── types.ts       # User types
│       │   ├── collection.ts  # Users collection + indexes + security
│       │   └── index.ts       # Barrel export
│       │
│       ├── projects/          # Project domain
│       │   ├── types.ts       # Project types
│       │   ├── collection.ts  # Projects collection + indexes + security
│       │   ├── methods.ts     # Project CRUD methods
│       │   └── index.ts       # Barrel export
│       │
│       ├── tasks/             # Task domain
│       │   ├── types.ts       # Task types
│       │   ├── collection.ts  # Tasks collection + indexes + security
│       │   ├── methods.ts     # Task CRUD methods
│       │   └── index.ts       # Barrel export
│       │
│       ├── activityLogs/      # Activity log domain
│       │   ├── types.ts       # Activity log types
│       │   ├── collection.ts  # ActivityLogs collection + indexes + security
│       │   └── index.ts       # Barrel export
│       │
│       ├── aggregations/      # MongoDB Aggregations
│       │   └── aggregations.ts
│       │
│       └── publications/      # DDP Publications
│           └── publications.ts
│
├── server/
│   ├── main.ts               # Server entry point
│   └── fixtures.ts           # Seed data
│
├── client/
│   └── main.tsx              # Client entry point
│
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript configuration
```

**Note:** This project follows a **feature-based (domain-driven)** architecture for better maintainability and scalability. See [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) for details.

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** 14+ ([Download](https://nodejs.org/))
- **Meteor** 3.x ([Install](https://www.meteor.com/install))
- **Docker** ([Install](https://www.docker.com/get-started)) - for MongoDB

### 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd Meteor.js-Mongo-Learning

# Install dependencies
meteor npm install
```

### 3. Start MongoDB with Docker

```bash
# Start MongoDB and Mongo Express
docker-compose up -d

# Verify MongoDB is running
docker-compose ps
```

You should see:

- **MongoDB**: Running on `localhost:27017`
- **Mongo Express**: Web UI at `http://localhost:8081`
  - Username: `admin`
  - Password: `admin123`

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# The default settings should work for local development
```

### 5. Run the Application

```bash
# Start Meteor
meteor npm start

# Or with custom MongoDB URL
MONGO_URL=mongodb://admin:admin123@localhost:27017/meteor-learning?authSource=admin meteor npm start
```

The app will:

1. Connect to MongoDB
2. Create indexes
3. Seed the database with sample data
4. Start on `http://localhost:3000`

### 6. Login with Sample Users

The seed data creates these users:

| Username   | Password     | Role                          |
| ---------- | ------------ | ----------------------------- |
| `admin`    | `admin123`   | Admin (full access)           |
| `manager1` | `manager123` | Manager (can create projects) |
| `manager2` | `manager123` | Manager                       |
| `member1`  | `member123`  | Member (can work on tasks)    |
| `member2`  | `member123`  | Member                        |
| `member3`  | `member123`  | Member                        |

---

## 📖 Learning Path

### 1. Start with the Case Study

Read [`CASE_STUDY.md`](./CASE_STUDY.md) to understand:

- System architecture
- Collection relationships
- Learning objectives
- Implementation plan

### 2. Explore the Collections

**File:** `imports/api/collections/types.ts`

- Understand TypeScript interfaces
- See document design patterns
- Learn about embedded vs referenced documents

**File:** `imports/api/collections/collections.ts`

- Collection creation with type safety
- Index strategies and why they matter
- Security (deny rules)

### 3. Study the Methods

**File:** `imports/api/methods/projects.methods.ts`
**File:** `imports/api/methods/tasks.methods.ts`

Learn about:

- Input validation with `check()`
- Authorization patterns
- Business logic enforcement
- Activity logging
- Error handling

### 4. Understand Publications

**File:** `imports/api/publications/publications.ts`

Learn when to use DDP:

- Filtering data server-side
- Field projections for security
- Pagination strategies
- Composite publications

### 5. Master Aggregations

**File:** `imports/api/aggregations/aggregations.ts`

Learn MongoDB aggregation pipeline:

- `$match`, `$group`, `$project`
- `$lookup` for joins
- Complex analytics
- When NOT to use aggregations

### 6. DDP Performance

Read [`DDP_OPTIMIZATION_GUIDE.md`](./DDP_OPTIMIZATION_GUIDE.md)

- When to use DDP vs Methods
- Anti-patterns to avoid
- Subscription management
- Performance monitoring

---

## 🧪 Testing the API

### Using Meteor Shell

```bash
# In a new terminal (while Meteor is running)
meteor shell

# Test a method
Meteor.call('projects.insert', {
  name: 'Test Project',
  description: 'Created from shell',
  teamMemberIds: [],
  status: 'active',
  tags: ['test']
}, (err, result) => {
  console.log('Project ID:', result);
});

# Test an aggregation
Meteor.call('aggregations.getUserStatistics', (err, result) => {
  console.log('User stats:', result);
});

# Query collections
ProjectsCollection.find().fetch();
TasksCollection.find({ status: 'todo' }).count();
```

### Using Browser Console

```javascript
// Subscribe to data
Meteor.subscribe("projects.owned");

// Query local MiniMongo
ProjectsCollection.find().fetch();

// Call a method
Meteor.call(
  "tasks.insert",
  {
    projectId: "PROJECT_ID",
    title: "New Task",
    description: "Test task",
    priority: "high",
    tags: [],
  },
  (err, taskId) => {
    console.log("Task created:", taskId);
  }
);

// Call aggregation
Meteor.call("aggregations.getProjectStatistics", "PROJECT_ID", (err, stats) => {
  console.log("Project stats:", stats);
});
```

---

## 🗄️ MongoDB Access

### Mongo Express (Web UI)

1. Open http://localhost:8081
2. Login: `admin` / `admin123`
3. Select database: `meteor-learning`
4. Browse collections: `projects`, `tasks`, `activityLogs`, `users`

### MongoDB Shell

```bash
# Connect to MongoDB
docker exec -it meteor-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# Switch to database
use meteor-learning

# View collections
show collections

# Query examples
db.tasks.find({ status: 'todo' }).pretty()
db.projects.find({ status: 'active' })
db.users.find({}, { username: 1, 'profile.role': 1 })

# Test aggregation
db.tasks.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

# View indexes
db.tasks.getIndexes()
```

---

## 📝 Key Concepts Demonstrated

### 1. Security

**Password Encryption:**

```typescript
// NEVER store plain passwords
// Meteor's Accounts package uses bcrypt automatically
Accounts.createUser({
  username: 'user',
  password: 'password123', // Automatically hashed
  profile: { ... }
});
```

**Input Validation:**

```typescript
Meteor.methods({
  "tasks.insert"(taskData) {
    // ALWAYS validate inputs
    check(taskData, {
      title: String,
      description: String,
      priority: Match.OneOf("low", "medium", "high"),
    });
  },
});
```

**Authorization:**

```typescript
// ALWAYS check permissions
if (!canModifyTask(this.userId, task)) {
  throw new Meteor.Error("not-authorized");
}
```

### 2. Performance

**Indexing:**

```typescript
// Compound index for common query pattern
TasksCollection.createIndexAsync({
  projectId: 1,
  status: 1,
  dueDate: 1,
});
```

**Field Projections:**

```typescript
// Only fetch needed fields
TasksCollection.find(
  { projectId },
  { fields: { title: 1, status: 1, dueDate: 1 } }
);
```

**Pagination:**

```typescript
const limit = 20;
const skip = (page - 1) * limit;
TasksCollection.find({}, { limit, skip });
```

### 3. Data Patterns

**Denormalization:**

```typescript
// Project stores task counts for fast dashboard queries
metadata: {
  totalTasks: 15,
  completedTasks: 8
}
```

**References vs Embedding:**

```typescript
// Use references for:
// - Large data
// - Data that changes
// - Many-to-many relationships
teamMemberIds: ['userId1', 'userId2']

// Use embedding for:
// - Small data
// - Data that doesn't change
// - Data always queried together
metadata: { priority: 'high', ... }
```

---

## 🔧 Customization

### Add a New Collection

1. **Define types** in `imports/api/collections/types.ts`
2. **Create collection** in `imports/api/collections/collections.ts`
3. **Add indexes** in the same file (server-side block)
4. **Export** from `imports/api/collections/index.ts`
5. **Create methods** in `imports/api/methods/yourCollection.methods.ts`
6. **Create publications** in `imports/api/publications/publications.ts`

### Add a New Method

```typescript
// In imports/api/methods/yourCollection.methods.ts
Meteor.methods({
  "yourCollection.yourAction"(params) {
    check(params, Object);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }

    // Validate, check permissions, perform action
    // ...

    return result;
  },
});
```

### Add a New Publication

```typescript
// In imports/api/publications/publications.ts
if (Meteor.isServer) {
  Meteor.publish("yourPublication", function (params) {
    check(params, String);

    if (!this.userId) return this.ready();

    return YourCollection.find(
      {
        /* filter */
      },
      {
        fields: {
          /* projection */
        },
        limit: 50,
      }
    );
  });
}
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Reset everything (deletes data!)
docker-compose down -v
docker-compose up -d
```

### Meteor Build Issues

```bash
# Clear Meteor cache
meteor reset

# Reinstall packages
rm -rf node_modules
meteor npm install

# Update Meteor
meteor update
```

### Common Errors

**"MongoError: Authentication failed"**

- Check MONGO_URL in .env
- Verify MongoDB credentials in docker-compose.yml

**"Error: Match error: Expected string, got undefined"**

- You're missing required parameters in a method call
- Check the method signature

**"Error: not-authorized"**

- You're not logged in, or don't have permission
- Check user role and ownership

---

## 📚 Additional Resources

### Meteor Documentation

- [Meteor Guide](https://guide.meteor.com/) - Best practices
- [Meteor Docs](https://docs.meteor.com/) - API reference
- [Meteor Forums](https://forums.meteor.com/) - Community help

### MongoDB Resources

- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Aggregation Pipeline](https://docs.mongodb.com/manual/core/aggregation-pipeline/)
- [Indexing Strategies](https://docs.mongodb.com/manual/indexes/)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Meteor TypeScript Guide](https://guide.meteor.com/build-tool.html#typescript)

---

## 🎓 Learning Exercises

### Beginner

1. Create a new user through the Meteor shell
2. Create a project using the `projects.insert` method
3. Add a task to your project
4. Subscribe to your tasks and display them

### Intermediate

5. Create a new publication that filters tasks by priority
6. Add a method to update task priority
7. Create an aggregation to count tasks by status
8. Add a new field to the Task schema

### Advanced

9. Implement a "copy project" feature (including all tasks)
10. Add a "task comments" collection with references
11. Create a publication that includes tasks with their assigned users
12. Optimize a slow query using indexes

---

## 🤝 Contributing

This is a learning project, but improvements are welcome!

1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Submit a pull request

---

## 📄 License

MIT License - Feel free to use this project for learning!

---

## 🙏 Acknowledgments

Built with:

- [Meteor.js](https://www.meteor.com/)
- [MongoDB](https://www.mongodb.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [React](https://reactjs.org/)
- [Docker](https://www.docker.com/)

---

**Happy Learning! 🚀**

Questions? Check the [CASE_STUDY.md](./CASE_STUDY.md) or [DDP_OPTIMIZATION_GUIDE.md](./DDP_OPTIMIZATION_GUIDE.md) for more details.
