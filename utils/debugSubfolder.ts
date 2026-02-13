// Diagnostic script to test subfolder creation
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.production' });

async function debugSubfolderCreation() {
  console.log('🔍 Diagnostic: Testing Subfolder Creation\n');

  try {
    // Step 1: Load credentials
    const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-service-account.json';
    const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

    // Step 2: Authenticate
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const sharedDriveId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

    console.log(`📁 Shared Drive ID: ${sharedDriveId}\n`);

    // Step 3: Try to create folder in Shared Drive
    console.log('1️⃣ Creating folder "test-uploads" in Shared Drive...');
    const folderMetadata = {
      name: 'test-uploads-debug',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [sharedDriveId],  // Parent is the Shared Drive
    };

    const folderResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name, parents, driveId',
      supportsAllDrives: true,
    });

    console.log('✅ Folder created!');
    console.log(`   Folder ID: ${folderResponse.data.id}`);
    console.log(`   Folder Name: ${folderResponse.data.name}`);
    console.log(`   Parents: ${JSON.stringify(folderResponse.data.parents)}`);
    console.log(`   Drive ID: ${folderResponse.data.driveId || 'Not in response'}\n`);

    // Step 4: Try to upload file to the newly created folder
    console.log('2️⃣ Uploading file to the created folder...');
    const fileContent = Buffer.from('Test file in subfolder!');
    const { Readable } = require('stream');
    const stream = Readable.from(fileContent);

    const fileMetadata = {
      name: 'test-file.txt',
      parents: [folderResponse.data.id!],  // Parent is the folder we just created
    };

    const media = {
      mimeType: 'text/plain',
      body: stream,
    };

    const fileResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, parents, webViewLink',
      supportsAllDrives: true,
    });

    console.log('✅ File uploaded!');
    console.log(`   File ID: ${fileResponse.data.id}`);
    console.log(`   File Name: ${fileResponse.data.name}`);
    console.log(`   Parents: ${JSON.stringify(fileResponse.data.parents)}`);
    console.log(`   Link: ${fileResponse.data.webViewLink}\n`);

    // Step 5: Verify by listing files in the folder
    console.log('3️⃣ Listing files in the created folder...');
    const listResponse = await drive.files.list({
      q: `'${folderResponse.data.id}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    console.log(`✅ Found ${listResponse.data.files?.length || 0} files in folder`);
    listResponse.data.files?.forEach(file => {
      console.log(`   - ${file.name}`);
    });

    console.log('\n========================================');
    console.log('✅ DIAGNOSTIC SUCCESSFUL!');
    console.log('========================================');
    console.log('\nThis proves that:');
    console.log('1. ✅ Folder creation in Shared Drive works');
    console.log('2. ✅ File upload to subfolder works');
    console.log('3. ✅ File listing in subfolder works');
    console.log('\nThe issue must be in the googleDrive.ts implementation.');

  } catch (error: any) {
    console.error('\n❌ DIAGNOSTIC FAILED!\n');
    console.error('Error:', error.message);
    if (error.response?.data?.error) {
      console.error('API Error:', JSON.stringify(error.response.data.error, null, 2));
    }
    process.exit(1);
  }
}

debugSubfolderCreation();
