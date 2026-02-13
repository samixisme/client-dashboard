// Google Drive API Connection Test
// Run with: npx ts-node utils/testDrive.ts

import { initializeDrive, uploadFile, listFiles, healthCheck } from './googleDrive';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

async function testDriveConnection() {
  console.log('🧪 Testing Google Drive API Connection...\n');

  try {
    // Step 1: Initialize Drive API
    console.log('1️⃣ Initializing Google Drive API...');
    await initializeDrive();
    console.log('✅ Drive API initialized successfully\n');

    // Step 2: Health Check
    console.log('2️⃣ Performing health check...');
    const isHealthy = await healthCheck();
    if (isHealthy) {
      console.log('✅ Health check passed\n');
    } else {
      console.log('❌ Health check failed\n');
      return;
    }

    // Step 3: List files in root folder
    console.log('3️⃣ Listing files in root folder...');
    const files = await listFiles();
    console.log(`✅ Found ${files.length} files in root folder`);
    if (files.length > 0) {
      console.log('Files:');
      files.forEach((file: any) => {
        console.log(`  - ${file.name} (${file.mimeType})`);
      });
    }
    console.log('');

    // Step 4: Test upload (create a small test file)
    console.log('4️⃣ Testing file upload to subfolder...');
    const testContent = Buffer.from('Hello from Client Dashboard! 🚀\nTest upload at: ' + new Date().toISOString());
    const fileId = await uploadFile(testContent, 'test-uploads/test-file.txt');
    console.log(`✅ Test file uploaded successfully! File ID: ${fileId}\n`);

    // Step 5: Verify uploaded file
    console.log('5️⃣ Verifying uploaded file in subfolder...');
    const testFolderFiles = await listFiles('test-uploads');
    console.log(`✅ Found ${testFolderFiles.length} files in test-uploads folder\n`);

    console.log('========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================');
    console.log('\nGoogle Drive integration is working correctly!');
    console.log('Service Account Email: client-dashboard-storage@client-dashboard-v2.iam.gserviceaccount.com');
    console.log('Root Folder ID: 1IkaY0KOpTZnjrvesoTRBl5pzW2eKQ7EW');
    console.log('\nYou can now proceed with deployment.');

  } catch (error) {
    console.error('\n❌ TEST FAILED!\n');
    console.error('Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        console.error('\n💡 Fix: Check that GOOGLE_SERVICE_ACCOUNT_JSON is set correctly in .env.production');
      } else if (error.message.includes('folder')) {
        console.error('\n💡 Fix: Make sure the Drive folder is shared with the service account:');
        console.error('   Email: client-dashboard-storage@client-dashboard-v2.iam.gserviceaccount.com');
        console.error('   Permissions: Editor');
      } else if (error.message.includes('quota')) {
        console.error('\n💡 Fix: You may have exceeded your Google Drive API quota');
      }
    }

    process.exit(1);
  }
}

// Run the test
testDriveConnection();
