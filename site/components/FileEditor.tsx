import React, { useState, useEffect } from 'react';
import type { UserFile } from '../types';

interface FileEditorProps {
  activeFile: UserFile | null;
  onSave: (fileId: string, content: string, filename: string) => Promise<void>;
}

// Icons
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

const ZoomInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3h-6" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
);

const ResetZoomIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4L16 16" />
    </svg>
);


const FileEditor: React.FC<FileEditorProps> = ({ activeFile, onSave }) => {
  const [content, setContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // State for image viewer
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (activeFile?.content !== undefined) {
      setContent(activeFile.content);
    } else {
      setContent(null);
    }
    setSaveError(null);
    // Reset image viewer state when file changes
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
  }, [activeFile]);

  const handleSave = async () => {
    if (!activeFile || content === null) return;
    
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(activeFile.id, content, activeFile.name);
    } catch (err: any) {
      setSaveError(err.message || 'Не удалось сохранить файл.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeFile) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
        <h2 className="text-2xl">Выберите файл для просмотра</h2>
        <p>Или создайте новый, нажав кнопку в левой панели.</p>
      </div>
    );
  }

  const handleDownload = () => {
    if (!activeFile) return;

    let urlToDownload: string | null = null;
    let needsRevoke = false;

    if (activeFile.url) {
      urlToDownload = activeFile.url;
    } else if (activeFile.content !== undefined) {
      // Create a temporary URL for text content
      const blob = new Blob([activeFile.content], { type: activeFile.contentType });
      urlToDownload = URL.createObjectURL(blob);
      needsRevoke = true;
    }

    if (urlToDownload) {
      const a = document.createElement('a');
      a.href = urlToDownload;
      a.download = activeFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (needsRevoke) {
        URL.revokeObjectURL(urlToDownload);
      }
    }
  };

  // --- Image Viewer Handlers ---
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.2));
  const handleResetView = () => {
      setZoom(1);
      setTranslate({ x: 0, y: 0 });
  };
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const scaleAmount = -e.deltaY * 0.001;
      setZoom(z => Math.max(0.2, Math.min(z + scaleAmount, 5)));
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Only main button
      e.preventDefault();
      setIsDragging(true);
      setStartPos({
        x: e.clientX - translate.x,
        y: e.clientY - translate.y,
      });
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();
      setTranslate({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
  };
  const handleMouseLeave = () => {
      setIsDragging(false);
  };
  // --- End Image Viewer Handlers ---

  const isTextFile = activeFile.contentType.startsWith('text/');
  const isContentLoaded = activeFile.content !== undefined || activeFile.url !== undefined;
  const hasChanges = isTextFile && content !== null && content !== activeFile.content;

  const renderContent = () => {
    if (!isContentLoaded) {
        return (
             <div className="w-full h-full flex items-center justify-center text-gray-500">
                <p>Загрузка содержимого файла...</p>
            </div>
        )
    }

    if (isTextFile) {
        return (
            <textarea
              value={content ?? ''}
              onChange={(e) => setContent(e.target.value)}
              readOnly={isSaving}
              className="w-full h-full bg-light-secondary dark:bg-dark-primary text-dark-primary dark:text-light-primary resize-none outline-none text-lg p-4 box-border"
              placeholder="Файл пуст. Начните вводить текст..."
            />
        )
    }

    if (activeFile.contentType.startsWith('image/')) {
        return (
             <div 
                className="w-full h-full flex items-center justify-center bg-light-primary dark:bg-dark-primary overflow-hidden relative select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <img 
                    src={activeFile.url} 
                    alt={activeFile.name} 
                    className="max-w-none max-h-none shadow-lg transition-transform duration-75 ease-out" 
                    style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})` }}
                    draggable="false"
                />
                
                {/* Zoom controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm shadow-lg">
                    <button onClick={handleZoomOut} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors" aria-label="Уменьшить">
                        <ZoomOutIcon />
                    </button>
                    <span 
                        className="font-mono w-16 text-center cursor-pointer"
                        title="Сбросить масштаб (двойной клик)"
                        onDoubleClick={handleResetView}
                    >
                        {Math.round(zoom * 100)}%
                    </span>
                    <button onClick={handleZoomIn} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors" aria-label="Увеличить">
                        <ZoomInIcon />
                    </button>
                    <div className="w-px h-4 bg-white/20"></div>
                    <button onClick={handleResetView} className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors" aria-label="Сбросить">
                        <ResetZoomIcon />
                    </button>
                </div>
            </div>
        );
    }
    
    if (activeFile.contentType === 'application/pdf') {
        return (
             <object
                data={activeFile.url}
                type="application/pdf"
                className="w-full h-full"
                aria-label={activeFile.name}
            >
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center bg-light-primary dark:bg-dark-primary">
                    <h2 className="text-xl">Не удалось отобразить PDF.</h2>
                    <p>Ваш браузер может не поддерживать встроенное отображение PDF. Вы можете скачать файл, чтобы просмотреть его.</p>
                </div>
            </object>
        )
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
            <h2 className="text-xl">Предпросмотр недоступен</h2>
            <p className="mb-4">Тип файла: {activeFile.contentType}</p>
        </div>
    );
  }


  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-light-secondary dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h2 className="text-xl font-bold truncate" title={activeFile.name}>{activeFile.name}</h2>
         <div className="flex items-center gap-2">
            {isTextFile && isContentLoaded && (
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 uppercase tracking-wider flex items-center justify-center text-xs transition-colors duration-200 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <SaveIcon />
                    <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
            )}
            {isContentLoaded && (
                 <button
                    onClick={handleDownload}
                    className="bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider flex items-center justify-center text-xs transition-colors duration-200 rounded-md"
                >
                    <DownloadIcon />
                    <span>Скачать</span>
                </button>
            )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-light-primary dark:bg-dark-primary relative">
        {saveError && (
             <div className="absolute top-2 right-2 bg-soviet-red/20 border border-soviet-red text-soviet-red px-3 py-2 rounded-md text-sm z-10">
                <strong>Ошибка сохранения:</strong> {saveError}
            </div>
        )}
       {renderContent()}
      </div>
    </div>
  );
};

export default FileEditor;