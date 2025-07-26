import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '../types';
import { api } from '../services/apiService';
import VideoPlayer from './VideoPlayer';

// --- Icons ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const AddFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const LoadingSpinner = () => <svg className="animate-spin h-12 w-12 text-soviet-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

interface FileInfo {
    url: string;
    type: string;
    blob: Blob;
    textContent?: string;
}

interface FilePreviewModalProps {
  file: NonNullable<Message['file']>;
  onClose: () => void;
  token: string;
  user: { username: string };
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, token }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    
    const [isAdding, setIsAdding] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const loadFile = async () => {
            setIsLoading(true);
            setError(null);
            setAddSuccess(false);
            setAddError(null);

            try {
                const blob = await api.getFileBlob(token, file.id);
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;
                
                let textContent: string | undefined;
                if (blob.type.startsWith('text/')) {
                    textContent = await blob.text();
                }

                setFileInfo({ url, type: blob.type, blob, textContent });
            } catch (err: any) {
                setError(err.message || 'Не удалось загрузить файл для предпросмотра.');
            } finally {
                setIsLoading(false);
            }
        };

        loadFile();

        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [file.id, token]);

    const handleAddToFile = async () => {
        setIsAdding(true);
        setAddError(null);
        setAddSuccess(false);
        try {
            await api.addSystemFileToUser(token, file.id);
            setAddSuccess(true);
        } catch (err: any) {
            setAddError(err.message || 'Не удалось добавить файл.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDownload = () => {
        if (!fileInfo) return;
        const a = document.createElement('a');
        a.href = fileInfo.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const renderPreview = () => {
        if (isLoading) {
            return <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner /><p className="mt-4">Загрузка файла...</p></div>;
        }
        if (error) {
            return <div className="text-center text-soviet-red p-4">{error}</div>;
        }
        if (!fileInfo) {
            return <div className="text-center text-gray-500 p-4">Нет данных для предпросмотра.</div>;
        }

        const { type, url, textContent } = fileInfo;
        const fakeUserFile = { id: file.id, name: file.name, contentType: type, url: url };

        if (type.startsWith('image/')) {
            return <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />;
        }
        if (type.startsWith('text/')) {
            return <textarea value={textContent} readOnly className="w-full h-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary resize-none outline-none p-4 box-border font-mono text-sm" />;
        }
        if (type.startsWith('video/')) {
            return <VideoPlayer activeFile={fakeUserFile} token={token} />;
        }
        if (type.startsWith('audio/')) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-primary dark:to-black">
                    <audio src={url} controls autoPlay className="w-full max-w-md">
                        Your browser does not support the audio element.
                    </audio>
                    <p className="mt-4 text-lg">Воспроизведение аудио</p>
                </div>
            );
        }
        if (type === 'application/pdf') {
            return <iframe src={url} title={file.name} className="w-full h-full border-none" />;
        }
        return <div className="text-center p-4">Предпросмотр для типа "{type}" не поддерживается.</div>;
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold truncate pr-4" title={file.name}>{file.name}</h2>
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <button onClick={handleAddToFile} disabled={isAdding || addSuccess} className={`flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 uppercase tracking-wider text-xs rounded-md transition-colors disabled:bg-gray-500`}>
                                {addSuccess ? <CheckIcon/> : <AddFileIcon/>}
                                <span>{isAdding ? 'Добавление...' : addSuccess ? 'Добавлено' : 'В мои файлы'}</span>
                            </button>
                            {addError && <p className="absolute top-full right-0 mt-1 text-xs text-soviet-red bg-light-secondary dark:bg-dark-secondary p-1 rounded-md shadow-lg">{addError}</p>}
                        </div>
                        <button onClick={handleDownload} disabled={!fileInfo} className="flex items-center bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider text-xs rounded-md transition-colors disabled:bg-gray-500">
                            <DownloadIcon/>
                            <span>Скачать</span>
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <CloseIcon/>
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-auto bg-light-primary dark:bg-dark-primary flex items-center justify-center">
                    {renderPreview()}
                </main>
            </div>
        </div>
    );
};

export default FilePreviewModal;