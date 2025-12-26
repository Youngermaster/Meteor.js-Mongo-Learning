/**
 * Users Module
 *
 * Barrel export for all user-related functionality
 * This provides a clean import interface:
 *
 * import { UsersCollection, User, UserRole } from '/imports/api/users';
 */

// Export types
export type { User, UserProfile, UserRole } from './types';

// Export collection
export { UsersCollection } from './collection';
