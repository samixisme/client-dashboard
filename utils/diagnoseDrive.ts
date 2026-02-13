/**
 * Google Drive API Diagnostic Tool
 *
 * This script checks your Google Drive API setup and identifies common issues.
 */

import * as dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ path: '.env.production' });

interface DiagnosticResult {
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

async function runDiagnostics() {
  console.log('🔍 Google Drive API Diagnostics\n');
  console.log('━'.repeat(60));

  const results: DiagnosticResult[] = [];

  // Check 1: Environment Variables
  console.log('\n1️⃣ Checking Environment Variables...');

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!serviceAccountJson) {
    results.push({
      status: 'fail',
      message: 'GOOGLE_SERVICE_ACCOUNT_JSON not found',
      details: 'Missing service account credentials in .env.production'
    });
  } else {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      results.push({
        status: 'pass',
        message: 'Service account JSON is valid',
        details: `Project: ${parsed.project_id}, Email: ${parsed.client_email}`
      });
    } catch (e) {
      results.push({
        status: 'fail',
        message: 'Service account JSON is malformed',
        details: 'Cannot parse JSON credentials'
      });
    }
  }

  if (!folderId) {
    results.push({
      status: 'warning',
      message: 'GOOGLE_DRIVE_ROOT_FOLDER_ID not set',
      details: 'Will attempt to create new folder'
    });
  } else {
    results.push({
      status: 'pass',
      message: 'Root folder ID configured',
      details: `Folder ID: ${folderId}`
    });
  }

  // Check 2: Authentication
  console.log('\n2️⃣ Testing Authentication...');

  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      const authClient = await auth.getClient();
      const drive = google.drive({ version: 'v3', auth: authClient as any });

      // Try to get Drive info (this will fail if API not enabled)
      try {
        const response = await drive.about.get({ fields: 'user' });
        results.push({
          status: 'pass',
          message: 'Authentication successful',
          details: `Authenticated as: ${response.data.user?.emailAddress || 'Unknown'}`
        });
      } catch (error: any) {
        if (error.code === 403) {
          results.push({
            status: 'fail',
            message: 'Google Drive API not enabled',
            details: 'Visit https://console.cloud.google.com/apis/library/drive.googleapis.com to enable it'
          });
        } else {
          results.push({
            status: 'fail',
            message: 'Authentication failed',
            details: error.message
          });
        }
      }
    } catch (error: any) {
      results.push({
        status: 'fail',
        message: 'Failed to initialize auth client',
        details: error.message
      });
    }
  }

  // Check 3: Folder Access (if folder ID provided)
  if (folderId && serviceAccountJson) {
    console.log('\n3️⃣ Testing Folder Access...');

    try {
      const credentials = JSON.parse(serviceAccountJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      const authClient = await auth.getClient();
      const drive = google.drive({ version: 'v3', auth: authClient as any });

      try {
        const response = await drive.files.get({
          fileId: folderId,
          fields: 'id, name, mimeType, capabilities'
        });

        const capabilities = response.data.capabilities;
        const canEdit = capabilities?.canEdit || false;

        results.push({
          status: canEdit ? 'pass' : 'warning',
          message: canEdit ? 'Folder access verified' : 'Folder accessible but read-only',
          details: `Folder: ${response.data.name}, Can Edit: ${canEdit}`
        });
      } catch (error: any) {
        if (error.code === 404) {
          results.push({
            status: 'fail',
            message: 'Folder not found or not shared',
            details: 'Share the folder with the service account email'
          });
        } else if (error.code === 403) {
          results.push({
            status: 'fail',
            message: 'No permission to access folder',
            details: 'Share the folder with Editor permission'
          });
        } else {
          results.push({
            status: 'fail',
            message: 'Folder access failed',
            details: error.message
          });
        }
      }
    } catch (error: any) {
      results.push({
        status: 'fail',
        message: 'Could not check folder access',
        details: error.message
      });
    }
  }

  // Print Results
  console.log('\n━'.repeat(60));
  console.log('\n📊 Diagnostic Results:\n');

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    console.log();

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  });

  console.log('━'.repeat(60));
  console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings\n`);

  // Recommendations
  if (failCount > 0) {
    console.log('🔧 Recommended Actions:\n');

    const hasApiError = results.some(r => r.message.includes('API not enabled'));
    const hasFolderError = results.some(r => r.message.includes('Folder') && r.status === 'fail');
    const hasAuthError = results.some(r => r.message.includes('Authentication') && r.status === 'fail');

    if (hasApiError) {
      console.log('1. Enable Google Drive API:');
      console.log('   https://console.cloud.google.com/apis/library/drive.googleapis.com?project=client-dashboard-v2\n');
    }

    if (hasFolderError) {
      console.log('2. Share Google Drive folder:');
      console.log('   https://drive.google.com/drive/folders/1IkaY0KOpTZnjrvesoTRBl5pzW2eKQ7EW');
      console.log('   Add: client-dashboard-storage@client-dashboard-v2.iam.gserviceaccount.com');
      console.log('   Permission: Editor\n');
    }

    if (hasAuthError) {
      console.log('3. Verify service account credentials:');
      console.log('   Check GOOGLE_SERVICE_ACCOUNT_JSON in .env.production\n');
    }
  } else {
    console.log('✨ All checks passed! Your Google Drive integration is ready.\n');
  }
}

runDiagnostics().catch(error => {
  console.error('❌ Diagnostic script failed:', error);
  process.exit(1);
});
