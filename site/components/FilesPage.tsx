
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { UserFile } from '../types';
import { api } from '../services/apiService';
import FileList from './FileList';
import FileEditor from './FileEditor';
import AddFileModal from './AddFileModal';
import MusicPlayer from './MusicPage'; // Renamed from MusicPage to MusicPlayer internally
import VideoPlayer from './VideoPlayer';
import ConfirmModal from './ConfirmModal';

interface FilesPageProps {
  user: { username: string };
  token: string;
}

const FilesPage: React.FC<FilesPageProps> = ({ user, token }) => {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || null;
  const musicFiles = files.filter(f => f.contentType.startsWith('audio/'));

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = e.clientX - containerRect.left;

      const minWidth = 200;
      const maxWidth = containerRect.width - 400;

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiFiles = await api.getFiles(token, user.username);
      const userFiles: UserFile[] = apiFiles.map(f => ({
        id: f.file_id,
        name: f.filename,
        contentType: f.content_type,
      }));
      
      setFiles(prevFiles => {
        // Revoke any existing object URLs from the previous state before setting the new one.
        prevFiles.forEach(file => {
          if (file.url) {
            URL.revokeObjectURL(file.url);
          }
        });
        return userFiles;
      });

    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить файлы.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token, user.username]);

  useEffect(() => {
    fetchFiles();
    // This effect should only run when the user or token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user.username]);

  useEffect(() => {
    const file = files.find(f => f.id === activeFileId);
    // Do not load content for audio or video files here, the players will handle it.
    if (!file || file.contentType.startsWith('audio/') || file.contentType.startsWith('video/')) {
      return;
    }

    let objectUrl: string | undefined;

    const loadContent = async () => {
      try {
        const blob = await api.getFileBlob(token, file.id);
        if (file.contentType.startsWith('text/')) {
          const text = await blob.text();
          setFiles(currentFiles =>
            currentFiles.map(f => (f.id === file.id ? { ...f, content: text, url: undefined } : f))
          );
        } else {
          // A new URL is created every time an image is selected.
          objectUrl = URL.createObjectURL(blob);
          setFiles(currentFiles =>
            currentFiles.map(f => (f.id === file.id ? { ...f, url: objectUrl, content: undefined } : f))
          );
        }
      } catch (err: any) {
        console.error("Failed to load file content:", err);
        setError('Не удалось загрузить содержимое файла.');
      }
    };
    
    loadContent();

    return () => {
      // This cleanup revokes the URL when the component unmounts or activeFileId changes.
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
    // This effect depends on the active file ID and token.
    // 'files' is intentionally omitted to prevent infinite loops. State updates use the functional form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, token]);

  const handleAddFile = async (fileName: string) => {
    if (!fileName.endsWith('.txt')) {
      fileName += '.txt';
    }
    const newFile = new File([''], fileName, { type: 'text/plain' });
    try {
      await api.uploadTextFile(token, user.username, newFile);
      await fetchFiles();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Не удалось создать файл.");
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await api.uploadFile(token, user.username, file);
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || "Не удалось загрузить файл.");
    } finally {
      event.target.value = ''; // Reset input to allow uploading same file again
    }
  };

  const handleSaveFile = async (fileId: string, content: string, filename: string) => {
    setError(null);
    try {
        const { new_file_id } = await api.updateTextFile(token, user.username, fileId, content, filename);
        // To ensure the UI is in sync, fetch all files again and set the new one as active.
        await fetchFiles();
        setActiveFileId(new_file_id);
    } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : "Не удалось сохранить файл.";
        setError(errorMessage);
        console.error("Failed to save file:", err);
        // Propagate error to allow UI feedback in the editor
        throw err;
    }
  };

  const requestFileDelete = (fileId: string) => {
    setError(null);
    setFileToDelete(fileId);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;

    const originalFiles = [...files];
    const fileIdToDelete = fileToDelete;

    setIsDeleting(true);
    setFileToDelete(null);

    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileIdToDelete));
    if (activeFileId === fileIdToDelete) {
      setActiveFileId(null);
    }
    setError(null);

    try {
      await api.deleteFile(token, fileIdToDelete);
    } catch (err: any) {
      setError(err.message || "Не удалось удалить файл.");
      console.error(err);
      setFiles(originalFiles);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div ref={containerRef} className="flex h-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept="*"
      />

      <div
        style={{ width: `${sidebarWidth}px` }}
        className="flex-shrink-0"
      >
        <FileList
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onAddFile={() => setIsModalOpen(true)}
          onUploadFile={handleUploadClick}
          onDeleteFile={requestFileDelete}
          isLoading={isLoading}
          error={error}
        />
      </div>

      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-soviet-red transition-colors duration-200 flex-shrink-0"
        aria-label="Resize panel"
        role="separator"
      />

      <div className="flex-1 min-w-0">
        {activeFile?.contentType.startsWith('audio/') ? (
          <MusicPlayer
            activeFile={activeFile}
            playlist={musicFiles}
            token={token}
            onTrackChange={setActiveFileId}
          />
        ) : activeFile?.contentType.startsWith('video/') ? (
          <VideoPlayer
            activeFile={activeFile}
            token={token}
          />
        ) : (
          <FileEditor
            activeFile={activeFile}
            onSave={handleSaveFile}
          />
        )}
      </div>

      {isModalOpen && (
        <AddFileModal
          onClose={() => setIsModalOpen(false)}
          onAddFile={handleAddFile}
        />
      )}

      <ConfirmModal
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Подтверждение удаления"
        message="Вы уверены, что хотите удалить этот файл? Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default FilesPage;
