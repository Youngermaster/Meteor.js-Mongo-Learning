/**
 * Server Entry Point
 *
 * This file runs ONLY on the server when Meteor starts.
 *
 * RESPONSIBILITIES:
 * 1. Import collections (to create indexes)
 * 2. Import methods (to register them)
 * 3. Import publications (to register them)
 * 4. Import aggregations (to register methods)
 * 5. Seed database with sample data (development only)
 *
 * IMPORT ORDER MATTERS:
 * - Collections first (create schemas and indexes)
 * - Methods second (they use collections)
 * - Publications third (they use collections)
 * - Fixtures last (they use everything)
 */

import { Meteor } from 'meteor/meteor';

// ============================================================================
// 1. IMPORT COLLECTIONS
// ============================================================================
// WHY: This creates the collection instances and sets up indexes
// The collections.ts file has server-side code that runs on import
import '/imports/api/collections';

// ============================================================================
// 2. IMPORT METHODS
// ============================================================================
// WHY: Registers Meteor.methods() for client-server communication
// Methods handle all write operations (CRUD)
import '/imports/api/methods/projects.methods';
import '/imports/api/methods/tasks.methods';

// ============================================================================
// 3. IMPORT PUBLICATIONS
// ============================================================================
// WHY: Registers Meteor.publish() for reactive data subscriptions
// Publications control what data clients can access via DDP
import '/imports/api/publications/publications';

// ============================================================================
// 4. IMPORT AGGREGATIONS
// ============================================================================
// WHY: Registers aggregation methods for analytics and reporting
import '/imports/api/aggregations/aggregations';

// ============================================================================
// 5. IMPORT FIXTURES (Seed Data)
// ============================================================================
// WHY: Provides sample data for development and testing
import { seedDatabase } from './fixtures';

// ============================================================================
// SERVER STARTUP
// ============================================================================

Meteor.startup(() => {
  console.log('\n🚀 Meteor server starting...\n');

  // ENVIRONMENT INFO
  console.log('📝 Environment:', process.env.NODE_ENV || 'development');
  console.log('🌐 ROOT_URL:', process.env.ROOT_URL || 'http://localhost:3000');
  console.log('🗄️  MongoDB URL:', process.env.MONGO_URL ? 'Connected' : 'Using local MongoDB');

  // SEED DATABASE (Development only)
  // IMPORTANT: In production, you'd check for environment first
  // if (process.env.NODE_ENV === 'development') { seedDatabase(); }
  seedDatabase();

  console.log('✅ Server startup complete\n');
  console.log('📚 Available Methods:');
  console.log('   Projects: projects.insert, projects.update, projects.remove');
  console.log('   Tasks: tasks.insert, tasks.update, tasks.remove, tasks.assign');
  console.log('   Aggregations: aggregations.getUserStatistics, etc.');
  console.log('\n📡 Available Publications:');
  console.log('   Users: users.current, users.list');
  console.log('   Projects: projects.owned, projects.memberOf, projects.single');
  console.log('   Tasks: tasks.byProject, tasks.assignedToMe, tasks.single');
  console.log('   Activity: activityLogs.mine, activityLogs.dashboard');
  console.log('\n🎯 Ready for connections!\n');
});

/**
 * METEOR STARTUP LIFECYCLE:
 *
 * 1. File Loading: Meteor loads all files (imports run)
 *    - Collections are created
 *    - Indexes are created
 *    - Methods are registered
 *    - Publications are registered
 *
 * 2. Meteor.startup(): Runs after all files are loaded
 *    - Database is ready
 *    - Can query/insert data
 *    - Can set up timers, background jobs, etc.
 *
 * 3. Server Ready: Accepts client connections
 *    - Methods can be called
 *    - Publications can be subscribed to
 *    - DDP connections established
 */

/**
 * PRODUCTION CONSIDERATIONS:
 *
 * 1. Environment Variables:
 *    - MONGO_URL: Production database connection
 *    - ROOT_URL: Public URL of your app
 *    - MAIL_URL: Email service (for password resets, etc.)
 *
 * 2. Security:
 *    - Don't seed database in production
 *    - Use strong MONGO_URL credentials
 *    - Enable HTTPS (ROOT_URL should be https://)
 *
 * 3. Performance:
 *    - Ensure indexes are created (they are in collections.ts)
 *    - Consider connection pooling settings
 *    - Monitor memory usage
 *
 * 4. Logging:
 *    - Use proper logging service (not console.log)
 *    - Log errors to monitoring service
 *    - Track performance metrics
 */
