
import React from 'react';
import type { UserFile } from '../types';

interface FileListProps {
  files: UserFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onUploadFile: () => void;
  onDeleteFile: (id: string) => void;
  isLoading: boolean;
  error: string | null;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);


const FileList: React.FC<FileListProps> = ({ files, activeFileId, onSelectFile, onAddFile, onUploadFile, onDeleteFile, isLoading, error }) => {
  
  const handleDeleteClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    onDeleteFile(fileId);
  };

  return (
    <div className="h-full bg-light-secondary dark:bg-dark-secondary flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold uppercase tracking-wider">Файлы</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
            <p className="text-gray-500 dark:text-gray-400 text-center p-4">Загрузка файлов...</p>
        ) : error ? (
            <p className="text-soviet-red text-center p-4">{error}</p>
        ) : files.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center p-4">Создайте или загрузите свой первый файл.</p>
        ) : (
            files.map(file => (
            <div
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`group flex items-center justify-between p-3 rounded-md mb-1 cursor-pointer border-l-4 transition-colors ${activeFileId === file.id ? 'bg-gray-200 dark:bg-gray-700 border-soviet-red' : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
                <p className="font-bold truncate pr-2" title={file.name}>{file.name}</p>
                 <button
                    onClick={(e) => handleDeleteClick(e, file.id)}
                    className="flex-shrink-0 p-1 rounded-full text-gray-500 hover:text-soviet-red opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    title={`Удалить файл ${file.name}`}
                    aria-label={`Удалить файл ${file.name}`}
                >
                    <TrashIcon />
                </button>
            </div>
            ))
        )}
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddFile}
              className="flex-1 bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-2 uppercase tracking-wider flex items-center justify-center text-xs transition-colors duration-200 rounded-md"
            >
              <PlusIcon />
              <span className="ml-2">Создать</span>
            </button>
            <button
              onClick={onUploadFile}
              className="flex-1 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white font-bold py-2 px-2 uppercase tracking-wider flex items-center justify-center text-xs transition-colors duration-200 rounded-md"
            >
              <UploadIcon />
              <span className="ml-2">Загрузить</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default FileList;
