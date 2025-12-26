/**
 * User Types
 *
 * WHY: Defining types separately from collection instances provides:
 * 1. Reusability across client and server
 * 2. Better IDE autocomplete and type checking
 * 3. Clear documentation of data structures
 * 4. Compile-time safety when working with documents
 *
 * SINGLE RESPONSIBILITY: This file contains ONLY user-related types
 */

/**
 * User role types for authorization
 *
 * - admin: Full system access, can manage all projects/tasks
 * - manager: Can create projects and manage team members
 * - member: Can be assigned tasks and work on projects
 */
export type UserRole = 'admin' | 'manager' | 'member';

/**
 * User profile information
 *
 * NOTE: This extends Meteor's default user object
 * Meteor stores authentication data in the root user object,
 * but we store custom fields in the profile subdocument
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
}

/**
 * Extended Meteor User type
 *
 * WHY: Meteor's default User type doesn't include our custom profile fields
 * This interface extends it with our application-specific data
 */
export interface User {
  _id?: string;
  username?: string;
  emails?: Array<{
    address: string;
    verified: boolean;
  }>;
  profile?: UserProfile;
  createdAt?: Date;

  // NOTE: services field contains hashed passwords and OAuth tokens
  // We never send this to the client for security reasons
  services?: any;
}
