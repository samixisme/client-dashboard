import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs';

dotenv.config({ path: '.env.production' });

async function testSharedDriveUpload() {
  console.log('🔍 Testing Shared Drive Upload Method\n');

  // Load credentials
  const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH!;
  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));

  // Create auth
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const driveId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  console.log('1️⃣ Checking if ID is a Shared Drive or folder...');

  // Check if it's a drive
  try {
    const driveInfo = await drive.drives.get({
      driveId: driveId
    });
    console.log('   ✅ This IS a Shared Drive (not a folder)');
    console.log('   Name:', driveInfo.data.name);
    console.log('   ID:', driveInfo.data.id);
  } catch (error: any) {
    console.log('   ℹ️ Not a drive ID, checking as folder...');
    const fileInfo = await drive.files.get({
      fileId: driveId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true
    });
    console.log('   This is a folder');
    console.log('   Name:', fileInfo.data.name);
    console.log('   Type:', fileInfo.data.mimeType);
  }

  console.log('\n2️⃣ Attempting upload without parents (Shared Drive root)...');
  try {
    const testContent = Buffer.from('Test upload ' + new Date().toISOString());
    const { Readable } = require('stream');
    const stream = Readable.from(testContent);

    const response = await drive.files.create({
      requestBody: {
        name: 'test-shared-drive.txt',
        driveId: driveId,  // Specify the drive
        // NO parents - uploads to root
      },
      media: {
        mimeType: 'text/plain',
        body: stream,
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });

    console.log('   ✅ Upload successful!');
    console.log('   File ID:', response.data.id);
    console.log('   File name:', response.data.name);
    console.log('   View at:', response.data.webViewLink);
  } catch (error: any) {
    console.error('   ❌ Upload failed:', error.message);
    console.error('   Code:', error.code);
  }

  console.log('\n3️⃣ Attempting upload WITH parents specified...');
  try {
    const testContent = Buffer.from('Test upload 2 ' + new Date().toISOString());
    const { Readable } = require('stream');
    const stream = Readable.from(testContent);

    const response = await drive.files.create({
      requestBody: {
        name: 'test-with-parent.txt',
        parents: [driveId],  // Try using driveId as parent
      },
      media: {
        mimeType: 'text/plain',
        body: stream,
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });

    console.log('   ✅ Upload successful!');
    console.log('   File ID:', response.data.id);
    console.log('   File name:', response.data.name);
  } catch (error: any) {
    console.error('   ❌ Upload failed:', error.message);
    console.error('   Code:', error.code);
  }
}

testSharedDriveUpload();
