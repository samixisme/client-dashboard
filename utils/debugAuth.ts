import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { google } from 'googleapis';

dotenv.config({ path: '.env.production' });

async function debugAuth() {
  console.log('🔍 Debugging Google Drive Authentication\n');

  // Step 1: Check environment variables
  console.log('1️⃣ Environment Variables:');
  console.log('   GOOGLE_SERVICE_ACCOUNT_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
  console.log('   GOOGLE_DRIVE_ROOT_FOLDER_ID:', process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
  console.log();

  // Step 2: Load credentials
  console.log('2️⃣ Loading Credentials:');
  const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (!credPath) {
    console.error('   ❌ No credential path found!');
    return;
  }

  console.log('   Reading from:', credPath);
  const credContent = fs.readFileSync(credPath, 'utf8');
  console.log('   File size:', credContent.length, 'bytes');

  const credentials = JSON.parse(credContent);
  console.log('   ✅ JSON parsed successfully');
  console.log('   Client email:', credentials.client_email);
  console.log('   Project ID:', credentials.project_id);

  // Step 3: Check private key format
  console.log('\n3️⃣ Private Key Check:');
  const pk = credentials.private_key;
  console.log('   Length:', pk.length, 'characters');
  console.log('   Starts with:', pk.substring(0, 30) + '...');
  console.log('   Contains actual newlines:', pk.includes('\n'));
  console.log('   Contains literal \\n:', pk.includes('\\n'));

  // Show first few lines
  const lines = pk.split('\n');
  console.log('   First 3 lines:');
  lines.slice(0, 3).forEach((line, i) => {
    console.log(`     ${i}: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
  });

  // Step 4: Try to create JWT client
  console.log('\n4️⃣ Creating JWT Client:');
  try {
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    console.log('   ✅ JWT client created');

    // Step 5: Try to authorize
    console.log('\n5️⃣ Attempting Authorization:');
    await auth.authorize();
    console.log('   ✅ Authorization successful!');
    console.log('   Access token (first 20 chars):', auth.credentials.access_token?.substring(0, 20) + '...');

    // Step 6: Try actual API call
    console.log('\n6️⃣ Testing API Call:');
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const response = await drive.files.get({
      fileId: folderId!,
      fields: 'id, name, mimeType'
    });

    console.log('   ✅ API call successful!');
    console.log('   Folder name:', response.data.name);
    console.log('   Folder ID:', response.data.id);

  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    console.error('\n   Full error:', error);
  }
}

debugAuth();
