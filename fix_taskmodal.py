import sys

path = r'c:\Users\Sami\client-dashboard\components\TaskModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';\n", "")
content = content.replace("import { storage, db } from '../utils/firebase';", "import { db } from '../utils/firebase';")

old_upload = """                // Strip task ID of timestamp if it's a Firestore ID for cleaner path, or just use ID
                const storageRef = ref(storage, `projects/${project.id}/tasks/${task.id}/attachments/${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);"""

new_upload = """                const brandName = data.brands.find(b => b.id === project?.brandId)?.name || 'Unknown Brand';
                const { getProjectSubfolderPath } = await import('../utils/folderPaths');
                const { uploadToDrive } = await import('../utils/driveUpload');
                
                const folderPath = getProjectSubfolderPath(brandName, project.name, 'Tasks');

                const result = await uploadToDrive(file, folderPath, file.name);
                const url = result.url;"""

content = content.replace(old_upload, new_upload)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
