import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { getDriveCache, setDriveCache, getFolderCache, setFolderCache } from './driveCache';
import { trackUpload, canUpload, getRemainingQuota } from './driveQuota';

// Google Drive API configuration
// Using 'drive' scope for full access to shared folders
// Note: 'drive.file' scope only works for files created by the app
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const ROOT_FOLDER_NAME = 'ClientDashboard-Storage';

// Service account credentials (loaded from environment)
let serviceAccountAuth: JWT | null = null;
let drive: any = null;
let rootFolderId: string | null = null;

/**
 * Initialize Google Drive API with service account credentials
 */
export const initializeDrive = async (): Promise<void> => {
  if (drive) return; // Already initialized

  const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!credentialsPath && !credentialsJson) {
    throw new Error(
      'Google Drive credentials not found. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON'
    );
  }

  let credentials;
  if (credentialsPath) {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  } else {
    credentials = JSON.parse(credentialsJson!);
  }

  // Use GoogleAuth (recommended approach) instead of manual JWT
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: SCOPES,
  });

  drive = google.drive({ version: 'v3', auth });

  // Get or create root folder
  rootFolderId = await getRootFolderId();
  console.log(`✅ Google Drive initialized. Root folder ID: ${rootFolderId}`);
};

/**
 * Get or create the root storage folder
 */
const getRootFolderId = async (): Promise<string> => {
  // Check if folder ID is provided via environment variable (preferred)
  const envFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (envFolderId) {
    // Verify the folder exists and is accessible
    try {
      const response = await drive.files.get({
        fileId: envFolderId,
        fields: 'id, name, mimeType',
        supportsAllDrives: true  // Required for Shared Drives
      });

      if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error(`GOOGLE_DRIVE_ROOT_FOLDER_ID points to a file, not a folder`);
      }

      // Cache the folder ID
      await setFolderCache('root', envFolderId);
      return envFolderId;
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(`Folder with ID ${envFolderId} not found. Make sure it's shared with the service account.`);
      }
      throw error;
    }
  }

  // Fallback: Check cache first
  const cached = await getFolderCache('root');
  if (cached) return cached;

  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  let folderId: string;

  if (response.data.files && response.data.files.length > 0) {
    folderId = response.data.files[0].id!;
  } else {
    // Create root folder
    const folderMetadata = {
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,  // Fixed: Changed from 'resource' to 'requestBody'
      fields: 'id',
    });

    folderId = folder.data.id!;
    console.log(`📁 Created root folder: ${ROOT_FOLDER_NAME}`);
  }

  // Cache for 24 hours
  await setFolderCache('root', folderId);
  return folderId;
};

/**
 * Get or create a folder by path (e.g., "projects/123/images")
 * REWRITTEN TO MATCH DIAGNOSTIC-PROVEN PATTERN
 */
export const getFolderId = async (folderPath: string): Promise<string> => {
  if (!drive) await initializeDrive();

  // Check cache
  const cached = await getFolderCache(folderPath);
  if (cached) return cached;

  const parts = folderPath.split('/').filter(p => p);
  let currentParentId = rootFolderId!;

  for (const folderName of parts) {
    console.log(`🔍 Looking for folder: ${folderName} in parent: ${currentParentId}`);

    // Search for folder
    const response = await drive.files.list({
      q: `name='${folderName}' and '${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (response.data.files && response.data.files.length > 0) {
      currentParentId = response.data.files[0].id!;
      console.log(`✅ Found existing folder: ${currentParentId}`);
    } else {
      // Create folder - EXACT PATTERN FROM DIAGNOSTIC
      console.log(`📁 Creating folder: ${folderName}`);
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [currentParentId],
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name, parents, driveId',  // Match diagnostic fields
        supportsAllDrives: true,
      });

      currentParentId = folder.data.id!;
      console.log(`✅ Created folder: ${currentParentId}`);
    }
  }

  // Cache the final folder ID
  await setFolderCache(folderPath, currentParentId);
  console.log(`📂 Final folder ID for path '${folderPath}': ${currentParentId}`);
  return currentParentId;
};

/**
 * Upload a file to Google Drive
 * REWRITTEN TO MATCH DIAGNOSTIC-PROVEN PATTERN
 * @param file - File buffer or File object
 * @param filePath - Virtual path (e.g., "projects/123/images/logo.png")
 * @returns Google Drive file ID
 */
export const uploadFile = async (
  file: Buffer | File,
  filePath: string
): Promise<string> => {
  if (!drive) await initializeDrive();

  // Check quota
  const fileSize = file instanceof Buffer ? file.length : file.size;
  if (!canUpload(fileSize)) {
    const remaining = getRemainingQuota();
    throw new Error(
      `Google Drive quota exceeded. Remaining: ${(remaining / 1024 / 1024).toFixed(2)}MB`
    );
  }

  // Parse file path
  const pathParts = filePath.split('/');
  const fileName = pathParts.pop()!;
  const folderPath = pathParts.join('/');

  // Get folder ID
  console.log(`📁 Getting folder ID for path: '${folderPath}'`);
  const folderId = folderPath ? await getFolderId(folderPath) : rootFolderId!;
  console.log(`✅ Using folder ID: ${folderId}`);

  // Prepare file metadata - EXACT PATTERN FROM DIAGNOSTIC
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  // Upload file
  let media;
  if (file instanceof Buffer) {
    const { Readable } = require('stream');
    const stream = Readable.from(file);
    media = {
      mimeType: getMimeType(fileName),
      body: stream,
    };
  } else {
    // Browser File object
    media = {
      mimeType: file.type || getMimeType(fileName),
      body: file,
    };
  }

  console.log(`📤 Uploading file: ${fileName} to folder: ${folderId}`);
  const response = await drive.files.create({
    requestBody: fileMetadata,  // DIAGNOSTIC-PROVEN PATTERN
    media: media,
    fields: 'id, name, parents, webViewLink',  // Match diagnostic fields
    supportsAllDrives: true,
  });

  const fileId = response.data.id!;
  console.log(`✅ File uploaded! ID: ${fileId}`);

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true, // Required for shared drive files
  });

  // Track upload for quota management
  trackUpload(fileSize);

  // Cache file metadata
  await setDriveCache(`file:${fileId}`, response.data, 3600); // 1 hour TTL

  console.log(`✅ Uploaded: ${fileName} (ID: ${fileId})`);
  return fileId;
};

/**
 * Delete a file from Google Drive
 */
export const deleteFile = async (fileId: string): Promise<void> => {
  if (!drive) await initializeDrive();

  await drive.files.delete({
    fileId: fileId,
  });

  // Remove from cache
  await setDriveCache(`file:${fileId}`, null, 0);

  console.log(`🗑️ Deleted file: ${fileId}`);
};

/**
 * Generate a public download URL for a file
 * @param fileId - Google Drive file ID
 * @param filename - Optional custom filename for download
 * @returns Public download URL
 */
export const generatePublicUrl = (fileId: string, filename?: string): string => {
  // Direct download URL format
  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  if (filename) {
    // Add custom filename hint (may not always work)
    return `${baseUrl}&filename=${encodeURIComponent(filename)}`;
  }

  return baseUrl;
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (fileId: string): Promise<any> => {
  if (!drive) await initializeDrive();

  // Check cache
  const cached = await getDriveCache(`file:${fileId}`);
  if (cached) return cached;

  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime',
  });

  // Cache for 1 hour
  await setDriveCache(`file:${fileId}`, response.data, 3600);

  return response.data;
};

/**
 * List files in a folder
 */
export const listFiles = async (folderPath: string = ''): Promise<any[]> => {
  if (!drive) await initializeDrive();

  const folderId = folderPath ? await getFolderId(folderPath) : rootFolderId!;

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size, webViewLink, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
    supportsAllDrives: true,  // Required for Shared Drives
    includeItemsFromAllDrives: true,  // Include Shared Drive items in results
  });

  return response.data.files || [];
};

/**
 * Get MIME type from file extension
 */
const getMimeType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.zip': 'application/zip',
    '.json': 'application/json',
    '.txt': 'text/plain',
  };

  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Health check for Google Drive API
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    if (!drive) await initializeDrive();

    // Try to get root folder info
    await drive.files.get({
      fileId: rootFolderId,
      fields: 'id, name',
      supportsAllDrives: true  // Required for Shared Drives
    });

    return true;
  } catch (error) {
    console.error('❌ Google Drive health check failed:', error);
    return false;
  }
};

// Export for compatibility with existing Firebase Storage code
export { uploadFile as uploadFileToStorage };
export { deleteFile as deleteFileFromStorage };
