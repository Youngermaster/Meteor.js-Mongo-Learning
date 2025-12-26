// MongoDB Initialization Script
// This script runs automatically when the MongoDB container starts for the first time
// It creates the database, collections, and indexes for optimal performance

// Switch to our application database
db = db.getSiblingDB('meteor-learning');

print('🚀 Initializing Meteor Learning Database...');

// ============================================================================
// COLLECTION CREATION & INDEXES
// ============================================================================

// 1. Users Collection (Extended Meteor.users)
// Note: Meteor creates this automatically, but we'll add custom indexes
print('📝 Setting up Users collection indexes...');

db.users.createIndex(
  { "emails.address": 1 },
  { unique: true, sparse: true, name: "idx_users_email" }
);

db.users.createIndex(
  { username: 1 },
  { unique: true, sparse: true, name: "idx_users_username" }
);

db.users.createIndex(
  { "profile.role": 1 },
  { name: "idx_users_role" }
);

db.users.createIndex(
  { createdAt: -1 },
  { name: "idx_users_created" }
);

print('✅ Users indexes created');

// 2. Projects Collection
print('📝 Creating Projects collection...');

db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "ownerId", "status", "createdAt"],
      properties: {
        name: {
          bsonType: "string",
          description: "Project name must be a string and is required"
        },
        description: {
          bsonType: "string",
          description: "Project description"
        },
        ownerId: {
          bsonType: "string",
          description: "Owner user ID - required"
        },
        teamMemberIds: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          description: "Array of user IDs who are team members"
        },
        status: {
          enum: ["active", "completed", "archived"],
          description: "Project status - must be one of: active, completed, archived"
        },
        tags: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          description: "Array of tag strings"
        },
        metadata: {
          bsonType: "object",
          properties: {
            totalTasks: { bsonType: "int" },
            completedTasks: { bsonType: "int" },
            priority: {
              enum: ["low", "medium", "high"]
            }
          }
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp - required"
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp"
        }
      }
    }
  }
});

// Projects Indexes
// WHY: These indexes optimize common query patterns
db.projects.createIndex(
  { ownerId: 1, status: 1 },
  { name: "idx_projects_owner_status" }
);

db.projects.createIndex(
  { teamMemberIds: 1, status: 1 },
  { name: "idx_projects_members_status" }
);

db.projects.createIndex(
  { status: 1, createdAt: -1 },
  { name: "idx_projects_status_created" }
);

db.projects.createIndex(
  { tags: 1 },
  { name: "idx_projects_tags" }
);

db.projects.createIndex(
  { "metadata.priority": 1, status: 1 },
  { name: "idx_projects_priority_status" }
);

print('✅ Projects collection created with indexes');

// 3. Tasks Collection
print('📝 Creating Tasks collection...');

db.createCollection('tasks', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["projectId", "title", "status", "createdBy", "createdAt"],
      properties: {
        projectId: {
          bsonType: "string",
          description: "Associated project ID - required"
        },
        title: {
          bsonType: "string",
          minLength: 3,
          maxLength: 200,
          description: "Task title - required, 3-200 characters"
        },
        description: {
          bsonType: "string",
          maxLength: 2000,
          description: "Task description - max 2000 characters"
        },
        assignedToId: {
          bsonType: "string",
          description: "User ID of assignee"
        },
        status: {
          enum: ["todo", "in_progress", "review", "done"],
          description: "Task status - must be one of: todo, in_progress, review, done"
        },
        priority: {
          enum: ["low", "medium", "high"],
          description: "Task priority - must be one of: low, medium, high"
        },
        dueDate: {
          bsonType: "date",
          description: "Task due date"
        },
        estimatedHours: {
          bsonType: "number",
          minimum: 0,
          description: "Estimated hours to complete"
        },
        actualHours: {
          bsonType: "number",
          minimum: 0,
          description: "Actual hours spent"
        },
        tags: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          maxItems: 20,
          description: "Array of tags - max 20"
        },
        createdBy: {
          bsonType: "string",
          description: "User ID of creator - required"
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp - required"
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp"
        },
        completedAt: {
          bsonType: "date",
          description: "Completion timestamp"
        }
      }
    }
  }
});

// Tasks Indexes
// WHY: These compound indexes optimize the most common query patterns
// The order matters! Most selective fields should come first

// For queries like: "Show me all tasks in this project, ordered by status"
db.tasks.createIndex(
  { projectId: 1, status: 1, dueDate: 1 },
  { name: "idx_tasks_project_status_due" }
);

// For queries like: "Show me all tasks assigned to this user"
db.tasks.createIndex(
  { assignedToId: 1, status: 1, dueDate: 1 },
  { name: "idx_tasks_assignee_status_due" }
);

// For queries like: "Show me overdue tasks"
db.tasks.createIndex(
  { dueDate: 1, status: 1 },
  { name: "idx_tasks_due_status" }
);

// For queries like: "Show me high priority tasks"
db.tasks.createIndex(
  { priority: 1, status: 1, createdAt: -1 },
  { name: "idx_tasks_priority_status_created" }
);

// For activity timeline queries
db.tasks.createIndex(
  { createdBy: 1, createdAt: -1 },
  { name: "idx_tasks_creator_created" }
);

// For tag-based searches
db.tasks.createIndex(
  { tags: 1 },
  { name: "idx_tasks_tags" }
);

print('✅ Tasks collection created with indexes');

// 4. Activity Logs Collection
print('📝 Creating ActivityLogs collection...');

db.createCollection('activityLogs', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "action", "entityType", "entityId", "createdAt"],
      properties: {
        userId: {
          bsonType: "string",
          description: "User who performed the action - required"
        },
        action: {
          enum: ["create", "update", "delete", "complete", "assign", "comment"],
          description: "Action type - required"
        },
        entityType: {
          enum: ["project", "task"],
          description: "Type of entity affected - required"
        },
        entityId: {
          bsonType: "string",
          description: "ID of the affected entity - required"
        },
        changes: {
          bsonType: "object",
          description: "Object containing what changed"
        },
        metadata: {
          bsonType: "object",
          description: "Additional metadata"
        },
        createdAt: {
          bsonType: "date",
          description: "Timestamp of action - required"
        }
      }
    }
  }
});

// Activity Logs Indexes
// WHY: Activity logs are typically queried by time (most recent first)
// and filtered by user or entity

db.activityLogs.createIndex(
  { createdAt: -1 },
  { name: "idx_activitylogs_created" }
);

db.activityLogs.createIndex(
  { userId: 1, createdAt: -1 },
  { name: "idx_activitylogs_user_created" }
);

db.activityLogs.createIndex(
  { entityType: 1, entityId: 1, createdAt: -1 },
  { name: "idx_activitylogs_entity_created" }
);

db.activityLogs.createIndex(
  { action: 1, createdAt: -1 },
  { name: "idx_activitylogs_action_created" }
);

// TTL Index: Automatically delete logs older than 90 days
// WHY: Activity logs can grow large over time, this keeps storage manageable
db.activityLogs.createIndex(
  { createdAt: 1 },
  {
    name: "idx_activitylogs_ttl",
    expireAfterSeconds: 7776000  // 90 days in seconds
  }
);

print('✅ ActivityLogs collection created with indexes');

// ============================================================================
// INITIAL DATA (Optional - for development)
// ============================================================================

print('📝 Inserting initial development data...');

// Create a demo admin user
// NOTE: In production, Meteor's Accounts package handles user creation
// This is just for database initialization demonstration
const adminUserId = ObjectId();

db.users.insertOne({
  _id: adminUserId,
  username: "admin",
  emails: [{ address: "admin@example.com", verified: true }],
  profile: {
    firstName: "Admin",
    lastName: "User",
    role: "admin"
  },
  createdAt: new Date()
});

print('✅ Initial data inserted');

// ============================================================================
// DATABASE STATISTICS
// ============================================================================

print('\n📊 Database Statistics:');
print('Collections created: ' + db.getCollectionNames().length);
print('Total indexes: ' +
  db.users.getIndexes().length +
  db.projects.getIndexes().length +
  db.tasks.getIndexes().length +
  db.activityLogs.getIndexes().length
);

print('\n✨ MongoDB initialization complete!');
print('🌐 You can access Mongo Express at: http://localhost:8081');
print('   Username: admin');
print('   Password: admin123');
