/**
 * Users Collection
 *
 * SINGLE RESPONSIBILITY: This file handles ONLY the Users collection
 * - Collection instance
 * - Indexes
 * - Security rules
 */

import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import type { User } from './types';

/**
 * Users Collection
 *
 * IMPORTANT: We extend Meteor's built-in users collection
 * Meteor.users is already defined, so we just add our type
 *
 * WHY: Meteor handles authentication, password hashing, and sessions
 * We just extend it with our custom profile fields
 */
export const UsersCollection = Meteor.users as Mongo.Collection<User>;

// ============================================================================
// SERVER-SIDE CONFIGURATION
// ============================================================================

if (Meteor.isServer) {
  // --------------------------------------------------------------------------
  // INDEXES
  // --------------------------------------------------------------------------

  /**
   * Index: Email address
   *
   * NOTE: Meteor creates this automatically for authentication
   * We just document it here for completeness
   *
   * WHY UNIQUE:
   * Each email must belong to only one user
   * Prevents duplicate registrations
   */
  UsersCollection.createIndexAsync({ 'emails.address': 1 }, { unique: true, sparse: true });

  /**
   * Index: Username
   *
   * NOTE: Also created by Meteor automatically
   * Required for username-based login
   */
  UsersCollection.createIndexAsync({ username: 1 }, { unique: true, sparse: true });

  /**
   * Index: User Role
   *
   * QUERY PATTERN: "Show me all admin users"
   * Common in: Admin panels, permission management
   */
  UsersCollection.createIndexAsync({ 'profile.role': 1 });

  // --------------------------------------------------------------------------
  // SECURITY
  // --------------------------------------------------------------------------

  /**
   * Deny all client-side database operations
   *
   * WHY: Security through centralized control
   *
   * Users collection security is handled by Meteor Accounts package
   * We still deny most operations except profile updates
   */
  UsersCollection.deny({
    update: () => true,
    remove: () => true,
  });

  console.log('✅ Users collection indexes and security configured');
}
