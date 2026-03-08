/**
 * Utilities for generating standard folder paths for Google Drive uploads
 */

import { Brand, Project } from '../types';

/**
 * Get the standardized folder path for a project based on its brand
 */
export const getProjectFolderPath = (brandName: string | undefined, projectName: string | undefined): string => {
  const safeBrand = (brandName || 'Uncategorized Brands').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
  const safeProject = (projectName || 'Unnamed Project').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
  return `${safeBrand}/${safeProject}`;
};

/**
 * Get the standardized folder path for a brand
 */
export const getBrandFolderPath = (brandName: string | undefined): string => {
  const safeBrand = (brandName || 'Uncategorized Brands').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
  return `${safeBrand}`;
};

/**
 * Get standard subfolder paths within a project
 */
export const getProjectSubfolderPath = (brandName: string | undefined, projectName: string | undefined, subfolder: 'Tasks' | 'Feedback' | 'Mockups' | 'Videos' | 'Deliverables' | 'Roadmap'): string => {
  const projectPath = getProjectFolderPath(brandName, projectName);
  return `${projectPath}/${subfolder}`;
};

/**
 * Global fallback folders
 */
export const GLOBAL_FOLDERS = {
  PROFILES: 'Profiles',
  ROADMAP: 'Roadmap',
  GENERAL: 'General'
};
