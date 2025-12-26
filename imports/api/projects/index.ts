/**
 * Projects Module
 *
 * Barrel export for all project-related functionality
 *
 * import { ProjectsCollection, Project, ProjectStatus } from '/imports/api/projects';
 */

// Export types
export type {
  Project,
  ProjectStatus,
  ProjectMetadata,
  Priority,
  NewProject,
  ProjectUpdate,
  ProjectListItem,
} from './types';

// Export collection
export { ProjectsCollection } from './collection';
