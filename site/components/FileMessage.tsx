import React from 'react';

interface FileMessageProps {
  file: {
    id: string;
    name: string;
  };
  onClick: () => void;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const FileMessage: React.FC<FileMessageProps> = ({ file, onClick }) => {
  const displayName = file.name || 'Прикрепленный файл';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full max-w-[250px] sm:max-w-[300px] py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-2 transition-colors duration-150"
    >
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <FileIcon />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-sm font-semibold truncate text-dark-primary dark:text-light-primary" title={displayName}>
          {displayName}
        </p>
        <span className="text-xs text-soviet-red font-medium">
          Открыть предпросмотр
        </span>
      </div>
    </button>
  );
};

export default FileMessage;