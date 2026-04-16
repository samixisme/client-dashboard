import { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useDriveFiles } from '../../hooks/useDriveFiles';
import { ProjectFile } from '../../types';

export function useProjectFiles(projectId: string | undefined): ProjectFile[] {
  const { data } = useData();
  const { files: driveFiles } = useDriveFiles({ projectId });

  return useMemo(() => {
    if (!projectId) return [];
    
    const aggregatedFiles: ProjectFile[] = [];

    // 1. Drive Files
    if (driveFiles && driveFiles.length > 0) {
      const mappedDrive = driveFiles.map((file): ProjectFile => ({
        id: `drive:${file.id}`,
        projectId,
        name: file.name,
        url: file.webViewLink || '',
        type: file.mimeType || 'file',
        source: 'drive',
        createdAt: file.createdTime,
        size: parseFloat(file.size || '0'),
        thumbnailUrl: file.thumbnailLink,
      }));
      aggregatedFiles.push(...mappedDrive);
    }

    // 2. Project Links
    const links = data.projectLinks?.filter(link => link.projectId === projectId) || [];
    if (links.length > 0) {
      const mappedLinks = links.map((link): ProjectFile => ({
        id: `link:${link.id}`,
        projectId,
        name: link.title || link.url,
        url: link.url,
        type: 'link',
        source: 'link',
        createdAt: link.createdAt,
        thumbnailUrl: link.favicon,
      }));
      aggregatedFiles.push(...mappedLinks);
    }

    // 3. Task Attachments
    // ⚡ Bolt: Use a Set for O(1) lookup to avoid O(N*M) performance degradation when filtering tasks by boardId
    const projectBoardIds = new Set(
      data.boards?.filter(b => b.projectId === projectId).map(b => b.id) || []
    );
      
    const tasks = data.tasks?.filter(t => projectBoardIds.has(t.boardId)) || [];
    tasks.forEach(task => {
      if (task.attachments && task.attachments.length > 0) {
        const attachs = task.attachments.map((att): ProjectFile => ({
          id: `task:${task.id}:${att.id}`,
          projectId,
          name: att.name,
          url: att.url,
          type: att.type,
          source: 'task',
          sourceRoute: `/projects/${projectId}/board/${task.boardId}?task=${task.id}`,
          createdAt: task.createdAt,
        }));
        aggregatedFiles.push(...attachs);
      }
    });

    // 4. Feedback Mockups
    const mockups = data.feedbackMockups?.filter(m => m.projectId === projectId) || [];
    mockups.forEach(mockup => {
      if (mockup.images && mockup.images.length > 0) {
        const imgs = mockup.images.map((img): ProjectFile => ({
          id: `mockup:${mockup.id}:${img.id}`,
          projectId,
          name: img.name,
          url: img.url,
          type: 'image', 
          source: 'mockup',
          sourceRoute: `/projects/${projectId}/feedback/${mockup.id}`,
          createdAt: img.createdAt || new Date(),
        }));
        aggregatedFiles.push(...imgs);
      }
    });

    // 5. Feedback Videos
    const videos = data.feedbackVideos?.filter(v => v.projectId === projectId) || [];
    videos.forEach(video => {
      if (video.videos && video.videos.length > 0) {
        const vids = video.videos.map((vid): ProjectFile => ({
          id: `video:${video.id}:${vid.id}`,
          projectId,
          name: vid.name,
          url: vid.url,
          type: 'video',
          source: 'video',
          sourceRoute: `/projects/${projectId}/feedback/${video.id}`,
          createdAt: new Date(),
        }));
        aggregatedFiles.push(...vids);
      }
    });

    return aggregatedFiles;
  }, [
    projectId,
    driveFiles,
    data.projectLinks,
    data.boards,
    data.tasks,
    data.feedbackMockups,
    data.feedbackVideos,
  ]);
}
