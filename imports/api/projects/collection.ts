/**
 * Projects Collection
 *
 * SINGLE RESPONSIBILITY: This file handles ONLY the Projects collection
 * - Collection instance
 * - Indexes
 * - Security rules
 */

import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import type { Project } from './types';

/**
 * Projects Collection
 *
 * WHY: We use Mongo.Collection<Project> for type safety
 * TypeScript will now enforce that all documents match the Project interface
 *
 * The generic type parameter tells TypeScript:
 * - What shape documents have when reading
 * - What fields are required when inserting
 * - What fields are available for updates
 */
export const ProjectsCollection = new Mongo.Collection<Project>('projects');

// ============================================================================
// SERVER-SIDE CONFIGURATION
// ============================================================================

if (Meteor.isServer) {
  /**
   * Database Indexes
   *
   * WHY INDEXES MATTER:
   * Without indexes, MongoDB scans every document (collection scan)
   * With indexes, MongoDB can jump directly to matching documents
   *
   * EXAMPLE:
   * Query: Projects.find({ ownerId: 'abc123' })
   * Without index: Scans ALL projects (slow if you have 100,000 projects)
   * With index: Jumps to projects for 'abc123' (fast even with millions)
   *
   * TRADEOFF:
   * - Indexes speed up reads but slow down writes slightly
   * - Indexes consume disk space and memory
   * - Only index fields you actually query on
   */

  // --------------------------------------------------------------------------
  // INDEXES
  // --------------------------------------------------------------------------

  /**
   * Index: Owner + Status
   *
   * QUERY PATTERN: "Show me all active projects I own"
   * Common in: Dashboard, project list
   *
   * WHY COMPOUND INDEX:
   * We often filter by BOTH ownerId and status together
   * MongoDB can use this index for:
   * - { ownerId: '...' }
   * - { ownerId: '...', status: '...' }
   * But NOT for { status: '...' } alone (order matters!)
   *
   * INDEX DIRECTION:
   * 1 = ascending, -1 = descending
   * For filtering, direction doesn't matter much
   * For sorting, match your typical sort order
   */
  ProjectsCollection.createIndexAsync({ ownerId: 1, status: 1 });

  /**
   * Index: Team Members + Status
   *
   * QUERY PATTERN: "Show me projects where I'm a team member"
   * Common in: User's project list, team collaboration views
   *
   * WHY ARRAY INDEX:
   * teamMemberIds is an array field
   * MongoDB creates a multi-key index - one entry per array element
   * This makes array queries efficient
   */
  ProjectsCollection.createIndexAsync({ teamMemberIds: 1, status: 1 });

  /**
   * Index: Status + Created Date
   *
   * QUERY PATTERN: "Show me recent active projects"
   * Common in: Home page, recent activity feeds
   *
   * WHY -1 for createdAt:
   * We typically want newest first
   * -1 (descending) matches our typical sort order
   */
  ProjectsCollection.createIndexAsync({ status: 1, createdAt: -1 });

  /**
   * Index: Tags
   *
   * QUERY PATTERN: "Show me all projects tagged 'urgent'"
   * Common in: Tag-based filtering
   *
   * WHY ARRAY INDEX:
   * tags is an array field
   * Multi-key index allows efficient tag searches
   */
  ProjectsCollection.createIndexAsync({ tags: 1 });

  /**
   * Index: Priority + Status
   *
   * QUERY PATTERN: "Show me high priority active projects"
   * Common in: Priority-based views, dashboards
   */
  ProjectsCollection.createIndexAsync({ 'metadata.priority': 1, status: 1 });

  // --------------------------------------------------------------------------
  // SECURITY
  // --------------------------------------------------------------------------

  /**
   * Deny all client-side database operations
   *
   * WHY: Security through centralized control
   *
   * By default, Meteor allows client-side inserts/updates/deletes
   * This is DANGEROUS because:
   * 1. Clients can be hacked/manipulated
   * 2. No centralized validation
   * 3. Hard to audit changes
   * 4. Can't enforce business logic
   *
   * SOLUTION: Deny all, use Meteor Methods instead
   * Methods run on server, can't be bypassed, enforce security
   */
  ProjectsCollection.deny({
    insert: () => true,
    update: () => true,
    remove: () => true,
  });

  console.log('✅ Projects collection indexes and security configured');
}
