/**
 * Database Seed Data (Fixtures)
 *
 * WHY SEED DATA:
 * - Development: Test with realistic data
 * - Learning: See examples of good data structure
 * - Demos: Show functionality without manual data entry
 * - Testing: Consistent baseline for tests
 *
 * WHEN IT RUNS:
 * - On server startup (Meteor.startup)
 * - Only if database is empty (check for existing data)
 *
 * PRODUCTION NOTE:
 * - This file should NOT run in production
 * - Add environment check: if (Meteor.isDevelopment)
 */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { ProjectsCollection, ProjectStatus, Priority } from '/imports/api/projects';
import { TasksCollection, TaskStatus } from '/imports/api/tasks';
import { ActivityLogsCollection } from '/imports/api/activityLogs';
import type { UserRole } from '/imports/api/users';

/**
 * Create sample users with properly hashed passwords
 *
 * SECURITY NOTE:
 * Meteor's Accounts.createUser automatically:
 * - Hashes passwords with bcrypt
 * - Adds salt for security
 * - Never stores plain text passwords
 *
 * WHY DIFFERENT ROLES:
 * - Admin: Full system access, can see all data
 * - Manager: Can create projects, manage teams
 * - Member: Can work on assigned tasks
 */
function createUsers() {
  console.log('📝 Creating sample users...');

  // Check if users already exist
  if (Meteor.users.find().count() > 0) {
    console.log('⏭️  Users already exist, skipping...');
    return;
  }

  // Admin User
  const adminId = Accounts.createUser({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123', // DEMO ONLY - Never use weak passwords in production!
    profile: {
      firstName: 'Alice',
      lastName: 'Admin',
      role: 'admin' as UserRole,
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
  });

  // Verify email (normally done via email link)
  Meteor.users.update(adminId, {
    $set: { 'emails.0.verified': true },
  });

  // Manager Users
  const manager1Id = Accounts.createUser({
    username: 'manager1',
    email: 'bob.manager@example.com',
    password: 'manager123',
    profile: {
      firstName: 'Bob',
      lastName: 'Manager',
      role: 'manager' as UserRole,
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
  });

  Meteor.users.update(manager1Id, {
    $set: { 'emails.0.verified': true },
  });

  const manager2Id = Accounts.createUser({
    username: 'manager2',
    email: 'carol.lead@example.com',
    password: 'manager123',
    profile: {
      firstName: 'Carol',
      lastName: 'Lead',
      role: 'manager' as UserRole,
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
  });

  Meteor.users.update(manager2Id, {
    $set: { 'emails.0.verified': true },
  });

  // Member Users (Team members who work on tasks)
  const member1Id = Accounts.createUser({
    username: 'member1',
    email: 'david.dev@example.com',
    password: 'member123',
    profile: {
      firstName: 'David',
      lastName: 'Developer',
      role: 'member' as UserRole,
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
  });

  Meteor.users.update(member1Id, {
    $set: { 'emails.0.verified': true },
  });

  const member2Id = Accounts.createUser({
    username: 'member2',
    email: 'emma.engineer@example.com',
    password: 'member123',
    profile: {
      firstName: 'Emma',
      lastName: 'Engineer',
      role: 'member' as UserRole,
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
  });

  Meteor.users.update(member2Id, {
    $set: { 'emails.0.verified': true },
  });

  const member3Id = Accounts.createUser({
    username: 'member3',
    email: 'frank.frontend@example.com',
    password: 'member123',
    profile: {
      firstName: 'Frank',
      lastName: 'Frontend',
      role: 'member' as UserRole,
      avatar: 'https://i.pravatar.cc/150?img=6',
    },
  });

  Meteor.users.update(member3Id, {
    $set: { 'emails.0.verified': true },
  });

  console.log('✅ Created 6 sample users');
  console.log('   - admin / admin123 (Admin)');
  console.log('   - manager1 / manager123 (Manager)');
  console.log('   - manager2 / manager123 (Manager)');
  console.log('   - member1 / member123 (Member)');
  console.log('   - member2 / member123 (Member)');
  console.log('   - member3 / member123 (Member)');

  return {
    adminId,
    manager1Id,
    manager2Id,
    member1Id,
    member2Id,
    member3Id,
  };
}

/**
 * Create sample projects
 *
 * DEMONSTRATES:
 * - Different project statuses (active, completed, archived)
 * - Team member assignments
 * - Tags for categorization
 * - Metadata for quick stats
 */
function createProjects(userIds: Record<string, string>) {
  console.log('📝 Creating sample projects...');

  if (ProjectsCollection.find().count() > 0) {
    console.log('⏭️  Projects already exist, skipping...');
    return;
  }

  const { manager1Id, manager2Id, member1Id, member2Id, member3Id } = userIds;

  // Project 1: Active web development project
  const project1Id = ProjectsCollection.insert({
    name: 'E-Commerce Platform Redesign',
    description:
      'Complete redesign of the company e-commerce platform with modern UI/UX, improved performance, and new features including real-time inventory, personalized recommendations, and mobile app support.',
    ownerId: manager1Id,
    teamMemberIds: [member1Id, member2Id, member3Id],
    status: 'active' as ProjectStatus,
    tags: ['web', 'frontend', 'backend', 'urgent'],
    metadata: {
      totalTasks: 0, // Will be updated as tasks are added
      completedTasks: 0,
      priority: 'high' as Priority,
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  });

  // Project 2: Active mobile app project
  const project2Id = ProjectsCollection.insert({
    name: 'Mobile App - Customer Portal',
    description:
      'Native mobile application for customers to manage orders, track shipments, and communicate with support team. Built with React Native for iOS and Android.',
    ownerId: manager2Id,
    teamMemberIds: [member1Id, member2Id],
    status: 'active' as ProjectStatus,
    tags: ['mobile', 'react-native', 'ios', 'android'],
    metadata: {
      totalTasks: 0,
      completedTasks: 0,
      priority: 'high' as Priority,
    },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
  });

  // Project 3: Internal tools project (lower priority)
  const project3Id = ProjectsCollection.insert({
    name: 'Internal Admin Dashboard',
    description:
      'Dashboard for internal team to manage users, view analytics, and configure system settings. Includes reporting tools and data visualization.',
    ownerId: manager1Id,
    teamMemberIds: [member3Id],
    status: 'active' as ProjectStatus,
    tags: ['internal', 'admin', 'analytics'],
    metadata: {
      totalTasks: 0,
      completedTasks: 0,
      priority: 'medium' as Priority,
    },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
  });

  // Project 4: Completed project (for historical data)
  const project4Id = ProjectsCollection.insert({
    name: 'API v2 Migration',
    description:
      'Migration from API v1 to v2 with improved authentication, better documentation, and GraphQL support. All endpoints have been updated and tested.',
    ownerId: manager2Id,
    teamMemberIds: [member1Id, member2Id],
    status: 'completed' as ProjectStatus,
    tags: ['backend', 'api', 'migration'],
    metadata: {
      totalTasks: 0,
      completedTasks: 0,
      priority: 'high' as Priority,
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Completed 10 days ago
  });

  console.log('✅ Created 4 sample projects');

  return {
    project1Id,
    project2Id,
    project3Id,
    project4Id,
  };
}

/**
 * Create sample tasks
 *
 * DEMONSTRATES:
 * - Different task statuses (todo, in_progress, review, done)
 * - Task assignments
 * - Due dates (some overdue for testing)
 * - Time estimates and actual time
 * - Priority levels
 * - Tags
 */
function createTasks(
  userIds: Record<string, string>,
  projectIds: Record<string, string>
) {
  console.log('📝 Creating sample tasks...');

  if (TasksCollection.find().count() > 0) {
    console.log('⏭️  Tasks already exist, skipping...');
    return;
  }

  const { manager1Id, member1Id, member2Id, member3Id } = userIds;
  const { project1Id, project2Id, project3Id, project4Id } = projectIds;

  // Helper function to create date offset
  const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // ===== PROJECT 1 TASKS (E-Commerce Platform) =====

  // Task 1: High priority, assigned, in progress
  TasksCollection.insert({
    projectId: project1Id,
    title: 'Design new product listing page',
    description:
      'Create wireframes and high-fidelity mockups for the new product listing page. Include filters, sorting, pagination, and product cards. Consider mobile responsiveness.',
    assignedToId: member3Id,
    status: 'in_progress' as TaskStatus,
    priority: 'high' as Priority,
    dueDate: daysFromNow(5),
    estimatedHours: 16,
    actualHours: 8, // Halfway done
    tags: ['design', 'ui/ux', 'frontend'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-7), // Created 7 days ago
    updatedAt: daysFromNow(-1), // Updated yesterday
  });

  // Task 2: Overdue task (for testing overdue queries)
  TasksCollection.insert({
    projectId: project1Id,
    title: 'Implement shopping cart functionality',
    description:
      'Backend API endpoints and frontend components for shopping cart. Includes add to cart, remove, update quantities, and cart persistence.',
    assignedToId: member1Id,
    status: 'in_progress' as TaskStatus,
    priority: 'high' as Priority,
    dueDate: daysFromNow(-3), // 3 days overdue!
    estimatedHours: 20,
    actualHours: 15,
    tags: ['frontend', 'backend', 'urgent'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-14),
    updatedAt: daysFromNow(-2),
  });

  // Task 3: Todo task, not assigned yet
  TasksCollection.insert({
    projectId: project1Id,
    title: 'Set up payment gateway integration',
    description:
      'Integrate Stripe payment gateway for processing payments. Include webhook handling for payment confirmations and refunds.',
    status: 'todo' as TaskStatus,
    priority: 'high' as Priority,
    dueDate: daysFromNow(10),
    estimatedHours: 12,
    tags: ['backend', 'payment', 'integration'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-3),
  });

  // Task 4: In review
  TasksCollection.insert({
    projectId: project1Id,
    title: 'Implement user authentication',
    description:
      'JWT-based authentication with login, registration, password reset, and email verification. Include OAuth support for Google and Facebook.',
    assignedToId: member2Id,
    status: 'review' as TaskStatus,
    priority: 'high' as Priority,
    dueDate: daysFromNow(2),
    estimatedHours: 16,
    actualHours: 18, // Took longer than estimated
    tags: ['backend', 'security', 'auth'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-10),
    updatedAt: daysFromNow(-1),
  });

  // Task 5: Completed task
  const completedTask1 = TasksCollection.insert({
    projectId: project1Id,
    title: 'Database schema design',
    description:
      'Design MongoDB schema for products, users, orders, and reviews. Include proper indexing strategy and data validation rules.',
    assignedToId: member1Id,
    status: 'done' as TaskStatus,
    priority: 'high' as Priority,
    dueDate: daysFromNow(-5),
    estimatedHours: 8,
    actualHours: 10,
    tags: ['backend', 'database', 'architecture'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-20),
    updatedAt: daysFromNow(-12),
    completedAt: daysFromNow(-12),
  });

  // ===== PROJECT 2 TASKS (Mobile App) =====

  TasksCollection.insert({
    projectId: project2Id,
    title: 'Set up React Native project structure',
    description:
      'Initialize React Native project with TypeScript, navigation, state management, and folder structure.',
    assignedToId: member1Id,
    status: 'done' as TaskStatus,
    priority: 'high' as Priority,
    estimatedHours: 6,
    actualHours: 5,
    tags: ['mobile', 'setup', 'react-native'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-18),
    completedAt: daysFromNow(-16),
  });

  TasksCollection.insert({
    projectId: project2Id,
    title: 'Build order tracking screen',
    description:
      'Screen showing real-time order status, estimated delivery, and tracking map.',
    assignedToId: member2Id,
    status: 'in_progress' as TaskStatus,
    priority: 'medium' as Priority,
    dueDate: daysFromNow(7),
    estimatedHours: 12,
    actualHours: 6,
    tags: ['mobile', 'frontend', 'ui'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-5),
  });

  TasksCollection.insert({
    projectId: project2Id,
    title: 'Implement push notifications',
    description:
      'Set up Firebase Cloud Messaging for order updates and promotional notifications.',
    status: 'todo' as TaskStatus,
    priority: 'medium' as Priority,
    dueDate: daysFromNow(14),
    estimatedHours: 8,
    tags: ['mobile', 'notifications', 'firebase'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-2),
  });

  // ===== PROJECT 3 TASKS (Admin Dashboard) =====

  TasksCollection.insert({
    projectId: project3Id,
    title: 'Create analytics dashboard with charts',
    description:
      'Dashboard showing user activity, sales trends, and system metrics using Chart.js or D3.',
    assignedToId: member3Id,
    status: 'in_progress' as TaskStatus,
    priority: 'low' as Priority,
    dueDate: daysFromNow(20),
    estimatedHours: 16,
    actualHours: 10,
    tags: ['frontend', 'analytics', 'charts'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-8),
  });

  TasksCollection.insert({
    projectId: project3Id,
    title: 'User management interface',
    description:
      'CRUD interface for managing users: create, edit, delete, assign roles, reset passwords.',
    status: 'todo' as TaskStatus,
    priority: 'medium' as Priority,
    dueDate: daysFromNow(25),
    estimatedHours: 12,
    tags: ['frontend', 'admin', 'users'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-4),
  });

  // ===== PROJECT 4 TASKS (Completed Project) =====

  // All tasks completed for this project
  TasksCollection.insert({
    projectId: project4Id,
    title: 'Update API documentation',
    description: 'Complete API documentation for v2 endpoints with examples.',
    assignedToId: member2Id,
    status: 'done' as TaskStatus,
    priority: 'medium' as Priority,
    estimatedHours: 8,
    actualHours: 10,
    tags: ['documentation', 'api'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-50),
    completedAt: daysFromNow(-15),
  });

  TasksCollection.insert({
    projectId: project4Id,
    title: 'Migrate all API endpoints to v2',
    description: 'Update all backend endpoints to use new v2 structure.',
    assignedToId: member1Id,
    status: 'done' as TaskStatus,
    priority: 'high' as Priority,
    estimatedHours: 40,
    actualHours: 45,
    tags: ['backend', 'migration', 'api'],
    createdBy: manager1Id,
    createdAt: daysFromNow(-55),
    completedAt: daysFromNow(-20),
  });

  console.log('✅ Created 12 sample tasks across all projects');

  // Now update project task counters
  console.log('📊 Updating project task counters...');

  Object.values(projectIds).forEach((projectId) => {
    const totalTasks = TasksCollection.find({ projectId }).count();
    const completedTasks = TasksCollection.find({
      projectId,
      status: 'done',
    }).count();

    ProjectsCollection.update(projectId, {
      $set: {
        'metadata.totalTasks': totalTasks,
        'metadata.completedTasks': completedTasks,
      },
    });
  });

  console.log('✅ Project counters updated');
}

/**
 * Create sample activity logs
 *
 * DEMONSTRATES:
 * - Different action types
 * - Audit trail
 * - Historical data for analytics
 */
function createActivityLogs(
  userIds: Record<string, string>,
  projectIds: Record<string, string>
) {
  console.log('📝 Creating sample activity logs...');

  if (ActivityLogsCollection.find().count() > 0) {
    console.log('⏭️  Activity logs already exist, skipping...');
    return;
  }

  const { manager1Id, manager2Id, member1Id, member2Id, member3Id } = userIds;
  const { project1Id, project2Id, project3Id } = projectIds;

  // Helper
  const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Project creation logs
  ActivityLogsCollection.insert({
    userId: manager1Id,
    action: 'create',
    entityType: 'project',
    entityId: project1Id,
    createdAt: daysFromNow(-30),
  });

  ActivityLogsCollection.insert({
    userId: manager2Id,
    action: 'create',
    entityType: 'project',
    entityId: project2Id,
    createdAt: daysFromNow(-20),
  });

  // Task assignments
  ActivityLogsCollection.insert({
    userId: manager1Id,
    action: 'assign',
    entityType: 'task',
    entityId: 'task1',
    changes: { assignedTo: member3Id },
    createdAt: daysFromNow(-7),
  });

  ActivityLogsCollection.insert({
    userId: manager1Id,
    action: 'assign',
    entityType: 'task',
    entityId: 'task2',
    changes: { assignedTo: member1Id },
    createdAt: daysFromNow(-14),
  });

  // Task completions
  ActivityLogsCollection.insert({
    userId: member1Id,
    action: 'complete',
    entityType: 'task',
    entityId: 'task5',
    changes: { status: 'done' },
    createdAt: daysFromNow(-12),
  });

  // Task updates
  ActivityLogsCollection.insert({
    userId: member2Id,
    action: 'update',
    entityType: 'task',
    entityId: 'task4',
    changes: { status: 'review' },
    createdAt: daysFromNow(-1),
  });

  ActivityLogsCollection.insert({
    userId: member3Id,
    action: 'update',
    entityType: 'task',
    entityId: 'task1',
    changes: { actualHours: 8 },
    createdAt: daysFromNow(-1),
  });

  console.log('✅ Created sample activity logs');
}

/**
 * Main seed function
 *
 * Called from server/main.ts on startup
 */
export function seedDatabase() {
  console.log('\n🌱 Starting database seed process...\n');

  // SAFETY CHECK: Only seed if database is empty
  const userCount = Meteor.users.find().count();
  const projectCount = ProjectsCollection.find().count();
  const taskCount = TasksCollection.find().count();

  if (userCount > 0 || projectCount > 0 || taskCount > 0) {
    console.log('⏭️  Database already has data, skipping seed process');
    console.log(`   Users: ${userCount}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Tasks: ${taskCount}`);
    return;
  }

  // Create data in order (respecting dependencies)
  const userIds = createUsers();

  if (!userIds) {
    console.error('❌ Failed to create users, aborting seed');
    return;
  }

  const projectIds = createProjects(userIds);

  if (!projectIds) {
    console.error('❌ Failed to create projects, aborting seed');
    return;
  }

  createTasks(userIds, projectIds);
  createActivityLogs(userIds, projectIds);

  console.log('\n✨ Database seeding complete!\n');
  console.log('📝 You can now login with:');
  console.log('   Username: admin, Password: admin123');
  console.log('   Username: manager1, Password: manager123');
  console.log('   Username: member1, Password: member123');
  console.log('\n');
}

/**
 * KEY CONCEPTS DEMONSTRATED:
 *
 * 1. Accounts.createUser(): Proper user creation with bcrypt hashing
 * 2. Relationship Data: Users -> Projects -> Tasks (foreign keys)
 * 3. Data Variety: Different statuses, priorities, dates for testing
 * 4. Realistic Data: Descriptive names and descriptions
 * 5. Temporal Data: Past, present, future dates for time-based queries
 * 6. Denormalization: Updating project counters
 * 7. Safety Checks: Don't seed if data exists
 * 8. Dependency Order: Create users before projects, projects before tasks
 * 9. Activity Trail: Logs matching the created data
 * 10. Test Scenarios: Overdue tasks, completed projects, etc.
 */
