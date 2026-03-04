/**
 * Utility for uploading files to Google Drive directly from the frontend.
 * Replaces Firebase Storage upload functionality.
 */
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com');

export const uploadToDrive = async (
  file: File | Blob,
  folderPath: string,
  fileName?: string,
  onProgress?: (progress: number) => void
): Promise<{ id: string; url: string }> => {
  const formData = new FormData();
  formData.append('file', file, fileName || (file instanceof File ? file.name : 'upload.file'));
  if (folderPath) {
    formData.append('folder', folderPath);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/drive/upload`);
    xhr.withCredentials = true;

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            id: data.fileId,
            url: data.webViewLink
          });
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};
